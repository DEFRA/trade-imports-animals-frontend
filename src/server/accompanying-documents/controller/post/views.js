import { getTraceId } from '@defra/hapi-tracing'

import { statusCodes } from '../../../common/constants/status-codes.js'
import { formatValidationErrors } from '../../../common/helpers/validation-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import {
  MAX_DOCUMENTS,
  OVERSIZE_FILE_MESSAGE
} from '../../document-upload-config.js'
import { buildPageModel, getDocumentsWithStatus } from '../page-model.js'

const VIEW_PATH = 'accompanying-documents/index'

const fieldsForReplay = ({
  documentType,
  documentReference,
  issueDateDay,
  issueDateMonth,
  issueDateYear
}) => ({
  documentType,
  documentReference,
  issueDate_day: issueDateDay,
  issueDate_month: issueDateMonth,
  issueDate_year: issueDateYear
})

export const capExceededView = (h, documentsWithStatus) =>
  h
    .view(
      VIEW_PATH,
      buildPageModel(documentsWithStatus, 0, {
        errorList: [
          {
            href: '#documentType',
            text: `You can add a maximum of ${MAX_DOCUMENTS} documents`
          }
        ]
      })
    )
    .code(statusCodes.badRequest)

export const validationErrorView = (
  h,
  documentsWithStatus,
  attempt,
  fields,
  { schemaErrors, dateErrors, fileErrors, allErrors }
) => {
  // Error summary: one entry per date group — only first date error links to the date input.
  // Field errors: all date errors, so each individual input can be highlighted correctly.
  const summaryErrors = [
    ...schemaErrors,
    ...dateErrors.slice(0, 1),
    ...fileErrors
  ]
  const { errorList } = formatValidationErrors({ details: summaryErrors })
  const { fieldErrors } = formatValidationErrors({ details: allErrors })

  return h
    .view(
      VIEW_PATH,
      buildPageModel(documentsWithStatus, attempt, {
        ...fieldsForReplay(fields),
        crumb: fields.crumb,
        errorList,
        fieldErrors
      })
    )
    .code(statusCodes.badRequest)
}

// Hapi short-circuits an over-size multipart POST with Boom 413 before the
// handler runs, so the controller's `loadUploadState` never executes — we
// re-fetch the session documents here to keep the rendered list intact.
export const oversizeFileView = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const documents = getSessionValue(request, sessionKeys.documents) ?? []
  const documentsWithStatus = await getDocumentsWithStatus(
    documents,
    traceId,
    request.logger
  )

  return h
    .view(
      VIEW_PATH,
      buildPageModel(documentsWithStatus, 0, {
        errorList: [{ href: '#file', text: OVERSIZE_FILE_MESSAGE }],
        fieldErrors: { file: { text: OVERSIZE_FILE_MESSAGE } }
      })
    )
    .code(statusCodes.badRequest)
}

export const uploadFailureView = (h, documentsWithStatus, attempt, fields) =>
  h
    .view(
      VIEW_PATH,
      buildPageModel(documentsWithStatus, attempt, {
        ...fieldsForReplay(fields),
        errorList: [
          {
            href: '#file',
            text: 'The file could not be uploaded. Try again.'
          }
        ]
      })
    )
    .code(statusCodes.internalServerError)
