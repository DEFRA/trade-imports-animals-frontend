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
import { attachmentTypeFor } from '../upload-config.js'

/**
 * What the trader submitted to cdp-uploader, read back so the page can judge it by its own
 * rules. cdp-uploader keeps the text fields alongside the file and serves them while the scan
 * is still running, so the document can be taken on the moment the browser returns.
 */
const submittedForm = async (uploadId) => {
  const { form } = await documentUploadSessions.read(uploadId)
  return form ?? {}
}

const entryFrom = (form, file) => ({
  ...documentFromPayload(form),
  accompanyingDocumentAttachmentType: attachmentTypeFor(file.filename ?? ''),
  uploadId: file.uploadId,
  filename: file.filename
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
 * @returns {Promise<{values?: object, errors?: object, summaryErrors?: object[], takeOnFailed?: boolean}|{entry: object}|null>} what to do next
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

  // Every fault at once, in the page's field order: a trader who got the file
  // and a field wrong is told both, not one and then the other.
  const errors = documentAddErrors(form, values, submittedFileError(form.file))
  if (Object.keys(errors).length > 0) {
    request.logger.info(
      { ...ids, fields: Object.keys(errors) },
      'Returned upload refused by the page rules'
    )
    return { values, errors }
  }

  const entry = entryFrom(form, {
    uploadId: registered.uploadId,
    filename: form.file?.filename
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
  return { entry }
}
