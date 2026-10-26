import { Agent, Dispatcher1Wrapper } from 'undici'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'
import { countBackendCall } from './call-counts.js'

const connectBoundedDispatcher = () =>
  config.get('httpProxy')
    ? undefined
    : new Dispatcher1Wrapper(new Agent({ connect: { timeout: 2000 } }))

const dispatcher = connectBoundedDispatcher()

const isConnectError = (error) =>
  ['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED'].includes(error?.cause?.code)

const fetchOnce = (url, init) =>
  dispatcher ? fetch(url, { ...init, dispatcher }) : fetch(url, init)

/**
 * Builds a backend fetch: each use makes one call to the journey backend,
 * counted once against the page request in progress. A connection that is
 * refused, or has not opened within two seconds, is logged at warn on the
 * given logger and tried once more; any other failure is thrown to the caller.
 *
 * @param {import('pino').Logger} logger - where the retry warning is written
 * @returns {(url: string | URL, init?: RequestInit) => Promise<Response>} the backend fetch
 */
export const createBackendFetch = (logger) => async (url, init) => {
  countBackendCall()
  try {
    return await fetchOnce(url, init)
  } catch (error) {
    if (!isConnectError(error)) {
      throw error
    }
    logger.warn(
      { err: error, method: init?.method ?? 'GET', url: String(url) },
      'Backend connection did not open, retrying once'
    )
    return fetchOnce(url, init)
  }
}

/**
 * Makes one call to the journey backend, counted once against the page request
 * in progress. A connection that is refused, or has not opened within two
 * seconds, is logged at warn on the service logger and tried once more; any
 * other failure is thrown to the caller.
 *
 * @param {string | URL} url - the backend URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the backend's response
 */
export const backendFetch = createBackendFetch(createLogger())
