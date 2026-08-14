import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

// Backend mints the reference number; response carries the created notification.
export const create = async () => {
  const notificationResponse = await fetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fulfilments: [] })
  })
  if (!notificationResponse.ok) {
    throw failed('create notification', notificationResponse)
  }
  return marshal(await notificationResponse.json())
}

// Copy dedup dropped pending EUDPA-314
export const copy = async (journeyId, _idempotencyKey) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) {
    throw failed('copy notification', response)
  }
  return marshal(await response.json())
}
