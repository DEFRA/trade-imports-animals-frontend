import { countBackendCall } from './call-counts.js'

/**
 * Makes one call to the journey backend, counted against the page request in progress.
 *
 * @param {string | URL} url - the backend URL
 * @param {RequestInit} [init] - the fetch options, passed through unchanged
 * @returns {Promise<Response>} the backend's response
 */
export const backendFetch = (url, init) => {
  countBackendCall()
  return fetch(url, init)
}
