import { mapStatus } from '../status.js'

// Maps one NotificationDto (main's /notifications list content shape) to the
// engine-facing row the dashboard consumes. Display fields drill into the
// nested notification structure; the journeyId is the notification's
// referenceNumber, which by dual-write convention matches the fulfilment id.
export const marshalListItem = (notification) => ({
  journeyId: notification.referenceNumber,
  status: mapStatus(notification.status),
  createdAt: notification.created ?? null,
  submittedAt: null,
  concurrencyToken: notification.concurrencyToken ?? null,
  reference: notification.referenceNumber,
  commodity: notification.commodity ?? null,
  originCountryCode: notification.origin?.countryCode ?? null,
  arrivalDate: notification.transport?.arrivalDate ?? null,
  consignorName: notification.consignor?.name ?? null,
  consigneeName: notification.consignee?.name ?? null
})
