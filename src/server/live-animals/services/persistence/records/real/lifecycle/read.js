import { fulfilmentsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { getFulfilment } from '../http/get-fulfilment.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'
import { marshalListItem } from '../marshal/list-item.js'

export const load = async ({ journeyId, userId, owner } = {}) => {
  if (journeyId != null) {
    const fulfilment = await getFulfilment(journeyId, owner)
    return fulfilment === undefined
      ? undefined
      : marshal(fulfilment, userId ?? owner?.sub ?? null)
  }
  return undefined
}

export const list = async ({
  owner,
  page = 1,
  sort = 'arrivalDate,desc'
} = {}) => {
  const response = await fetch(`${fulfilmentsUrl}?page=${page}&sort=${sort}`, {
    method: 'GET',
    headers: headers(owner)
  })
  if (!response.ok) throw failed('list fulfilments', response)
  const result = await response.json()
  return {
    rows: result.items.map(marshalListItem),
    page: result.page,
    size: result.size,
    totalElements: result.totalElements,
    totalPages: result.totalPages
  }
}

export const has = async (journeyId, owner) => {
  return (await getFulfilment(journeyId, owner)) !== undefined
}
