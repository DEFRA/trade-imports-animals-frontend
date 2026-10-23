import { randomUUID } from 'node:crypto'
import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentsPage as page } from '../page.js'

// The key is the trader-facing word for what they are returning from. The value
// is the correlation handle, which is all that exists when the session opens —
// cdp-uploader has not assigned an upload id at that point.
export const RETURNED_HANDLE_QUERY = 'upload'

// The session the add form on the page being left is posting to, carried into the next render of
// the same page — in the refresh link's query, and in the form a Continue or a Remove posts. One
// key for both, and the value is a correlation handle as RETURNED_HANDLE_QUERY's is. A page view
// that carries none opens a session of its own, so two adds never share a handle.
export const OPEN_SESSION_KEY = 'uploadSession'

const CORRELATION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const newCorrelationId = () => randomUUID()

/**
 * The documents page for a notification, keeping the change context where the request carries one.
 *
 * @param {object} request - the request being handled
 * @param {string} journeyId - the notification being worked on
 * @returns {string} the page's path
 */
export const documentsPageHref = (request, journeyId) =>
  kit.withChangeContext(request, pagePath(journeyId, page.slug))

/**
 * Where the upload service returns the browser once it has the file. Relative, because the
 * upload service refuses an absolute redirect outside development.
 *
 * @param {object} request - the request the page is being rendered for
 * @param {string} journeyId - the notification being worked on
 * @param {string} correlationId - the handle the returning request is recognised by
 * @returns {string} the path to return to
 */
export const returnPath = (request, journeyId, correlationId) => {
  const base = documentsPageHref(request, journeyId)
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${RETURNED_HANDLE_QUERY}=${correlationId}`
}

/**
 * Whether a value is a handle of the UUID shape `newCorrelationId` mints. A separator, a dot
 * segment or an encoded one is no handle this module ever issued, so it is answered as no handle
 * at all.
 *
 * @param {*} value - the value a browser supplied
 * @returns {boolean} whether it is a handle of that shape
 */
export const isCorrelationHandle = (value) =>
  typeof value === 'string' && CORRELATION_ID_PATTERN.test(value)

/**
 * The handle a returning request is recognised by.
 *
 * @param {object} request - the returning request
 * @returns {string|undefined} the handle, or nothing when the query carries no handle of that shape
 */
export const returnedCorrelationId = (request) => {
  const returned = request.query?.[RETURNED_HANDLE_QUERY]
  return isCorrelationHandle(returned) ? returned : undefined
}

/**
 * The handle of the session the page view being re-rendered already opened.
 *
 * @param {object} request - the request being handled
 * @returns {string|undefined} the handle, or nothing when the request carries no handle of that
 *   shape
 */
export const carriedCorrelationId = (request) => {
  const carried =
    request.payload?.[OPEN_SESSION_KEY] ?? request.query?.[OPEN_SESSION_KEY]
  return isCorrelationHandle(carried) ? carried : undefined
}
