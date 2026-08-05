export const SCAN_STATUS = {
  COMPLETE: 'COMPLETE',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  UNAVAILABLE: 'UNAVAILABLE',
  NO_FILE: 'NO_FILE'
}

// A row with no file has nothing to scan, so it is settled by definition — the
// file is optional and must never hold the journey up.
const SETTLED_STATUSES = [
  SCAN_STATUS.COMPLETE,
  SCAN_STATUS.REJECTED,
  SCAN_STATUS.NO_FILE
]

export const isSettled = (scanStatus) => SETTLED_STATUSES.includes(scanStatus)

// Settled is not the same as continuable: a virus verdict ends the scan but the
// row still has to be removed before the journey can move on.
const CONTINUABLE_STATUSES = [SCAN_STATUS.COMPLETE, SCAN_STATUS.NO_FILE]

export const allowsContinue = (scanStatus) =>
  CONTINUABLE_STATUSES.includes(scanStatus)

export const POLL_INTERVAL_MS = 3000
export const MAX_POLL_ATTEMPTS = 10

export const POLL_ACTION = {
  settled: 'settled',
  retry: 'retry',
  giveUp: 'giveUp'
}

export const hasSettled = (documents) =>
  Array.isArray(documents) &&
  documents.every((item) => isSettled(item.scanStatus))

const lastAttempt = (attempt) => attempt + 1 >= MAX_POLL_ATTEMPTS

/** What to do after read number `attempt` (zero-indexed) returned `documents` —
 * null when the read failed or the response was unusable. */
export const pollDecision = ({ attempt, documents }) => {
  if (hasSettled(documents)) return { action: POLL_ACTION.settled }
  if (lastAttempt(attempt)) return { action: POLL_ACTION.giveUp }
  return {
    action: POLL_ACTION.retry,
    attempt: attempt + 1,
    delayMs: POLL_INTERVAL_MS
  }
}
