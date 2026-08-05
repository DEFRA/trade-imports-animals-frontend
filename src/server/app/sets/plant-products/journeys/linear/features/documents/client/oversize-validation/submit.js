import { exceedsMaxFileSize } from '../../upload-config.js'
import { getOrCreateSummary } from './error-summary.js'
import { renderFieldError } from './field-error.js'
import { ARIA_DESCRIBEDBY, CLIENT_ERROR_MARKER } from './markers.js'

const clientErrorSelector = (suffix) =>
  `[data-client-error="${CLIENT_ERROR_MARKER}-${suffix}"]`

const restoreInputState = (input) => {
  input.classList.remove('govuk-file-upload--error')
  const previous = input.dataset.clientErrorPrevDescribedby ?? ''
  if (previous) {
    input.setAttribute(ARIA_DESCRIBEDBY, previous)
  } else {
    input.removeAttribute(ARIA_DESCRIBEDBY)
  }
  delete input.dataset.clientError
  delete input.dataset.clientErrorPrevDescribedby
}

const clearGroupError = (group) => {
  group.classList.remove('govuk-form-group--error')
  delete group.dataset.clientError
}

// Only client-marked elements are cleared, so a server-rendered error already
// on the page survives untouched and nothing accumulates across resubmits.
const clearPreviousClientErrors = (form) => {
  document
    .querySelectorAll(clientErrorSelector('summary'))
    .forEach((summary) => summary.remove())
  form
    .querySelectorAll(clientErrorSelector('message'))
    .forEach((message) => message.remove())
  form.querySelectorAll(clientErrorSelector('group')).forEach(clearGroupError)
  form.querySelectorAll(clientErrorSelector('input')).forEach(restoreInputState)
}

const focusSummaryTitle = (summary) => {
  const title = summary.querySelector('.govuk-error-summary__title')
  if (title) {
    title.tabIndex = -1
    title.focus()
  }
}

// The file stays optional and the server stays authoritative: an absent file,
// an empty one and an at-limit one all submit normally. Only a file measurably
// over the server's own limit is worth refusing before the bytes travel.
const onUploadSubmit = (form, container, maxFileSize) => (event) => {
  clearPreviousClientErrors(form)
  const fileInput = form.querySelector('input[type="file"]')
  const file = fileInput?.files?.[0]
  if (!file || !exceedsMaxFileSize(file.size, maxFileSize)) {
    return
  }
  event.preventDefault()
  const message = form.dataset.oversizeError
  const summary = getOrCreateSummary(container, message, fileInput.id)
  renderFieldError(fileInput, message, container.dataset.errorPrefix)
  focusSummaryTitle(summary)
}

export const initUploadForm = () => {
  const form = document.querySelector('form[data-max-file-size]')
  const container = document.getElementById('js-error-summary-container')
  if (!form || !container || !form.dataset.oversizeError) {
    return
  }
  const maxFileSize = Number.parseInt(form.dataset.maxFileSize, 10)
  if (!Number.isFinite(maxFileSize) || maxFileSize <= 0) {
    return
  }
  form.addEventListener('submit', onUploadSubmit(form, container, maxFileSize))
}
