import { ErrorSummary } from 'govuk-frontend'

const MAX_ATTEMPTS = 10
const POLL_INTERVAL = 3000
const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_COMPLETE = 'COMPLETE'
const SCAN_STATUS_REJECTED = 'REJECTED'

const CLIENT_ERROR_MARKER = 'file-size'

const ARIA_DESCRIBEDBY = 'aria-describedby'

const createEl = (
  tag,
  { className, text, attrs = {}, dataset, children = [] } = {}
) => {
  const el = document.createElement(tag)
  if (className) {
    el.className = className
  }
  if (text != null) {
    el.textContent = text
  }
  if (dataset) {
    Object.assign(el.dataset, dataset)
  }
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }
  children.forEach((child) => el.appendChild(child))
  return el
}

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

const buildErrorSummaryItem = (message, targetId) =>
  createEl('li', {
    children: [
      createEl('a', { attrs: { href: `#${targetId}` }, text: message })
    ]
  })

const appendSummaryItem = (list, message, targetId) => {
  const item = buildErrorSummaryItem(message, targetId)
  item.dataset.clientError = `${CLIENT_ERROR_MARKER}-summary`
  list.appendChild(item)
}

const buildErrorSummary = (message, targetId) => {
  const list = createEl('ul', {
    className: 'govuk-list govuk-error-summary__list',
    children: [buildErrorSummaryItem(message, targetId)]
  })
  const title = createEl('h2', {
    className: 'govuk-error-summary__title',
    text: 'There is a problem'
  })
  title.tabIndex = -1
  const alert = createEl('div', {
    attrs: { role: 'alert' },
    children: [
      title,
      createEl('div', {
        className: 'govuk-error-summary__body',
        children: [list]
      })
    ]
  })
  return createEl('div', {
    className: 'govuk-error-summary',
    dataset: {
      module: 'govuk-error-summary',
      clientError: `${CLIENT_ERROR_MARKER}-summary`
    },
    children: [alert]
  })
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

// GDS requires a single error summary at the top of the page — a
// server-rendered one (for example virus-rejected documents) may already
// be present, so append the client item to its list instead of inserting a
// second summary. Returns the summary element either way.
const getOrCreateSummary = (form, message, targetId) => {
  const existingList = document.querySelector(
    '.govuk-error-summary .govuk-error-summary__list'
  )
  if (existingList) {
    appendSummaryItem(existingList, message, targetId)
    return existingList.closest('.govuk-error-summary')
  }
  const summary = buildErrorSummary(message, targetId)
  form.parentNode.insertBefore(summary, form)
  initialiseErrorSummary(summary)
  return summary
}

const buildErrorMessageEl = (id, message) => {
  const errorMessage = createEl('p', {
    attrs: { id },
    className: 'govuk-error-message',
    dataset: { clientError: `${CLIENT_ERROR_MARKER}-message` },
    children: [
      createEl('span', { className: 'govuk-visually-hidden', text: 'Error:' })
    ]
  })
  errorMessage.appendChild(document.createTextNode(` ${message}`))
  return errorMessage
}

const applyInputErrorState = (input, errorId) => {
  // Strip the error id token: any server-rendered error element with the
  // same id was removed above, so keeping its token would duplicate the
  // join below and leave a dangling idref after the client error clears.
  const previousDescribedby = (input.getAttribute(ARIA_DESCRIBEDBY) ?? '')
    .split(/\s+/)
    .filter((token) => token && token !== errorId)
    .join(' ')
  input.dataset.clientErrorPrevDescribedby = previousDescribedby
  input.dataset.clientError = `${CLIENT_ERROR_MARKER}-input`
  input.setAttribute(
    ARIA_DESCRIBEDBY,
    [previousDescribedby, errorId].filter(Boolean).join(' ')
  )
  input.classList.add('govuk-file-upload--error')
}

const renderFieldError = (input, message) => {
  const group = input.closest('.govuk-form-group')
  if (!group) {
    return
  }
  group.classList.add('govuk-form-group--error')
  group.dataset.clientError = `${CLIENT_ERROR_MARKER}-group`
  // Remove any server-rendered error block sharing this id so the client
  // message owns it cleanly and aria-describedby stays unambiguous.
  group.querySelector(`#${input.id}-error`)?.remove()
  const errorMessage = buildErrorMessageEl(`${input.id}-error`, message)
  input.parentNode.insertBefore(errorMessage, input)
  applyInputErrorState(input, errorMessage.id)
}

const focusSummaryTitle = (summary) => {
  const title = summary.querySelector('.govuk-error-summary__title')
  if (title) {
    // Server-rendered titles are not focusable by default
    title.tabIndex = -1
    title.focus()
  }
}

const onUploadSubmit = (form, maxFileSize, oversizeMessage) => (event) => {
  clearPreviousClientErrors(form)
  const fileInput = form.querySelector('input[type="file"]')
  const file = fileInput?.files?.[0]
  if (!file || file.size <= maxFileSize) {
    return
  }
  event.preventDefault()
  const summary = getOrCreateSummary(form, oversizeMessage, fileInput.id)
  renderFieldError(fileInput, oversizeMessage)
  focusSummaryTitle(summary)
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
