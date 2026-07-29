import { commodityFromLinesA } from '../commodity.js'
import { additionalDetailsFromFulfilment } from './additional-details.js'
import { directFieldsFromFulfilment } from './direct-fields.js'
import { originFromFulfilment } from './origin.js'
import { transportFromFulfilment } from './transport.js'

export const notificationFromFulfilment = (reader, referenceNumber, lines) => {
  const notification = {
    ...directFieldsFromFulfilment(reader, referenceNumber)
  }

  const origin = originFromFulfilment(reader)
  if (origin) notification.origin = origin

  const additionalDetails = additionalDetailsFromFulfilment(reader)
  if (additionalDetails) notification.additionalDetails = additionalDetails

  const transport = transportFromFulfilment(reader)
  if (transport) notification.transport = transport

  const commodity = commodityFromLinesA(lines)
  if (commodity) notification.commodity = commodity

  return notification
}
