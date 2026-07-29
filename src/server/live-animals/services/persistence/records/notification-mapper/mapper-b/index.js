import { readFulfilment } from '../../../../../bridge/read-fulfilment.js'
import { notificationFromFulfilment } from '../mapper-a/sections/notification.js'
import { commodityLinesFromFulfilment } from '../shared/lines/from-fulfilment.js'
import { targetCommodityFromLines } from './commodity.js'
import { targetDocumentsFromFulfilment } from './documents.js'
import { applyPurposeOverlay } from './sections/purpose.js'
import { applyRegionCodeOverlay } from './sections/region-code.js'
import { applyResponsiblePersonOverlay } from './sections/responsible-person.js'
import { applyTransportExtrasOverlay } from './sections/transport-extras.js'

// Mapper B's production entry point: canonical UUID map + envelope id. The
// line/unit projection is constructed once and shared by Mapper A's base and
// Mapper B's enriched commodity projection.
export const answersToTargetNotification = (
  fulfilment = {},
  referenceNumber
) => {
  const reader = readFulfilment(fulfilment)
  const lines = commodityLinesFromFulfilment(reader)
  const notification = notificationFromFulfilment(
    reader,
    referenceNumber,
    lines
  )

  applyResponsiblePersonOverlay(notification, reader)
  applyPurposeOverlay(notification, reader)
  applyRegionCodeOverlay(notification, reader)
  applyTransportExtrasOverlay(notification, reader)

  const commodity = targetCommodityFromLines(lines)
  if (commodity) notification.commodity = commodity

  const targetDocumentEntries = targetDocumentsFromFulfilment(reader)
  if (targetDocumentEntries) notification.documents = targetDocumentEntries

  return notification
}
