import { randomUUID } from 'node:crypto'
import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentsPage as page } from '../page.js'

// The key is the trader-facing word for what they are returning from. The value
// is the correlation handle, which is all that exists when the session opens —
// cdp-uploader has not assigned an upload id at that point.
export const RETURNED_HANDLE_QUERY = 'upload'

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
 * The handle a returning request is recognised by, answered only for the UUID shape
 * `newCorrelationId` mints. A separator, a dot segment or an encoded one is no handle this
 * module ever issued, so it is answered as no handle at all.
 *
 * @param {object} request - the returning request
 * @returns {string|undefined} the handle, or nothing when the query carries no handle of that shape
 */
export const returnedCorrelationId = (request) => {
  const returned = request.query?.[RETURNED_HANDLE_QUERY]
  return typeof returned === 'string' && CORRELATION_ID_PATTERN.test(returned)
    ? returned
    : undefined
}
