import { pagePath } from '../../../../../../../shared/paths.js'
import * as kit from '../../../../../../../shared/kit.js'
import { OPEN_SESSION_KEY } from '../contracts/upload-session.js'
import { documentsPage as page } from '../page.js'

export const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query?.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const withQuery = (href, name, value) =>
  `${href}${href.includes('?') ? '&' : '?'}${name}=${value}`

/**
 * @param {object} request - the request the page is being rendered for
 * @param {number} attempt - the refresh this href is the next one after
 * @param {string} [uploadSession] - the handle of the session the add form is posting to
 * @returns {string} the page's path, carrying the attempt counter and, when given, the
 *   handle of the open upload session
 */
export const refreshHref = (request, attempt, uploadSession) => {
  const refresh = withQuery(
    kit.withChangeContext(
      request,
      pagePath(request.params.journeyId, page.slug)
    ),
    'attempt',
    attempt
  )
  return uploadSession
    ? withQuery(refresh, OPEN_SESSION_KEY, uploadSession)
    : refresh
}
