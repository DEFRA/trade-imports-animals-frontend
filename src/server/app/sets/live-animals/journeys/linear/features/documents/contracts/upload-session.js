import { randomUUID } from 'node:crypto'
import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { documentsPage as page } from '../page.js'

export const RETURNED_UPLOAD_QUERY = 'upload'

export const newCorrelationId = () => randomUUID()

/**
 * Where the upload service returns the browser once it has the file. Fixed when the session
 * opens, which is before an upload id exists, so it carries the caller's own handle instead.
 * Relative, because the upload service refuses an absolute redirect outside development.
 *
 * Carries the change context across the round trip: a trader who reached the page from the
 * review page has to land back on the same errand they left on.
 *
 * @param {object} request - the request the page is being rendered for
 * @param {string} journeyId - the notification being worked on
 * @param {string} correlationId - the handle the returning request is recognised by
 * @returns {string} the path to return to
 */
export const returnPath = (request, journeyId, correlationId) => {
  const base = kit.withChangeContext(request, pagePath(journeyId, page.slug))
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}${RETURNED_UPLOAD_QUERY}=${correlationId}`
}

export const returnedCorrelationId = (request) =>
  request.query?.[RETURNED_UPLOAD_QUERY] || undefined
