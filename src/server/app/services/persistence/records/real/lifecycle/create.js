import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

// Backend mints the reference number; response carries the created notification.
export const create = async () => {
  const notificationResponse = await fetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ notification: { fulfilments: [] } })
  })
  if (!notificationResponse.ok) {
    throw await failed('create notification', notificationResponse)
  }
  return marshal(await notificationResponse.json())
}

export const copy = async (journeyId, concurrencyToken) => {
  const url = `${notificationsUrl}/${journeyId}/copy?concurrencyToken=${encodeURIComponent(concurrencyToken)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) {
    throw await failed('copy notification', response)
  }
  return marshal(await response.json())
}
