import { notificationsUrl } from '../config.js'
import { failed } from '../http/failed.js'
import { getFulfilment } from '../http/get-fulfilment.js'
import { headers } from '../http/headers.js'
import { marshal } from '../marshal/document.js'
import { marshalListItem } from '../marshal/list-item.js'

export const load = async ({ journeyId } = {}) => {
  if (journeyId != null) {
    const fulfilment = await getFulfilment(journeyId)
    return fulfilment === undefined ? undefined : marshal(fulfilment)
  }
  return undefined
}

// Dashboard list source. Reads notification-shape display fields (commodity,
// origin, arrival date, party names) from the merged notification collection
// (EUDPA-323) via /notifications. The fulfilments payload used by the engine
// during rehydrate is fetched separately per-notification via
// /notifications/{ref}/fulfilments in load() above.
export const list = async ({
  page = 1,
  sort = 'arrivalDate,desc',
  referenceNumber
} = {}) => {
  const referenceQuery = referenceNumber
    ? `&referenceNumber=${encodeURIComponent(referenceNumber)}`
    : ''
  const response = await fetch(
    `${notificationsUrl}?page=${page}&sort=${sort}${referenceQuery}`,
    {
      method: 'GET',
      headers: headers()
    }
  )
  if (!response.ok) {
    throw failed('list notifications', response)
  }
  const result = await response.json()
  return {
    rows: result.content.map(marshalListItem),
    page: result.page,
    size: result.size,
    totalElements: result.totalElements,
    totalPages: result.totalPages
  }
}

export const has = async (journeyId) => {
  return (await getFulfilment(journeyId)) !== undefined
}
