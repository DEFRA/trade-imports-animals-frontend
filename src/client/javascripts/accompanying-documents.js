import { ErrorSummary } from 'govuk-frontend'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL = 3000
const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_COMPLETE = 'COMPLETE'
const SCAN_STATUS_REJECTED = 'REJECTED'

const CLIENT_ERROR_MARKER = 'file-size'

const getPendingRows = () =>
  Array.from(
    document.querySelectorAll(
      `[data-upload-id][data-scan-status="${SCAN_STATUS_PENDING}"]`
    )
  )

const announceStatus = (message) => {
  const liveRegion = document.getElementById('js-scan-status-announcer')
  if (liveRegion) {
    liveRegion.textContent = message
  }
}

const updateRow = (row, scanStatus) => {
  row.dataset.scanStatus = scanStatus
  const tag = row.querySelector('.govuk-tag')
  if (!tag) {
    return
  }

  if (scanStatus === SCAN_STATUS_COMPLETE) {
    tag.textContent = 'Safe'
    tag.className = 'govuk-tag govuk-tag--green'
    announceStatus('Document scan complete: safe to use')
  } else if (scanStatus === SCAN_STATUS_REJECTED) {
    tag.textContent = 'Virus found'
    tag.className = 'govuk-tag govuk-tag--red'
    announceStatus(
      'Document scan failed: virus found. Remove the file and try again.'
    )
  } else {
    tag.textContent = 'Unknown'
    tag.className = 'govuk-tag govuk-tag--grey'
  }
}

const fetchStatuses = async () => {
  const response = await fetch('/accompanying-documents/status', {
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) {
    return null
  }
  const { documents } = await response.json()
  return documents ?? null
}

const showTimedOutHint = () => {
  // Show the timed-out hint that the server-rendered template already includes
  const timedOutHint = document.getElementById('js-timeout-message')
  if (timedOutHint) {
    timedOutHint.hidden = false
  }
}

const applyStatusUpdates = (documents) => {
  documents.forEach((doc) => {
    const row = document.querySelector(`[data-upload-id="${doc.uploadId}"]`)
    if (row && row.dataset.scanStatus !== doc.scanStatus) {
      updateRow(row, doc.scanStatus)
    }
  })
}

const isStillPending = (documents) =>
  documents.some((doc) => doc.scanStatus === SCAN_STATUS_PENDING)

const pollStatus = async (attempt = 0) => {
  if (attempt >= MAX_ATTEMPTS) {
    showTimedOutHint()
    return
  }

  const retry = () => setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)

  let documents
  try {
    documents = await fetchStatuses()
  } catch {
    retry()
    return
  }
  if (!documents) {
    retry()
    return
  }

  applyStatusUpdates(documents)

  if (isStillPending(documents)) {
    retry()
  } else {
    // Reload to get correct Save and continue state and any virus error messages
    globalThis.location.reload()
  }
}

// querySelectorAll uses the kebab-case attribute selector; the dataset
// reads/writes below are the camelCase equivalent on the same data-* slot.
const clientErrorSelector = (suffix) =>
  `[data-client-error="${CLIENT_ERROR_MARKER}-${suffix}"]`

const clearPreviousClientErrors = (form) => {
  document
    .querySelectorAll(clientErrorSelector('summary'))
    .forEach((summary) => summary.remove())
  form
    .querySelectorAll(clientErrorSelector('message'))
    .forEach((message) => message.remove())
  form.querySelectorAll(clientErrorSelector('group')).forEach((group) => {
    group.classList.remove('govuk-form-group--error')
    delete group.dataset.clientError
  })
  form.querySelectorAll(clientErrorSelector('input')).forEach((input) => {
    input.classList.remove('govuk-file-upload--error')
    const previous = input.dataset.clientErrorPrevDescribedby ?? ''
    if (previous) {
      input.setAttribute('aria-describedby', previous)
    } else {
      input.removeAttribute('aria-describedby')
    }
    delete input.dataset.clientError
    delete input.dataset.clientErrorPrevDescribedby
  })
}

const buildErrorSummaryItem = (message, targetId) => {
  const item = document.createElement('li')
  const link = document.createElement('a')
  link.href = `#${targetId}`
  link.textContent = message
  item.appendChild(link)
  return item
}

// GDS requires a single error summary at the top of the page — a
// server-rendered one (for example virus-rejected documents) may already
// be present, so append the client item to its list instead of
// inserting a second summary.
const appendToExistingSummary = (summary, message, targetId) => {
  const list = summary.querySelector('.govuk-error-summary__list')
  if (!list) {
    return false
  }
  const item = buildErrorSummaryItem(message, targetId)
  item.dataset.clientError = `${CLIENT_ERROR_MARKER}-summary`
  list.appendChild(item)
  return true
}

