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

// concurrencyToken rides on the query string — the copy endpoint has no request
// body — and gives the "Copy as new" click a WYSIWYG guarantee: the backend
// rejects with 409 STALE_CONCURRENCY_TOKEN if the source has moved on since
// the user last saw it.
export const copy = async (journeyId, concurrencyToken) => {
  const url = `${notificationsUrl}/${journeyId}/copy?concurrencyToken=${encodeURIComponent(concurrencyToken)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) {
    throw failed('copy notification', response)
  }
  return marshal(await response.json())
}
