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
  const url = `${notificationsUrl}/${journeyId}/copy?concurrencyToken=${encodeURIComponent(concurrencyToken)}`
  const response = await send('copy-notification', url, {
    method: 'POST',
    body: actor
  })
  return marshal(await response.json())
}
