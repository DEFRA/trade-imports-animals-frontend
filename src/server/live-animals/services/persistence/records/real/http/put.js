import { failed } from './failed.js'
import { headers } from './headers.js'

export const put = async (url, body, action, owner) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(owner),
    body: JSON.stringify(body)
  })
  if (!response.ok) throw failed(action, response)
  return response
}
