import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

// Under the merged aggregate (EUDPA-323), each lifecycle transition is a single
// POST to /notifications/{ref}/{action}. Backend writes the merged aggregate +
// fires the outbox event atomically inside writeWithOutbox.
const postAggregate = async (url, action, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!response.ok) {
    throw failed(action, response)
  }
  return response
}

export const finalise = async (journeyId, actor) => {
  const response = await postAggregate(
    `${notificationsUrl}/${journeyId}/submit`,
    'submit notification',
    actor
  )
  return marshal(await response.json())
}

export const amend = async (journeyId, actor) => {
  const response = await postAggregate(
    `${notificationsUrl}/${journeyId}/amend`,
    'amend notification',
    actor
  )
  return marshal(await response.json())
}

export const cancelAmend = async (journeyId) => {
  const response = await postAggregate(
    `${notificationsUrl}/${journeyId}/cancel-amend`,
    'cancel notification amendment'
  )
  return marshal(await response.json())
}

// Neither fulfilment nor notification soft-delete accepts an actor body;
// keep the signature for callers that pass one but do not forward it.
export const softDelete = async (journeyId) => {
  const response = await postAggregate(
    `${notificationsUrl}/${journeyId}/soft-delete`,
    'soft-delete notification'
  )
  return marshal(await response.json())
}
