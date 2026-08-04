import { fulfilmentsUrl } from '../config.js'
import { markIdempotencyKeyReuseError } from '../../errors.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

export const create = async () => {
  const response = await fetch(fulfilmentsUrl, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('create fulfilment', response)
  return marshal(await response.json())
}

export const copy = async (journeyId, idempotencyKey) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/copy`, {
    method: 'POST',
    headers: {
      ...headers(),
      'Idempotency-Key': idempotencyKey
    }
  })
  if (!response.ok) {
    const error = failed('copy fulfilment', response)
    throw response.status === 422 ? markIdempotencyKeyReuseError(error) : error
  }
  return marshal(await response.json())
}
