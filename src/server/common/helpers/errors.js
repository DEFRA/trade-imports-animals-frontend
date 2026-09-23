import { statusCodes } from '../constants/status-codes.js'
import { base, setlessBase } from '../../app/shared/kit.js'
import { setIdForPath, withSetContext } from '../../app/shared/set-context.js'

function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

/**
 * The error page's chrome, resolved from the request path rather than from
 * whichever set happens to be ambient.
 *
 * An unrouted 404, `/health`, `/signout` and `/auth/*` all reach here outside
 * every set, where a set's layout and section caption cannot be resolved at
 * all. Asking for them anyway — directly or through the sole-set fallback —
 * turns the 404 the user should see into a 500 as soon as a second set mounts.
 */
const errorChrome = (request, errorMessage) => {
  const setId = setIdForPath(request.path)
  return setId
    ? withSetContext(setId, () => base(errorMessage))
    : setlessBase(errorMessage)
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('shared/error', {
      ...errorChrome(request, errorMessage),
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
