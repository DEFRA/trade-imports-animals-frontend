import { fulfilmentsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

export const create = async ({ userId, owner } = {}) => {
  const response = await fetch(fulfilmentsUrl, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('create fulfilment', response)
  return marshal(await response.json(), userId ?? owner?.sub ?? null)
}

export const copy = async (journeyId, owner, idempotencyKey) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Idempotency-Key': idempotencyKey
    }
  })
  if (!response.ok) throw failed('copy fulfilment', response)
  return marshal(await response.json(), owner?.sub ?? null)
}
