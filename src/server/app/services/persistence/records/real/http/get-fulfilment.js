import { notificationsUrl, HTTP_NOT_FOUND } from '../config.js'
import { failed } from './failed.js'
import { headers } from './headers.js'

export const getFulfilment = async (journeyId) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}/fulfilments`, {
    method: 'GET',
    headers: headers()
  })
  if (response.status === HTTP_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw failed('get fulfilment', response)
  }
  return response.json()
}
