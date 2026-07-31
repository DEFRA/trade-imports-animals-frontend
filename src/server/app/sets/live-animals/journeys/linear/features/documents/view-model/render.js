import { hubPath } from '../../../../../../../config.js'
import * as kit from '../../../../../../../shared/kit.js'
import { MAX_POLL_ATTEMPTS, SCAN_STATUS } from '../scan-poll.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  OVERSIZE_FILE_MESSAGE
} from '../upload-config.js'
import { rejectedErrors } from '../scan/summary-errors.js'
import { scanCopyJson } from './fragments/status.js'
import { getAttempt, refreshHref } from './refresh.js'
import { documentRows } from './rows.js'

export const render = (
  view,
  copy,
  sharedCopy,
  request,
  h,
  { journey, documents },
  values,
  { errors = {}, summaryErrors = [], extra = {} } = {}
) => {
  const attempt = getAttempt(request)
  const anyPending = documents.some(
    (item) => item.scanStatus === SCAN_STATUS.PENDING
  )
  const errorList = [
    ...rejectedErrors(documents),
    ...summaryErrors,
    ...(kit.errorSummary(errors)?.errorList ?? [])
  ]
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey
    }),
    ...extra,
    copy,
    rows: documentRows(documents, journey.journeyId),
    hasDocuments: documents.length > 0,
    values,
    errors,
    errorSummary: errorList.length
      ? { titleText: sharedCopy.errorSummary.title, errorList }
      : null,
    anyPending,
    timedOut: anyPending && attempt >= MAX_POLL_ATTEMPTS,
    refreshHref: refreshHref(request, attempt + 1),
    acceptAttribute: ACCEPT_ATTRIBUTE,
    allowedFileTypesHint: ALLOWED_FILE_TYPES_HINT,
    maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    oversizeFileMessage: OVERSIZE_FILE_MESSAGE,
    scanCopyJson,
    dateOfIssue: kit.dateField('accompanyingDocumentDateOfIssue', {
      label: copy.dateOfIssue.label,
      hint: copy.dateOfIssue.hint,
      value: values.accompanyingDocumentDateOfIssue ?? {},
      error: errors.accompanyingDocumentDateOfIssue
    })
  })
}
