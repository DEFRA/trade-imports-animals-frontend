import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { MAX_DOCUMENTS } from '../../document-upload-config.js'
import { getAttempt, getDocumentsWithStatus } from '../page-model.js'
import {
  isRemoveAction,
  parseRemoveUploadId,
  extractFormFields,
  formatDateOfIssue,
  persistDocument
} from './payload.js'
import { collectValidationErrors } from './validation.js'
import { uploadDocument } from './upload.js'
import { removeDocument } from './remove.js'
import {
  capExceededView,
  validationErrorView,
  uploadFailureView
} from './views.js'

const handleUpload = async (request, h, traceId) => {
  const fields = extractFormFields(request.payload)
  const attempt = getAttempt(request)
  const documents = getSessionValue(request, sessionKeys.documents) ?? []
  const documentsWithStatus = await getDocumentsWithStatus(
    documents,
    traceId,
    request.logger
  )

  if (documents.length >= MAX_DOCUMENTS) {
    return capExceededView(h, documentsWithStatus)
  }

  const errors = collectValidationErrors(request.payload, fields.fileData)
  if (errors.allErrors.length > 0) {
    return validationErrorView(h, documentsWithStatus, attempt, fields, errors)
  }

  const dateOfIssue = formatDateOfIssue(fields)
  let uploadId
  try {
    uploadId = await uploadDocument(
      request,
      fields.fileData,
      {
        documentType: fields.documentType,
        documentReference: fields.documentReference,
        dateOfIssue
      },
      traceId
    )
  } catch (err) {
    request.logger.error(`Failed to upload document: ${err.message}`)
    return uploadFailureView(h, documentsWithStatus, attempt, fields)
  }

  persistDocument(request, documents, {
    uploadId,
    filename: fields.fileData.filename ?? 'upload',
    documentType: fields.documentType,
    documentReference: fields.documentReference,
    dateOfIssue
  })
  return h.redirect('/accompanying-documents')
}

export const postHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const action = request.payload._action

  if (isRemoveAction(action)) {
    return removeDocument(request, h, parseRemoveUploadId(action), traceId)
  }

  return handleUpload(request, h, traceId)
}
