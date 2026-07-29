// EUDPA-106 (Option 3-with-callbacks) DEAD MODULE — kept for the follow-up
// implementation ticket to remove alongside the byte-proxy teardown (AC4).
// This is the handler for `POST /accompanying-documents` — the browser used
// to submit the form here, the handler called `documentClient.initiate` +
// `documentClient.uploadFile` (backend byte-proxy path), and persisted the
// resulting doc to yar. Under Option 3, the form action was rewired in
// step 4 to `/upload-and-scan/<uploadId>` (direct to cdp-uploader via the
// nginx sidecar bypass) and the backend record is created by cdp-uploader's
// scan-result callback. Nothing routes to this handler; nothing writes to
// yar['documents']. See findings.md "Deferred cleanup" for the full removal
// list (payload.js / upload.js / validation.js / views.js all die with this
// handler).
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
  persistDocument,
  buildUploadDetails,
  buildSessionDocument
} from './payload.js'
import { collectValidationErrors } from './validation.js'
import { uploadDocument } from './upload.js'
import { removeDocument } from './remove.js'
import {
  capExceededView,
  validationErrorView,
  uploadFailureView
} from './views.js'

const loadUploadState = async (request, traceId) => {
  const fields = extractFormFields(request.payload)
  const attempt = getAttempt(request)
  const documents = getSessionValue(request, sessionKeys.documents) ?? []
  const documentsWithStatus = await getDocumentsWithStatus(
    documents,
    traceId,
    request.logger
  )
  return { fields, attempt, documents, documentsWithStatus }
}

const uploadAndPersist = async (request, h, state, traceId) => {
  const { fields, attempt, documents, documentsWithStatus } = state
  const dateOfIssue = formatDateOfIssue(fields)

  try {
    const uploadId = await uploadDocument(
      request,
      fields.fileData,
      buildUploadDetails(fields, dateOfIssue),
      traceId
    )
    persistDocument(
      request,
      documents,
      buildSessionDocument(uploadId, fields, dateOfIssue)
    )
    return h.redirect('/accompanying-documents')
  } catch (err) {
    request.logger.error(`Failed to upload document: ${err.message}`)
    return uploadFailureView(h, documentsWithStatus, attempt, fields)
  }
}

const handleUpload = async (request, h, traceId) => {
  const state = await loadUploadState(request, traceId)

  if (state.documents.length >= MAX_DOCUMENTS) {
    return capExceededView(h, state.documentsWithStatus)
  }

  const errors = collectValidationErrors(request.payload, state.fields.fileData)
  if (errors.allErrors.length > 0) {
    return validationErrorView(
      h,
      state.documentsWithStatus,
      state.attempt,
      state.fields,
      errors
    )
  }

  return uploadAndPersist(request, h, state, traceId)
}

export const postHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const action = request.payload._action

  if (isRemoveAction(action)) {
    return removeDocument(request, h, parseRemoveUploadId(action), traceId)
  }

  return handleUpload(request, h, traceId)
}
