import { notificationsUrl } from '../config.js'
import { send } from '../http/send.js'
import { marshal } from '../marshal/document.js'

export const create = async (actor) => {
  const response = await send('create-notification', notificationsUrl, {
    method: 'POST',
    body: {
      notification: { fulfilments: [] },
      ...(actor ? { actor } : {})
    }
  })
  return marshal(await response.json())
}

export const copy = async (journeyId, concurrencyToken, actor) => {
  const query = new URLSearchParams({ concurrencyToken })
  const response = await send(
    'copy-notification',
    `${notificationsUrl}/${journeyId}/copy?${query}`,
    { method: 'POST', body: actor },
    { journeyId }
  )
  return marshal(await response.json())
}
