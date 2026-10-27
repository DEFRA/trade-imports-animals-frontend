import { hubPath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { MAX_POLL_ATTEMPTS, SCAN_STATUS } from '../scan-poll.js'
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  oversizeMessage,
  allowedFileTypesHint
} from '../upload-config.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { uploadUnavailableError } from '../form/errors.js'
import { documentsPage as page } from '../page.js'
import { rejectedErrors } from '../scan/summary-errors.js'
import { documentTypeItems } from './fragments/document-type.js'
import { scanCopyJson } from './fragments/status.js'
import { getAttempt, refreshHref } from './refresh.js'
import { documentRows } from './rows.js'

const unsavedDocumentBody = (copy, saveAction, { unchecked }) =>
  unchecked
    ? copy.errors.documentsUnchecked(saveAction)
    : copy.errors.documentNotSaved(saveAction)

/**
 * Whether the add form is open, and what to say when it is not. It is closed
 * either because no session could be opened or because the notification is
 * full — a full notification must not offer a control that uploads a file the
 * claim will then refuse.
 *
 * @param {object} copy - the page's copy deck
 * @param {Array} documents - the documents the notification holds
 * @param {boolean} uploadFormUnavailable - no session could be opened
 * @returns {object} the add form's state for the template
 */
const addFormState = (copy, documents, uploadFormUnavailable) => {
  const atCapacity = documents.length >= MAX_DOCUMENTS
  return {
    addFormClosed: uploadFormUnavailable || atCapacity,
    addFormClosedReason: atCapacity
      ? copy.errors.maxDocuments(MAX_DOCUMENTS)
      : copy.errors.uploadUnavailable
  }
}

const saveButtonsUploadPath = (extra, addFormClosed) =>
  addFormClosed ||
  extra.unsavedDocument?.correlationId ||
  extra.pendingDocumentRemoval
    ? undefined
    : extra.uploadPath

/**
 * The error summary, or none when nothing is wrong.
 *
 * @param {object} sharedCopy - the shared copy deck, for the summary's title
 * @param {Array} documents - the documents the notification holds
 * @param {object} state - what the page is refusing
 * @returns {object|null} the summary for the template
 */
const errorSummaryFor = (
  sharedCopy,
  documents,
  { errors, summaryErrors, uploadFormUnavailable }
) => {
  const errorList = [
    ...rejectedErrors(documents),
    ...summaryErrors,
    ...(kit.errorSummary(errors)?.errorList ?? []),
    ...(uploadFormUnavailable ? uploadUnavailableError() : [])
  ]
  return errorList.length
    ? { titleText: sharedCopy.errorSummary.title, errorList }
    : null
}

/** The limits the page states and the browser checks against. */
const uploadLimits = (copy) => ({
  acceptAttribute: ACCEPT_ATTRIBUTE,
  allowedFileTypesHint: allowedFileTypesHint(copy),
  maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
  maxFileSize: MAX_FILE_SIZE_BYTES,
  maxDocuments: MAX_DOCUMENTS,
  oversizeFileMessage: oversizeMessage(copy)
})

export const render = ({
  view,
  copy,
  sharedCopy,
  request,
  h,
  pageState: { journey, documents },
  values,
  options: { errors = {}, summaryErrors = [], extra = {} } = {}
}) => {
  const attempt = getAttempt(request)
  const anyPending = documents.some(
    (item) => item.scanStatus === SCAN_STATUS.PENDING
  )
  const uploadFormUnavailable = !extra.uploadPath
  const addForm = addFormState(copy, documents, uploadFormUnavailable)
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: hubPath(journey.journeyId),
      journey,
      page,
      surface: 'display'
    }),
    ...extra,
    // Written after the spread, so only a session that was opened can open the
    // add form.
    uploadFormUnavailable,
    recoverableErrorBody:
      extra.unsavedDocument &&
      unsavedDocumentBody(
        copy,
        sharedCopy.saveActions.saveAndContinue,
        extra.unsavedDocument
      ),
    ...addForm,
    saveButtonsUploadPath: saveButtonsUploadPath(extra, addForm.addFormClosed),
    copy,
    rows: documentRows(documents, journey.journeyId),
    additionalDocumentRows: copy.guidance.additional.rows.map((row) => [
      { text: row.consignment },
      { text: row.documents }
    ]),
    hasDocuments: documents.length > 0,
    values,
    errors,
    errorSummary: errorSummaryFor(sharedCopy, documents, {
      errors,
      summaryErrors,
      uploadFormUnavailable
    }),
    anyPending,
    timedOut: anyPending && attempt >= MAX_POLL_ATTEMPTS,
    refreshHref: refreshHref(request, attempt + 1, extra.uploadSession),
    ...uploadLimits(copy),
    scanCopyJson,
    documentTypeItems: documentTypeItems(),
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: copy.dateOfIssue.label,
      hint: copy.dateOfIssue.hint,
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors.accompanyingDocumentDateOfIssue
    })
  })
}
