import { isoDateFromDateParts } from '../../../../../../../lib/validate/index.js'
import { documentUploadSessions } from '../../../../../../../services/cdp-uploader/index.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import {
  capacityExceededError,
  documentAddErrors,
  submittedFileError
} from '../form/errors.js'
import { documentFromPayload } from '../form/payload.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { FILE_TYPE_MESSAGE, attachmentTypeFor } from '../upload-config.js'

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

  // Capacity is judged here rather than before the upload: the file goes
  // straight to the upload service, so this is the page's first chance to
  // refuse one, and the trader keeps what they typed.
  if (pageState.documents.length >= MAX_DOCUMENTS) {
    request.logger.info(
      ids,
      'Returned upload refused: the notification is at its document capacity'
    )
    return { values, summaryErrors: capacityExceededError() }
  }

  // The page stores a document by its attachment type, resolved from the file's
  // extension, while the upload service judges the type the browser declared. A
  // file can satisfy the service and still leave this unresolved — one with no
  // extension at all — so an unresolved type is a refusal here, not a null saved
  // against the notification for a later reader to trip over.
  const filename = form.file?.filename
  const attachmentType = attachmentTypeFor(filename ?? '')
  const fileError =
    filename && !attachmentType
      ? { file: FILE_TYPE_MESSAGE }
      : submittedFileError(form.file)

  // Every fault at once, in the page's field order: a trader who got the file
  // and a field wrong is told both, not one and then the other.
  const errors = documentAddErrors(form, values, fileError)
  if (Object.keys(errors).length > 0) {
    request.logger.info(
      { ...ids, fields: Object.keys(errors) },
      'Returned upload refused by the page rules'
    )
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
