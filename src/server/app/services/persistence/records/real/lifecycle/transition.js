import { notificationsUrl } from '../config.js'
import { send } from '../http/send.js'
import { marshal } from '../marshal/document.js'

const transition = async (operation, path, actor) => {
  const response = await send(operation, `${notificationsUrl}/${path}`, {
    method: 'POST',
    body: actor
  })
  return marshal(await response.json())
}

export const submit = async (journeyId, actor, concurrencyToken) => {
  if (concurrencyToken === undefined || concurrencyToken === null) {
    throw new Error(
      `submit requires a concurrencyToken for notification ${journeyId}`
    )
  }
  const query = new URLSearchParams({ concurrencyToken })
  return transition(
    'submit-notification',
    `${journeyId}/submit?${query}`,
    actor
  )
}

export const amend = (journeyId, actor) =>
  transition('amend-notification', `${journeyId}/amend`, actor)

export const cancelAmend = (journeyId, actor) =>
  transition('cancel-amend-notification', `${journeyId}/cancel-amend`, actor)

export const softDelete = (journeyId, actor) =>
  transition('soft-delete-notification', `${journeyId}/soft-delete`, actor)
