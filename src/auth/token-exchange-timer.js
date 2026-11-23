import { recordExternalCallInBackground } from '../server/common/helpers/metrics/external-call-metrics.js'
import { DEFRA_ID_CALLS } from './defra-id-calls.js'

export const TOKEN_EXCHANGE_STARTED_AT_KEY = 'defraIdTokenExchangeStartedAt'

/**
 * Stamps the start of the token exchange when Bell looks up the token endpoint.
 *
 * @param {string} tokenEndpoint - Defra ID's token endpoint
 * @returns {(request: object) => string} a `provider.token` function that stamps the start and returns the endpoint
 */
export const timeTokenExchange = (tokenEndpoint) => (request) => {
  request.app[TOKEN_EXCHANGE_STARTED_AT_KEY] = performance.now()
  return tokenEndpoint
}

/**
 * Records the token exchange Bell made for this request.
 *
 * @param {object} request - the sign-in callback request
 */
export const recordTokenExchange = (request) => {
  const startedAt = request.app?.[TOKEN_EXCHANGE_STARTED_AT_KEY]
  if (startedAt === undefined) {
    return
  }
  recordExternalCallInBackground(DEFRA_ID_CALLS.tokenExchange, {
    durationMs: performance.now() - startedAt,
    failed: !request.auth.isAuthenticated
  })
}
