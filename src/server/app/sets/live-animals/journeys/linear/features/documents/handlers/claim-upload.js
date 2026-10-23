import { isoDateFromDateParts } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentUploadSessions } from '../../../../../../../services/cdp-uploader/index.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import {
  capacityExceededError,
  documentAddErrors,
  fileTypeFieldError,
  submittedFileError
} from '../form/errors.js'
import { documentFromPayload } from '../form/payload.js'
import { atDocumentCapacity } from '../contracts/max-documents.js'
import { attachmentTypeFor } from '../upload-config.js'

const submittedForm = async (uploadId) => {
  const { form } = await documentUploadSessions.read(uploadId)
  return form ?? {}
}

const entryFrom = (form, upload) => ({
  ...documentFromPayload(form),
  accompanyingDocumentAttachmentType: upload.attachmentType,
  uploadId: upload.uploadId,
  filename: upload.filename
})

const callOrRefuse = async (request, ids, call) => {
  try {
    return { value: await call() }
  } catch (err) {
    request.logger.error(
      { err, status: err.status, ...ids },
      'Could not take on the returned upload'
    )
    return { takeOnFailed: true }
  }
}

/**
 * Takes on the document a returning browser just uploaded.
 *
 * Refusals add nothing and keep the trader's answers on the form: a file cdp-uploader would not
 * take, and a submission that breaks one of the page's own rules. The uploaded file is simply
 * never claimed. A service that cannot be reached refuses the same way, as `takeOnFailed`, so the
 * page is re-rendered for the trader to try again rather than the request ending in an error page.
 *
 * @param {object} request - the returning request, carrying the correlation handle
 * @param {string} correlationId - the handle the upload was opened under
 * @param {object} pageState - the loaded page state
 * @returns {Promise<object|null>} `{entry}` to add it; `{values, errors}` for a refusal by the
 *   page's rules; `{values, summaryErrors}` when the notification is full; `{takeOnFailed, values}`
 *   when a service could not be reached; `null` for a handle this notification never opened
 */
export const claimUpload = async (request, correlationId, pageState) => {
  const journeyId = pageState.journey.journeyId
  const lookup = await callOrRefuse(
    request,
    { journeyId, uploadId: null, correlationId },
    () => documentUploads.findByCorrelationId({ journeyId, correlationId })
  )
  if (lookup.takeOnFailed) {
    return lookup
  }
  const registered = lookup.value
  if (!registered) {
    request.logger.info(
      { journeyId, correlationId },
      'Returned upload is not registered against this notification'
    )
    return null
  }

  const ids = { journeyId, uploadId: registered.uploadId, correlationId }
  const session = await callOrRefuse(request, ids, () =>
    submittedForm(registered.uploadId)
  )
  if (session.takeOnFailed) {
    return session
  }
  const form = session.value
  const values = documentFromPayload(form)

  if (atDocumentCapacity(pageState.documents)) {
    request.logger.info(
      ids,
      'Returned upload refused: the notification is at its document capacity'
    )
    return { values, summaryErrors: capacityExceededError() }
  }

  const filename = form.file?.filename
  const attachmentType = attachmentTypeFor(filename ?? '')
  const fileError =
    filename && !attachmentType
      ? fileTypeFieldError()
      : submittedFileError(form.file)

  const errors = documentAddErrors(form, values, fileError)
  if (Object.keys(errors).length > 0) {
    kit.logRefusal(request, {
      ...ids,
      fieldErrors: errors,
      reason: 'returned-upload-breaks-the-page-rules'
    })
    return { values, errors }
  }

  const entry = entryFrom(form, {
    uploadId: registered.uploadId,
    filename,
    attachmentType
  })
  const claimed = await callOrRefuse(request, ids, () =>
    documentUploads.claim({
      uploadId: registered.uploadId,
      documentType: entry.accompanyingDocumentType,
      documentReference: entry.accompanyingDocumentReference,
      dateOfIssue: isoDateFromDateParts(entry.accompanyingDocumentDateOfIssue)
    })
  )
  if (claimed.takeOnFailed) {
    return { ...claimed, values }
  }
  request.logger.info(ids, 'Took on the returned upload')
  return { entry }
}
