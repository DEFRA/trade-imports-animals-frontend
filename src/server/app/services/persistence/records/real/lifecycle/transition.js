import { notificationsUrl } from '../config.js'
import { send } from '../http/send.js'
import { marshal } from '../marshal/document.js'

export const finalise = async (journeyId, actor, concurrencyToken) => {
  if (concurrencyToken === undefined || concurrencyToken === null) {
    throw new Error(
      `finalise requires a concurrencyToken to submit notification ${journeyId}`
    )
  }
  const query = new URLSearchParams({ concurrencyToken })
  const response = await send(
    'submit-notification',
    `${notificationsUrl}/${journeyId}/submit?${query}`,
    { method: 'POST', body: actor }
  )
  return marshal(await response.json())
}

export const amend = async (journeyId, actor) => {
  const response = await send(
    'amend-notification',
    `${notificationsUrl}/${journeyId}/amend`,
    { method: 'POST', body: actor }
  )
  return marshal(await response.json())
}

export const cancelAmend = async (journeyId, actor) => {
  const response = await send(
    'cancel-amend-notification',
    `${notificationsUrl}/${journeyId}/cancel-amend`,
    { method: 'POST', body: actor }
  )
  return marshal(await response.json())
}

export const softDelete = async (journeyId, actor) => {
  const response = await send(
    'soft-delete-notification',
    `${notificationsUrl}/${journeyId}/soft-delete`,
    { method: 'POST', body: actor }
  )
  return marshal(await response.json())
}