const buildErrorSummary = (message, targetId) => {
  const summary = document.createElement('div')
  summary.className = 'govuk-error-summary'
  summary.dataset.module = 'govuk-error-summary'
  summary.dataset.clientError = `${CLIENT_ERROR_MARKER}-summary`

  const alert = document.createElement('div')
  alert.setAttribute('role', 'alert')

  const title = document.createElement('h2')
  title.className = 'govuk-error-summary__title'
  title.tabIndex = -1
  title.textContent = 'There is a problem'

  const body = document.createElement('div')
  body.className = 'govuk-error-summary__body'

  const list = document.createElement('ul')
  list.className = 'govuk-list govuk-error-summary__list'
  list.appendChild(buildErrorSummaryItem(message, targetId))

  body.appendChild(list)
  alert.appendChild(title)
  alert.appendChild(body)
  summary.appendChild(alert)
  return summary
}

// createAll(ErrorSummary) in application.js ran at page load, so a summary
// inserted after that is never initialised. Instantiate it directly so the
// summary link focuses the file input and scrolls its label into view.
// Auto-focus stays disabled — the title focus in onUploadSubmit handles the
// announcement for both the inserted and appended-to paths.
const initialiseErrorSummary = (summary) => {
  try {
    return new ErrorSummary(summary, { disableAutoFocus: true })
  } catch {
    // Unsupported browser (no `govuk-frontend-supported` class on <body>):
    // the summary link falls back to default fragment navigation.
    return null
  }
}

const renderFieldError = (input, message) => {
  const group = input.closest('.govuk-form-group')
  if (!group) {
    return
  }
  group.classList.add('govuk-form-group--error')
  group.dataset.clientError = `${CLIENT_ERROR_MARKER}-group`
  // Remove any server-rendered error block sharing this id so the
  // client message owns it cleanly and aria-describedby stays unambiguous.
  const existingError = group.querySelector(`#${input.id}-error`)
  if (existingError) {
    existingError.remove()
  }
  const errorMessage = document.createElement('p')
  errorMessage.id = `${input.id}-error`
  errorMessage.className = 'govuk-error-message'
  errorMessage.dataset.clientError = `${CLIENT_ERROR_MARKER}-message`
  const visuallyHidden = document.createElement('span')
  visuallyHidden.className = 'govuk-visually-hidden'
  visuallyHidden.textContent = 'Error:'
  errorMessage.appendChild(visuallyHidden)
  errorMessage.appendChild(document.createTextNode(` ${message}`))
  input.parentNode.insertBefore(errorMessage, input)
  // Strip the error id token: any server-rendered error element with the
  // same id was removed above, so keeping its token would duplicate the
  // join below and leave a dangling idref after the client error clears.
  const previousDescribedby = (input.getAttribute('aria-describedby') ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== errorMessage.id)
    .join(' ')
  input.dataset.clientErrorPrevDescribedby = previousDescribedby
  input.dataset.clientError = `${CLIENT_ERROR_MARKER}-input`
  input.setAttribute(
    'aria-describedby',
    [previousDescribedby, errorMessage.id].filter(Boolean).join(' ')
  )
  input.classList.add('govuk-file-upload--error')
}

const onUploadSubmit = (form, maxFileSize, oversizeMessage) => (event) => {
  clearPreviousClientErrors(form)
  const fileInput = form.querySelector('input[type="file"]')
  const file = fileInput?.files?.[0]
  if (!file || file.size <= maxFileSize) {
    return
  }
  event.preventDefault()
  let summary = document.querySelector('.govuk-error-summary')
  if (
    !summary ||
    !appendToExistingSummary(summary, oversizeMessage, fileInput.id)
  ) {
    summary = buildErrorSummary(oversizeMessage, fileInput.id)
    form.parentNode.insertBefore(summary, form)
    initialiseErrorSummary(summary)
  }
  renderFieldError(fileInput, oversizeMessage)
  const title = summary.querySelector('.govuk-error-summary__title')
  if (title) {
    // Server-rendered titles are not focusable by default
    title.tabIndex = -1
    title.focus()
  }
}

const initUploadForm = () => {
  const form = document.querySelector('form[data-max-file-size]')
  if (!form) {
    return
  }
  const maxFileSize = Number.parseInt(form.dataset.maxFileSize, 10)
  if (!Number.isFinite(maxFileSize) || maxFileSize <= 0) {
    return
  }
  const oversizeMessage = form.dataset.oversizeError
  if (!oversizeMessage) {
    return
  }
  form.addEventListener(
    'submit',
    onUploadSubmit(form, maxFileSize, oversizeMessage)
  )
}

// Hide the non-JS refresh fallback
const fallback = document.getElementById('js-refresh-fallback')
if (fallback) {
  fallback.hidden = true
}

// Start polling if any docs are still being scanned
if (getPendingRows().length > 0) {
  setTimeout(() => pollStatus(0), POLL_INTERVAL)
}

initUploadForm()
