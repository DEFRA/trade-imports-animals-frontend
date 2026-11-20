import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/backend-client/backend-fetch.js'

export const send = async (operation, url, { method, body }) => {
  const response = await backendFetch(operation, url, {
    method,
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!response.ok) {
    throw await failed(operation, response)
  }
  return response
}
