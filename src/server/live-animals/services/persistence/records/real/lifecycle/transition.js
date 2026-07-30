import { fulfilmentsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'

export const finalise = async (journeyId) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/submit`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('submit fulfilment', response)
  return marshal(await response.json())
}

export const amend = async (journeyId) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/amend`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('amend fulfilment', response)
  return marshal(await response.json())
}

export const cancelAmend = async (journeyId) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/cancel-amend`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('cancel amendment', response)
  return marshal(await response.json())
}

export const softDelete = async (journeyId) => {
  const response = await fetch(`${fulfilmentsUrl}/${journeyId}/soft-delete`, {
    method: 'POST',
    headers: headers()
  })
  if (!response.ok) throw failed('soft-delete fulfilment', response)
  return marshal(await response.json())
}
