import { POLL_ACTION, POLL_INTERVAL_MS, pollDecision } from '../../scan-poll.js'
import { announcer, readScanCopy } from './announce.js'
import { STATUS_ENDPOINT } from './page.js'
import { applyStatusUpdates, pendingCells } from './status-cell.js'

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

// A settled scan changes the Continue state and may add virus errors, so
// re-render from the server. The page is also reachable by POST (a blocked
// Continue), so navigate to its GET href rather than reloading.
const goToSettledPage = () => {
  const href = announcer()?.dataset.settledHref
  if (href) {
    globalThis.location.replace(href)
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
  } else {
    setTimeout(
      () => pollScanStatus(decision.attempt, scanCopy),
      decision.delayMs
    )
  }
}

const hideRefreshFallback = () => {
  const fallback = document.getElementById('js-refresh-fallback')
  if (fallback) {
    fallback.hidden = true
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
