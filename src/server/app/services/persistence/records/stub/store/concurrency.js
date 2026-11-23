import { STALE_CONCURRENCY_TOKEN } from '../../../../../engine/persistence/records.js'
import { BACKEND_DEPENDENCY } from '../../../../../../common/helpers/call-counts/call-counts.js'
import { BackendRequestError } from '../../errors.js'
import { HTTP_BAD_REQUEST, HTTP_CONFLICT } from '../../real/config.js'

export const advanceConcurrencyToken = (journey) => {
  journey.concurrencyToken = (journey.concurrencyToken ?? 0) + 1
}

const isMissingToken = (token) => token === undefined || token === null

export const assertConcurrencyToken = (
  journey,
  expectedConcurrencyToken,
  operation
) => {
  const call = { dependency: BACKEND_DEPENDENCY, operation }
  if (isMissingToken(expectedConcurrencyToken)) {
    const error = new BackendRequestError(call, {
      status: HTTP_BAD_REQUEST,
      statusText: 'Bad Request'
    })
    error.errors = { concurrencyToken: 'concurrencyToken is required' }
    throw error
  }
  if (Number(expectedConcurrencyToken) !== (journey.concurrencyToken ?? 0)) {
    const error = new BackendRequestError(call, {
      status: HTTP_CONFLICT,
      statusText: 'Conflict'
    })
    error.code = STALE_CONCURRENCY_TOKEN
    throw error
  }
}
