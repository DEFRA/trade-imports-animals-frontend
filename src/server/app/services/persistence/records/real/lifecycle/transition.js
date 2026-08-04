import { notificationFulfilmentsUrl, notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

// Every lifecycle transition dual-writes: one call to the canonical fulfilment
// endpoint, one to the notification endpoint. The fulfilment side's response is
// returned to the caller (canonical is the source of truth for rehydration).
// The notification side is fired in parallel so its outbox event lands via
// main's existing NotificationService path.
const postAggregate = async (url, action, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!response.ok) throw failed(action, response)
  return response
}

export const finalise = async (journeyId, actor) => {
  const [fulfilmentResponse] = await Promise.all([
    postAggregate(
      `${notificationFulfilmentsUrl}/${journeyId}/submit`,
      'submit notification-fulfilments',
      actor
    ),
    postAggregate(
      `${notificationsUrl}/${journeyId}/submit`,
      'submit notification',
      actor
    )
  ])
  return marshal(await fulfilmentResponse.json())
}

export const amend = async (journeyId, actor) => {
  const [fulfilmentResponse] = await Promise.all([
    postAggregate(
      `${notificationFulfilmentsUrl}/${journeyId}/amend`,
      'amend notification-fulfilments',
      actor
    ),
    postAggregate(
      `${notificationsUrl}/${journeyId}/amend`,
      'amend notification',
      actor
    )
  ])
  return marshal(await fulfilmentResponse.json())
}

export const cancelAmend = async (journeyId) => {
  const [fulfilmentResponse] = await Promise.all([
    postAggregate(
      `${notificationFulfilmentsUrl}/${journeyId}/cancel-amend`,
      'cancel notification-fulfilments amendment'
    ),
    postAggregate(
      `${notificationsUrl}/${journeyId}/cancel-amend`,
      'cancel notification amendment'
    )
  ])
  return marshal(await fulfilmentResponse.json())
}

// Neither fulfilment nor notification soft-delete accepts an actor body;
// keep the signature for callers that pass one but do not forward it.
export const softDelete = async (journeyId) => {
  const [fulfilmentResponse] = await Promise.all([
    postAggregate(
      `${notificationFulfilmentsUrl}/${journeyId}/soft-delete`,
      'soft-delete notification-fulfilments'
    ),
    postAggregate(
      `${notificationsUrl}/${journeyId}/soft-delete`,
      'soft-delete notification'
    )
  ])
  return marshal(await fulfilmentResponse.json())
}
