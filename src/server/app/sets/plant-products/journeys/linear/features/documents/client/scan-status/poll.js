import { POLL_ACTION, POLL_INTERVAL_MS, pollDecision } from '../../scan-poll.js'
import { announcer, readScanCopy } from './announce.js'
import { STATUS_ENDPOINT } from './page.js'
import { applyStatusUpdates, pendingCells } from './status-cell.js'

// A failed, refused or unusable read answers null, which pollDecision treats as
// "not settled" — a row is never allowed to settle on an absence of evidence.
const readStatuses = async () => {
  try {
    const response = await fetch(STATUS_ENDPOINT, {
      headers: { Accept: 'application/json' }
    })
    if (!response.ok) {
      return null
    }
    const { documents } = await response.json()
    return documents ?? null
  } catch {
    return null
  }
}

// The server already renders the hint; polling only unhides it.
const showTimedOutHint = () => {
  const hint = document.getElementById('js-timeout-message')
  if (hint) {
    hint.hidden = false
  }
}

// A settled scan changes the Continue state and may add virus errors, so the
// page is re-rendered by the server rather than simulated here. The page is
// also reachable by POST (a blocked Continue), so navigate to its GET href
// rather than reloading.
const goToSettledPage = () => {
  const href = announcer()?.dataset.settledHref
  if (href) {
    globalThis.location.replace(href)
  }
}

// The manual link stays in the markup and stays usable; it is only hidden once
// something is actually polling on the user's behalf, and it comes straight
// back the moment polling stops doing that.
const refreshFallback = () => document.getElementById('js-refresh-fallback')

const hideRefreshFallback = () => {
  const fallback = refreshFallback()
  if (fallback) {
    fallback.hidden = true
  }
}

const showRefreshFallback = () => {
  const fallback = refreshFallback()
  if (fallback) {
    fallback.hidden = false
  }
}

const pollScanStatus = async (attempt, scanCopy) => {
  const documents = await readStatuses()
  if (documents) {
    applyStatusUpdates(documents, scanCopy)
  }
  const decision = pollDecision({ attempt, documents })
  if (decision.action === POLL_ACTION.settled) {
    goToSettledPage()
  } else if (decision.action === POLL_ACTION.giveUp) {
    showTimedOutHint()
    showRefreshFallback()
  } else {
    setTimeout(
      () => pollScanStatus(decision.attempt, scanCopy),
      decision.delayMs
    )
  }
}

export const startPolling = () => {
  if (pendingCells().length === 0) {
    return
  }
  hideRefreshFallback()
  const scanCopy = readScanCopy()
  setTimeout(() => pollScanStatus(0, scanCopy), POLL_INTERVAL_MS)
}
