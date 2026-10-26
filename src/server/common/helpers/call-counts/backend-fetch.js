import { Agent, Dispatcher1Wrapper } from 'undici'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'
import { countBackendCall } from './call-counts.js'

const logger = createLogger()

const BACKEND_CONNECT_TIMEOUT_MS = 2000

const CONNECT_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'ECONNREFUSED',
  'ETIMEDOUT'
])

const connectBoundedDispatcher = () =>
  config.get('httpProxy')
    ? undefined
    : new Dispatcher1Wrapper(
        new Agent({ connect: { timeout: BACKEND_CONNECT_TIMEOUT_MS } })
      )

const dispatcher = connectBoundedDispatcher()

const causeChain = (error) =>
  error?.cause ? [error.cause, ...causeChain(error.cause)] : []

const codesOf = (cause) => [
  cause.code,
  ...(cause.errors ?? []).map(({ code }) => code)
]

const isConnectError = (error) =>
  causeChain(error)
    .flatMap(codesOf)
    .some((code) => CONNECT_ERROR_CODES.has(code))

const fetchOnce = (url, init) =>
  dispatcher ? fetch(url, { ...init, dispatcher }) : fetch(url, init)

/**
 * Makes one call to the journey backend, counted once against the page request
 * in progress. A connection that has not opened within two seconds is tried
 * once more; any other failure is thrown to the caller.
 *
 * @param {string | URL} url - the backend URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the backend's response
 */
export const backendFetch = async (url, init) => {
  countBackendCall()
  try {
    return await fetchOnce(url, init)
  } catch (error) {
    if (!isConnectError(error)) {
      throw error
    }
    logger.warn(
      { err: error, url: String(url) },
      'Backend connection did not open, retrying once'
    )
    return fetchOnce(url, init)
  }
}
