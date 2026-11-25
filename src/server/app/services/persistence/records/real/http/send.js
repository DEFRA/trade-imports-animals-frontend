import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'
import { logger } from '../logger.js'

export const requestBackend = (operation, url, { method, body }) =>
  backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

export const refuseUnlessOk = async (operation, response, ids = {}) => {
  if (!response.ok) {
    const error = await failed(operation, response)
    logger.warn(
      {
        err: error,
        operation,
        status: response.status,
        code: error.code,
        responseBody: error.responseBody,
        ...ids
      },
      'Backend refused request'
    )
    throw error
  }
  return response
}

export const send = async (operation, url, init, ids) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init), ids)
