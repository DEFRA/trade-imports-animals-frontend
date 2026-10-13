import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'
import { backendFetch } from '../../../../../../common/helpers/call-counts/backend-fetch.js'

// A seeded draft carries the notification-shape fields and the encoded
// fulfilments, as a save does. No reference number rides along: the backend
// mints it.
const notificationBody = (fulfilment) => {
  if (fulfilment === undefined) {
    return { fulfilments: [] }
  }
  const snapshot = structuredClone(fulfilment)
  return {
    ...fulfilmentToNotification(snapshot),
    fulfilments: encodeEvaluatorFulfilments(snapshot)
  }
}

// Backend mints the reference number; response carries the created notification.
export const create = async (actor, { fulfilment } = {}) => {
  const notificationResponse = await backendFetch(notificationsUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      notification: notificationBody(fulfilment),
      ...(actor ? { actor } : {})
    })
  })
  if (!notificationResponse.ok) {
    throw await failed('create notification', notificationResponse)
  }
  return marshal(await notificationResponse.json())
}

export const copy = async (journeyId, concurrencyToken, actor) => {
  const url = `${notificationsUrl}/${journeyId}/copy?concurrencyToken=${encodeURIComponent(concurrencyToken)}`
  const response = await backendFetch(url, {
    method: 'POST',
    headers: headers(),
    body: actor ? JSON.stringify(actor) : undefined
  })
  if (!response.ok) {
    throw await failed('copy notification', response)
  }
  return marshal(await response.json())
}
