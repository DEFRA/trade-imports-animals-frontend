import { compact } from '../../shared/compact.js'
import { commodityFromLinesA } from '../commodity.js'
import { additionalDetailsFromFulfilment } from './additional-details.js'
import { directFieldsFromFulfilment } from './direct-fields.js'
import { originFromFulfilment } from './origin.js'
import { transportFromFulfilment } from './transport.js'

export const notificationFromFulfilment = (reader, referenceNumber, lines) =>
  compact({
    ...directFieldsFromFulfilment(reader, referenceNumber),
    origin: originFromFulfilment(reader),
    additionalDetails: additionalDetailsFromFulfilment(reader),
    transport: transportFromFulfilment(reader),
    commodity: commodityFromLinesA(lines)
  })
