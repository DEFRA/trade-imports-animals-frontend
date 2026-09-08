import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

const postTransition = async (url, action, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  if (!response.ok) {
    throw await failed(action, response)
  }
  return response
}

export const finalise = async (journeyId, actor) => {
  const response = await postTransition(
    `${notificationsUrl}/${journeyId}/submit`,
    'submit notification',
    actor
  )
  return marshal(await response.json())
}

export const amend = async (journeyId, actor) => {
  const response = await postTransition(
    `${notificationsUrl}/${journeyId}/amend`,
    'amend notification',
    actor
  )
  return marshal(await response.json())
}

export const cancelAmend = async (journeyId) => {
  const response = await postTransition(
    `${notificationsUrl}/${journeyId}/cancel-amend`,
    'cancel notification amendment'
  )
  return marshal(await response.json())
}

export const softDelete = async (journeyId) => {
  const response = await postTransition(
    `${notificationsUrl}/${journeyId}/soft-delete`,
    'soft-delete notification'
  )
  return marshal(await response.json())
}
