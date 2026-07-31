import { readFulfilment } from '../../../../../bridge/read-fulfilment.js'
import { commodityLinesFromFulfilment } from '../shared/lines/from-fulfilment.js'
import { notificationFromFulfilment } from './sections/notification.js'

// Mapper A's production entry point: canonical UUID map + envelope id.
export const fulfilmentToNotification = (fulfilment = {}, referenceNumber) => {
  const reader = readFulfilment(fulfilment)
  const lines = commodityLinesFromFulfilment(reader)
  return notificationFromFulfilment(reader, referenceNumber, lines)
}
