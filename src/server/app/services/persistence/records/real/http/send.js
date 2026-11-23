import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'

export const requestBackend = (operation, url, { method, body }) =>
  backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

export const refuseUnlessOk = async (operation, response) => {
  if (!response.ok) {
    throw await failed(operation, response)
  }
  return response
}

export const send = async (operation, url, init) =>
  refuseUnlessOk(operation, await requestBackend(operation, url, init))
