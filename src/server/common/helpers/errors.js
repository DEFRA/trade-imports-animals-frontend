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
 * The error's stack followed by each cause's, so a wrapper such as fetch's
 * "fetch failed" names the socket or DNS failure underneath it.
 *
 * @param {Error} error - the error behind the response.
 * @returns {string} the stack, then "Caused by:" and each cause in turn.
 */
export const stackWithCauses = (error) => {
  const lines = [error.stack]
  let cause = error.cause
  while (cause) {
    lines.push(`Caused by: ${cause.stack ?? String(cause)}`)
    cause = cause.cause
  }
  return lines.join('\n')
}

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
    request.logger.error(stackWithCauses(response))
  }

  return h
    .view('shared/error', {
      ...errorChrome(request, errorMessage),
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
