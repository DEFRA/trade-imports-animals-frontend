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
import {
  addsAnotherDocument,
  documentFromPayload,
  startsADocument
} from '../form/payload.js'
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

const fileErrorOf = (form, attachmentType) =>
  form.file?.filename && !attachmentType
    ? fileTypeFieldError()
    : submittedFileError(form.file)

const takeOn = async (request, ids, form, upload) => {
  const entry = entryFrom(form, upload)
  const claimed = await callOrRefuse(request, ids, () =>
    documentUploads.claim({
      uploadId: upload.uploadId,
      documentType: entry.accompanyingDocumentType,
      documentReference: entry.accompanyingDocumentReference,
      dateOfIssue: isoDateFromDateParts(entry.accompanyingDocumentDateOfIssue)
    })
  )
  return claimed.takeOnFailed
    ? { ...claimed, values: documentFromPayload(form) }
    : { entry }
}

/**
 * Takes on the document a returning browser just uploaded, or reports why not.
 *
 * @param {object} request - the returning request, carrying the correlation handle
 * @param {string} correlationId - the handle the upload was opened under
 * @param {object} pageState - the loaded page state
 * @returns {Promise<object|null>} `{entry, saveChoice, addsAnother}` to add it;
 *   `{unclaimed, saveChoice, addsAnother}` for a form that started no document; `{values, errors}`
 *   for a refusal by the page's rules; `{values, summaryErrors}` when the notification is full;
 *   `{takeOnFailed, values}` when a service could not be reached; `null` for a handle this
 *   notification never opened.
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
  const saveChoice = kit.returnedSaveChoice(request, form, pageState.journey)
  const addsAnother = addsAnotherDocument(form)

  if (!startsADocument(form) && !addsAnother) {
    request.logger.info(
      { ...ids, saveChoice },
      'Returned upload left unclaimed: no document was started'
    )
    return { unclaimed: true, saveChoice, addsAnother }
  }

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
  const errors = documentAddErrors(
    form,
    values,
    fileErrorOf(form, attachmentType)
  )
  if (Object.keys(errors).length > 0) {
    return { values, errors }
  }

  const taken = await takeOn(request, ids, form, {
    uploadId: registered.uploadId,
    filename,
    attachmentType
  })
  if (taken.takeOnFailed) {
    return taken
  }
  request.logger.info({ ...ids, saveChoice }, 'Took on the returned upload')
  return { ...taken, saveChoice, addsAnother }
}
