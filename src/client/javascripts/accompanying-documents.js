const MAX_ATTEMPTS = 10
const POLL_INTERVAL = 3000
const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_COMPLETE = 'COMPLETE'
const SCAN_STATUS_REJECTED = 'REJECTED'

const getPendingRows = () =>
  Array.from(
    document.querySelectorAll(
      `[data-upload-id][data-scan-status="${SCAN_STATUS_PENDING}"]`
    )
  )

const announceStatus = (message) => {
  const liveRegion = document.getElementById('js-scan-status-announcer')
  if (liveRegion) liveRegion.textContent = message
}

const updateRow = (row, scanStatus) => {
  row.dataset.scanStatus = scanStatus
  const tag = row.querySelector('.govuk-tag')
  if (!tag) return

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
  if (!response.ok) return null
  const { documents } = await response.json()
  return documents ?? null
}

const pollStatus = async (attempt = 0) => {
  if (attempt >= MAX_ATTEMPTS) {
    // Show the timed-out hint that the server-rendered template already includes
    const timedOutHint = document.getElementById('js-timeout-message')
    if (timedOutHint) timedOutHint.hidden = false
    return
  }

  const retry = () => setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)

  let documents
  try {
    documents = await fetchStatuses()
  } catch {
    return retry()
  }
  if (!documents) return retry()

  documents.forEach((doc) => {
    const row = document.querySelector(`[data-upload-id="${doc.uploadId}"]`)
    if (row && row.dataset.scanStatus !== doc.scanStatus) {
      updateRow(row, doc.scanStatus)
    }
  })

  const stillPending = documents.some(
    (doc) => doc.scanStatus === SCAN_STATUS_PENDING
  )
  if (stillPending) {
    retry()
  } else {
    // Reload to get correct Save and continue state and any virus error messages
    window.location.reload()
  }
}

// Hide the non-JS refresh fallback
const fallback = document.getElementById('js-refresh-fallback')
if (fallback) fallback.hidden = true

// Start polling if any docs are still being scanned
if (getPendingRows().length > 0) {
  setTimeout(() => pollStatus(0), POLL_INTERVAL)
}
