import { commodityFieldForListRow } from '../../notification-mapper/commodity-field-for-list-row.js'
import { mapStatus } from '../status.js'

export const marshalListItem = (notification) => ({
  journeyId: notification.referenceNumber,
  status: mapStatus(notification.status),
  createdAt: notification.created ?? null,
  submittedAt: null,
  concurrencyToken: notification.concurrencyToken ?? null,
  reference: notification.referenceNumber,
  commodity: commodityFieldForListRow(notification),
  originCountryCode:
    notification.origin?.countrySubdivisionCode ??
    notification.origin?.countryCode ??
    null,
  arrivalDate: notification.transport?.arrivalDate ?? null,
  consignorName: notification.consignor?.name ?? null,
  consigneeName: notification.consignee?.name ?? null
})
