import { notificationFulfilmentsUrl, notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { put } from '../http/put.js'
import { marshal } from '../marshal/document.js'

// Notification mints the reference number (main's saveOriginOfImport), then the
// notification-fulfilments aggregate is bootstrapped at that same ref via
// PUT /notification-fulfilments/{ref}. See eudpa-288-persistence-decision
// memory + follow-up ticket for the rationale.
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

  const response = await put(
    `${notificationFulfilmentsUrl}/${journeyId}`,
    { id: journeyId, fulfilments: [] },
    'create notification-fulfilments'
  )
  return marshal(await response.json())
}

export const copy = async (journeyId, idempotencyKey) => {
  const response = await fetch(
    `${notificationFulfilmentsUrl}/${journeyId}/copy`,
    {
      method: 'POST',
      headers: {
        ...headers(),
        'Idempotency-Key': idempotencyKey
      }
    }
  )
  if (!response.ok) throw failed('copy notification-fulfilments', response)
  return marshal(await response.json())
}
