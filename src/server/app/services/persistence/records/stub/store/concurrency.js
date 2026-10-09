import { BackendRequestError } from '../../errors.js'
import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from '../../real/config.js'

/** Mirrors the backend's `@Version`: every save moves the token on, so a
 * stub-mode change in another tab is visible to a submit holding the old one. */
export const advanceConcurrencyToken = (journey) => {
  journey.concurrencyToken = (journey.concurrencyToken ?? 0) + 1
}

/** Refuses with the same shapes the backend returns: a 400 naming
 * `concurrencyToken` when none is given, a 409 when it is stale. A missing
 * token is checked before any coercion — `Number(null)` is 0, which would
 * match a fresh journey. */
export const assertConcurrencyToken = (journey, expected, action) => {
  if (expected === undefined || expected === null) {
    const error = new BackendRequestError(action, {
      status: HTTP_BAD_REQUEST,
      statusText: 'Bad Request'
    })
    error.errors = { concurrencyToken: 'concurrencyToken is required' }
    throw error
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
