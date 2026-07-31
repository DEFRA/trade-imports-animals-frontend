import { failed } from './failed.js'
import { headers } from './headers.js'

export const put = async (url, body, action) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  })
  if (!response.ok) throw failed(action, response)
  return response
}
