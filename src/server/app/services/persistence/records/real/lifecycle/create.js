import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshalNotification } from '../marshal/document.js'

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
  return marshalNotification(await notificationResponse.json())
}

// Copy dedup dropped pending EUDPA-314; the idempotencyKey parameter is retained
// on the signature so upstream callers (view-model, controller) don't have to
// change simultaneously, but it is no longer forwarded as a header.
export const copy = async (journeyId, _idempotencyKey) => {
  const response = await fetch(`${notificationsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) {
    throw failed('copy notification', response)
  }
  return marshalNotification(await response.json())
}
