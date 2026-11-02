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

const uploadLimits = (copy) => ({
  acceptAttribute: ACCEPT_ATTRIBUTE,
  allowedFileTypesHint: allowedFileTypesHint(copy),
  maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
  maxFileSize: MAX_FILE_SIZE_BYTES,
  maxDocuments: MAX_DOCUMENTS,
  oversizeFileMessage: oversizeMessage(copy)
})

export const render = async ({
  view,
  copy,
  sharedCopy,
  request,
  h,
  pageState: { journey, documents, scope, answers },
  values,
  options: { errors = {}, summaryErrors = [], extra = {} } = {}
}) => {
  const attempt = getAttempt(request)
  const anyPending = documents.some(
    (item) => item.scanStatus === SCAN_STATUS.PENDING
  )
  const uploadFormUnavailable = !extra.uploadPath
  const addForm = addFormState(copy, documents, uploadFormUnavailable)
  return h
    .view(view, {
      ...kit.base(copy.title, {
        request,
        backLink: await kit.runBackLink(
          request,
          page.id,
          { journey, scope, answers },
          { returnsToReview: true }
        ),
        journey,
        page,
        surface: 'display'
      }),
      ...extra,
      uploadFormUnavailable,
      recoverableErrorBody:
        extra.unsavedDocument &&
        unsavedDocumentBody(
          copy,
          sharedCopy.saveActions.saveAndContinue,
          extra.unsavedDocument
        ),
      ...addForm,
      saveButtonsUploadPath: saveButtonsUploadPath(
        extra,
        addForm.addFormClosed
      ),
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
    .header('Cache-Control', 'no-store')
}
