import { notificationsUrl, HTTP_NOT_FOUND } from '../config.js'
import { failed } from './failed.js'
import { headers } from './headers.js'
import { backendFetch } from '../../../../../../common/helpers/call-counts/backend-fetch.js'

export const getFulfilment = async (journeyId) => {
  const response = await backendFetch(
    `${notificationsUrl}/${journeyId}/fulfilments`,
    {
      method: 'GET',
      headers: headers()
    }
  )
  if (response.status === HTTP_NOT_FOUND) {
    return undefined
  }
  if (!response.ok) {
    throw await failed('get fulfilment', response)
  }
  return response.json()
}
