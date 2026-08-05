import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { documentTypeOptions } from '../../../../../services/reference/document-types.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { MAX_POLL_ATTEMPTS, SCAN_STATUS, isSettled } from '../scan-poll.js'
import { rejectedErrors } from '../scan/summary-errors.js'
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_LABEL
} from '../upload-config.js'
import { refreshHref } from './refresh.js'
import { documentRows } from './rows.js'

const copy = copyFor({ en, cy })

const selectItems = (selected) => [
  { value: '', text: copy.placeholderOption, selected: selected === '' },
  ...documentTypeOptions.map((option) => ({
    ...option,
    selected: option.value === selected
  })),
  ...(selected && !documentTypeOptions.some(({ value }) => value === selected)
    ? [{ value: selected, text: selected, selected: true, disabled: true }]
    : [])
]

const combinedErrorList = (documents, summaryErrors, errors) => [
  ...rejectedErrors(documents),
  ...summaryErrors,
  ...(kit.errorSummary(errors)?.errorList ?? [])
]

export const render = (
  view,
  request,
  h,
  { journey, documents, attempt = 0 },
  values,
  {
    errors = {},
    summaryErrors = [],
    recoverableError = false,
    pendingUpload = null,
    crumb
  } = {}
) => {
  const base = kit.base(copy.pageTitle, {
    backLink: kit.withChangeContext(request, hubPath(journey.journeyId)),
    journey,
    recoverableError
  })
  const errorList = combinedErrorList(documents, summaryErrors, errors)
  const anyChecking = documents.some(
    (item) => item.scanStatus === SCAN_STATUS.PENDING
  )
  const canRefresh = documents.some((item) => !isSettled(item.scanStatus))
  return h.view(view, {
    ...base,
    ...(crumb ? { crumb } : {}),
    hubHref: kit.withChangeContext(request, base.hubHref),
    copy,
    pendingUpload,
    values,
    errors,
    errorSummary: errorList.length
      ? { titleText: base.sharedCopy.errorSummary.title, errorList }
      : null,
    documentTypeItems: selectItems(values.documentType),
    issueDate: kit.dateField('issueDate', {
      label: copy.labels.issueDate,
      hint: copy.hints.issueDate,
      value: values.issueDate,
      error: errors.issueDate
    }),
    rows: documentRows(documents),
    canRefresh,
    timedOut: anyChecking && attempt >= MAX_POLL_ATTEMPTS,
    refreshHref: refreshHref(request, attempt + 1),
    acceptAttribute: ACCEPT_ATTRIBUTE,
    fileHint: copy.hints.file(ALLOWED_FILE_TYPES_HINT, MAX_FILE_SIZE_LABEL)
  })
}
