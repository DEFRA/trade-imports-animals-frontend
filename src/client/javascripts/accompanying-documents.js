const POLL_INTERVAL = 3000

function getPendingRows() {
  return Array.from(
    document.querySelectorAll('[data-upload-id][data-scan-status="PENDING"]')
  )
}

function updateRow(row, scanStatus) {
  row.dataset.scanStatus = scanStatus
  const tag = row.querySelector('.govuk-tag')
  if (!tag) return

  if (scanStatus === 'COMPLETE') {
    tag.textContent = 'Safe'
    tag.className = 'govuk-tag govuk-tag--green'
  } else if (scanStatus === 'REJECTED') {
    tag.textContent = 'Virus found'
    tag.className = 'govuk-tag govuk-tag--red'
  }
}

async function pollStatus() {
  let documents
  try {
    const response = await fetch('/accompanying-documents/status', {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      setTimeout(pollStatus, POLL_INTERVAL)
      return
    }
    ;({ documents } = await response.json())
  } catch {
    setTimeout(pollStatus, POLL_INTERVAL)
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
    setTimeout(pollStatus, POLL_INTERVAL)
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
  setTimeout(pollStatus, POLL_INTERVAL)
}
