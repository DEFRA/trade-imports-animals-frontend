import { headers } from './headers.js'
import { refusalCodeOf } from './refusal-code.js'
import { BACKEND_DEPENDENCY } from '../../../../../../common/helpers/backend-client/backend-dependency.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
import { markErrorLogged } from '../../../../../../common/helpers/logging/logged-error.js'
import { BackendRequestError } from '../../errors.js'
import { HTTP_CONFLICT } from '../config.js'
import { journeyReferenceFields } from '../journey-reference-fields.js'
import { logger } from '../logger.js'

export const requestBackend = (operation, url, { method, body }) =>
  backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

const refusalMessage = (otherIds) => {
  const named = Object.entries(otherIds)
    .filter(([, id]) => id != null)
    .map(([name, id]) => `${name} ${id}`)
  return named.length === 0
    ? 'Backend refused request'
    : `Backend refused request for ${named.join(', ')}`
}

const logUnreadRefusalCode = (err, response, journeyId) =>
  logger.warn(
    {
      err,
      http: { response: { status_code: response.status } },
      ...journeyReferenceFields(journeyId)
    },
    'Backend refusal code could not be read'
  )

const withRefusalCode = async (error, response, journeyId) => {
  if (response.status !== HTTP_CONFLICT) {
    return error
  }
  try {
    const code = await refusalCodeOf(response)
    if (code) {
      error.code = code
    }
  } catch (err) {
    logUnreadRefusalCode(err, response, journeyId)
  }
  return error
}

export const refuseUnlessOk = async (
  operation,
  response,
  { journeyId, ...otherIds } = {}
) => {
  if (!response.ok) {
    const error = await withRefusalCode(
      new BackendRequestError(
        { dependency: BACKEND_DEPENDENCY, operation },
        response
      ),
      response,
      journeyId
    )
    logger.warn(
      { err: error, ...journeyReferenceFields(journeyId) },
      refusalMessage(otherIds)
    )
    throw markErrorLogged(error)
  }
  return response
}

export const send = async (operation, url, init, ids) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init), ids)
