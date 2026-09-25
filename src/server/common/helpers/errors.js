import { statusCodes } from '../constants/status-codes.js'
import { base, setlessBase, sharedCopy } from '../../app/shared/kit.js'
import { setIdForPath, withSetContext } from '../../app/shared/set-context.js'

const ERROR_PAGE_COPY_KEY = {
  [statusCodes.notFound]: 'notFound',
  [statusCodes.forbidden]: 'forbidden',
  [statusCodes.unauthorized]: 'unauthorized',
  [statusCodes.badRequest]: 'badRequest'
}

const errorMessageFor = (statusCode) =>
  sharedCopy.errorPage[ERROR_PAGE_COPY_KEY[statusCode] ?? 'unexpected']

/**
 * The error page's chrome, resolved from the request path rather than from
 * whichever set happens to be ambient.
 *
 * An unrouted 404, `/health` and `/auth/*` all reach here outside every set,
 * where a set's layout and section caption cannot be resolved at all. Asking
 * for them anyway — directly or through the sole-set fallback — turns the 404
 * the user should see into a 500 as soon as a second set mounts.
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
  const errorMessage = errorMessageFor(statusCode)

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
