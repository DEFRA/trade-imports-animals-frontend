import { mapStatus } from '../status.js'

/** Maps one NotificationDto from the backend's /notifications list to the
 * engine-facing row the dashboard consumes. The journeyId is the
 * notification's referenceNumber. */
export const marshalListItem = (notification) => ({
  journeyId: notification.referenceNumber,
  status: mapStatus(notification.status),
  createdAt: notification.created ?? null,
  submittedAt: null,
  concurrencyToken: notification.concurrencyToken ?? null,
  reference: notification.referenceNumber,
  commodity: notification.commodity?.name
    ? { commodityCode: notification.commodity.name }
    : null,
  originCountryCode:
    notification.origin?.countrySubdivisionCode ??
    notification.origin?.countryCode ??
    null,
  arrivalDate: notification.transport?.arrivalDate ?? null,
  consignorName: notification.consignor?.name ?? null,
  consigneeName: notification.consignee?.name ?? null
})
