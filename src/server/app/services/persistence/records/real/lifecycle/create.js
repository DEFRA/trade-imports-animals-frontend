import { fulfilmentsUrl, notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { put } from '../http/put.js'
import { marshal } from '../marshal/document.js'

// Notification mints the reference number (main's saveOriginOfImport), then the
// fulfilment is bootstrapped at that same ref via PUT /fulfilments/{ref}.
// See eudpa-288-persistence-decision memory + follow-up ticket for the rationale.
export const create = async () => {
  const notificationResponse = await fetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({})
  })
  if (!notificationResponse.ok) {
    throw failed('create notification', notificationResponse)
  }
  const notification = await notificationResponse.json()
  const journeyId = notification.referenceNumber

  const fulfilmentResponse = await put(
    `${fulfilmentsUrl}/${journeyId}`,
    { id: journeyId, fulfilment: [] },
    'create fulfilment'
  )
  return marshal(await fulfilmentResponse.json())
}

export const copy = async (journeyId, idempotencyKey) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Idempotency-Key': idempotencyKey
    }
  })
  if (!response.ok) throw failed('copy fulfilment', response)
  return marshal(await response.json())
}
