import { Agent, Dispatcher1Wrapper } from 'undici'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'
import { measureExternalResponse } from '../metrics/external-call-metrics.js'
import { BACKEND_DEPENDENCY } from './backend-dependency.js'

const connectBoundedDispatcher = () =>
  config.get('httpProxy')
    ? undefined
    : new Dispatcher1Wrapper(new Agent({ connect: { timeout: 2000 } }))

const dispatcher = connectBoundedDispatcher()

const logger = createLogger()

const isConnectError = (error) =>
  ['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED'].includes(error?.cause?.code)

const fetchOnce = (url, init) =>
  dispatcher ? fetch(url, { ...init, dispatcher }) : fetch(url, init)

const fetchRetryingConnection = async (operation, url, init) => {
  try {
    return await fetchOnce(url, init)
  } catch (error) {
    if (!isConnectError(error)) {
      throw error
    }
    logger.warn(
      { err: error },
      `Backend connection for ${operation} did not open, retrying once`
    )
    return fetchOnce(url, init)
  }
}

/**
 * Makes one call to the journey backend, recorded as one external call under
 * the operation it names, timed from the first attempt. A connection that is
 * refused, or times out before it opens (after two seconds with no HTTP proxy),
 * is logged at warn on the service logger and tried once more; any other failure is
 * thrown to the caller.
 *
 * @param {string} operation - the backend operation, a fixed name such as `get-fulfilment`
 * @param {string | URL} url - the backend URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the backend's response
 */
export const backendFetch = (operation, url, init) =>
  measureExternalResponse({ dependency: BACKEND_DEPENDENCY, operation }, () =>
    fetchRetryingConnection(operation, url, init)
  )
