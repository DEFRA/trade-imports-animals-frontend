import { BackendRequestError } from '../../errors.js'
import { HTTP_CONFLICT } from '../../real/config.js'

/** Mirrors the backend's `@Version`: every save moves the token on, so a
 * stub-mode change in another tab is visible to a submit holding the old one. */
export const advanceConcurrencyToken = (journey) => {
  journey.concurrencyToken = (journey.concurrencyToken ?? 0) + 1
}

/** Refuses with the same shape the real client raises for a backend 409. An
 * absent token is not checked, so record-level tests that never read a token
 * can still finalise. */
export const assertConcurrencyToken = (journey, expected, action) => {
  if (expected === undefined) {
    return
  }
  if (Number(expected) !== (journey.concurrencyToken ?? 0)) {
    const error = new BackendRequestError(action, {
      status: HTTP_CONFLICT,
      statusText: 'Conflict'
    })
    error.code = 'STALE_CONCURRENCY_TOKEN'
    throw error
  }
}
