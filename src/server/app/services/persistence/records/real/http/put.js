import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/call-counts/backend-fetch.js'

export const put = async (url, body, action) => {
  const response = await backendFetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    throw await failed(action, response)
  }
  return response
}
