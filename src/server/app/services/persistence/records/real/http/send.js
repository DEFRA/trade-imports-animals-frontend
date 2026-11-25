import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
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

export const refuseUnlessOk = async (
  operation,
  response,
  { journeyId, ...otherIds } = {}
) => {
  if (!response.ok) {
    const error = await failed(operation, response)
    logger.warn(
      { err: error, ...journeyReferenceFields(journeyId) },
      refusalMessage(otherIds)
    )
    throw error
  }
  return response
}

export const send = async (operation, url, init, ids) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init), ids)
