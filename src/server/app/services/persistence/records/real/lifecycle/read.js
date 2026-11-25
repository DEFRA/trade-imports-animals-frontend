import { notificationsUrl } from '../config.js'
import { getFulfilment } from '../http/get-fulfilment.js'
import { send } from '../http/send.js'
import { marshal } from '../marshal/document.js'
import { marshalListItem } from '../marshal/list-item.js'

export const load = async ({ journeyId } = {}) => {
  if (journeyId != null) {
    const fulfilment = await getFulfilment(journeyId)
    return fulfilment === undefined ? undefined : marshal(fulfilment)
  }
  return undefined
}

export const list = async ({
  page = 1,
  sort = 'arrivalDate,desc',
  referenceNumber
} = {}) => {
  const referenceQuery = referenceNumber
    ? `&referenceNumber=${encodeURIComponent(referenceNumber)}`
    : ''
  const response = await send(
    'list-notifications',
    `${notificationsUrl}?page=${page}&sort=${sort}${referenceQuery}`,
    { method: 'GET' },
    { referenceNumber }
  )
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
