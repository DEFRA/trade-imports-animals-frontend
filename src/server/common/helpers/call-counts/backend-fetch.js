import { Agent, fetch as undiciFetch } from 'undici'

import { config } from '../../../../config/config.js'
import { countBackendCall } from './call-counts.js'

// A connection that has not opened by now will not: Docker Desktop's port
// forwarder can stall one outright, and undici's own default waits ten seconds.
const CONNECT_TIMEOUT_MS = 2000

// Failures before the request was sent, so it is safe to send it again.
const CONNECT_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'ECONNREFUSED',
  'ETIMEDOUT'
])

// Behind an HTTP proxy every call keeps the global fetch and the proxy's
// dispatcher. Node's built-in fetch cannot take an agent from the undici
// package (it rejects its handlers), so the bounded agent goes with undici's
// own fetch.
const connectBoundedDispatcher = () =>
  config.get('httpProxy')
    ? undefined
    : new Agent({ connect: { timeout: CONNECT_TIMEOUT_MS } })

const dispatcher = connectBoundedDispatcher()

const causeCodes = (error) => {
  const codes = []
  let cause = error?.cause
  while (cause) {
    if (cause.code) {
      codes.push(cause.code)
    }
    cause = cause.cause
  }
  return codes
}

const isConnectError = (error) =>
  causeCodes(error).some((code) => CONNECT_ERROR_CODES.has(code))

const fetchOnce = (url, init) =>
  dispatcher ? undiciFetch(url, { ...init, dispatcher }) : fetch(url, init)

/**
 * Makes one call to the journey backend, counted against the page request in
 * progress. A connection that never opens is given up on after two seconds and
 * tried once more; any other failure is the caller's.
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
    return fetchOnce(url, init)
  }
}
