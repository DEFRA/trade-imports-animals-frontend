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
  document.querySelectorAll(clientErrorSelector('summary')).forEach((el) => {
    el.remove()
  })
  form.querySelectorAll(clientErrorSelector('message')).forEach((el) => {
    el.remove()
  })
  form.querySelectorAll(clientErrorSelector('group')).forEach((group) => {
    group.classList.remove('govuk-form-group--error')
    delete group.dataset.clientError
  })
}

const buildErrorSummary = (message, targetId) => {
  const summary = document.createElement('div')
  summary.className = 'govuk-error-summary'
  summary.dataset.module = 'govuk-error-summary'
  summary.dataset.clientError = `${CLIENT_ERROR_MARKER}-summary`
  const link = `<li><a href="#${targetId}">${message}</a></li>`
  summary.innerHTML =
    '<div role="alert">' +
    '<h2 class="govuk-error-summary__title" tabindex="-1">There is a problem</h2>' +
    '<div class="govuk-error-summary__body">' +
    `<ul class="govuk-list govuk-error-summary__list">${link}</ul>` +
    '</div></div>'
  return summary
}

const renderFieldError = (input, message) => {
  const group = input.closest('.govuk-form-group')
  if (!group) {
    return
  }
  group.classList.add('govuk-form-group--error')
  group.dataset.clientError = `${CLIENT_ERROR_MARKER}-group`
  const errorMessage = document.createElement('p')
  errorMessage.id = `${input.id}-error`
  errorMessage.className = 'govuk-error-message'
  errorMessage.dataset.clientError = `${CLIENT_ERROR_MARKER}-message`
  errorMessage.innerHTML = `<span class="govuk-visually-hidden">Error:</span> ${message}`
  input.parentNode.insertBefore(errorMessage, input)
}

const onUploadSubmit = (form, maxFileSize, oversizeMessage) => (event) => {
  clearPreviousClientErrors(form)
  const fileInput = form.querySelector('input[type="file"]')
  const file = fileInput?.files?.[0]
  if (!file || file.size <= maxFileSize) {
    return
  }
  event.preventDefault()
  const summary = buildErrorSummary(oversizeMessage, fileInput.id)
  form.parentNode.insertBefore(summary, form)
  renderFieldError(fileInput, oversizeMessage)
  summary.querySelector('.govuk-error-summary__title')?.focus()
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

// Attach client-side file-size preflight (no-op if the form is absent)
initUploadForm()
