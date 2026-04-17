const MAX_ATTEMPTS = 10
const POLL_INTERVAL = 3000

function getPendingRows() {
  return Array.from(
    document.querySelectorAll('[data-upload-id][data-scan-status="PENDING"]')
  )
}

function announceStatus(message) {
  let liveRegion = document.getElementById('js-scan-status-announcer')
  if (!liveRegion) {
    liveRegion = document.createElement('div')
    liveRegion.id = 'js-scan-status-announcer'
    liveRegion.setAttribute('aria-live', 'polite')
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'govuk-visually-hidden'
    document.body.appendChild(liveRegion)
  }
  liveRegion.textContent = message
}

function updateRow(row, scanStatus) {
  row.dataset.scanStatus = scanStatus
  const tag = row.querySelector('.govuk-tag')
  if (!tag) return

  if (scanStatus === 'COMPLETE') {
    tag.textContent = 'Safe'
    tag.className = 'govuk-tag govuk-tag--green'
    announceStatus('Document scan complete: safe to use')
  } else if (scanStatus === 'REJECTED') {
    tag.textContent = 'Virus found'
    tag.className = 'govuk-tag govuk-tag--red'
    announceStatus(
      'Document scan failed: virus found. Remove the file and try again.'
    )
  }
}

async function pollStatus(attempt = 0) {
  if (attempt >= MAX_ATTEMPTS) {
    // Show the timed-out hint that the server-rendered template already includes
    const timedOutHint = document.getElementById('js-timeout-message')
    if (timedOutHint) timedOutHint.hidden = false
    return
  }

  let documents
  try {
    const response = await fetch('/accompanying-documents/status', {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)
      return
    }
    ;({ documents } = await response.json())
  } catch {
    setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)
    return
  }

  if (!documents) {
    setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)
    return
  }

  documents.forEach((doc) => {
    const row = document.querySelector(`[data-upload-id="${doc.uploadId}"]`)
    if (row && row.dataset.scanStatus !== doc.scanStatus) {
      updateRow(row, doc.scanStatus)
    }
  })

  const stillPending = documents.some((d) => d.scanStatus === 'PENDING')
  if (stillPending) {
    setTimeout(() => pollStatus(attempt + 1), POLL_INTERVAL)
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
