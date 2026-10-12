import { BackendRequestError } from '../../errors.js'
import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from '../../real/config.js'

export const advanceConcurrencyToken = (journey) => {
  journey.concurrencyToken = (journey.concurrencyToken ?? 0) + 1
}

export const assertConcurrencyToken = (journey, expected, action) => {
  // Checked before coercion: Number(null) is 0, which would match a fresh journey.
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
