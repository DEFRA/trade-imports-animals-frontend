export const SCAN_STATUS = {
  COMPLETE: 'COMPLETE',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED'
}

export const POLL_INTERVAL_MS = 3000
export const MAX_POLL_ATTEMPTS = 10

export const POLL_ACTION = {
  settled: 'settled',
  retry: 'retry',
  giveUp: 'giveUp'
}

export const hasSettled = (documents) =>
  Array.isArray(documents) &&
  documents.every((item) => item.scanStatus !== SCAN_STATUS.PENDING)

const lastAttempt = (attempt) => attempt + 1 >= MAX_POLL_ATTEMPTS

/** What to do after fetch number `attempt` (zero-indexed) returned
 * `documents` — null when the fetch failed or the response was unusable. */
export const pollDecision = ({ attempt, documents }) => {
  if (documents && hasSettled(documents)) {
    return { action: POLL_ACTION.settled }
  }
  if (lastAttempt(attempt)) {
    return { action: POLL_ACTION.giveUp }
  }
  return {
    action: POLL_ACTION.retry,
    attempt: attempt + 1,
    delayMs: POLL_INTERVAL_MS
  }
}
