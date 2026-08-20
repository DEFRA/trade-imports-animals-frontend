import { party } from '../../../../address-book/index.js'
import { mapStatus } from '../status.js'

const nameOf = async (consignmentParty, lookup) => {
  if (!consignmentParty) {
    return null
  }
  if (consignmentParty.addressId) {
    const record = await lookup(consignmentParty.addressId)
    return record && !record.deleted ? (record.name ?? null) : null
  }
  return consignmentParty.name ?? null
}

export const listItemMarshaller = (organisationId) => {
  const inFlight = new Map()
  const lookup = (addressId) => {
    if (!inFlight.has(addressId)) {
      inFlight.set(addressId, party(organisationId, addressId))
    }
    return inFlight.get(addressId)
  }

  // Maps one NotificationDto (main's /notifications list content shape) to the
  // engine-facing row the dashboard consumes. Display fields drill into the
  // nested notification structure; the journeyId is the notification's
  // referenceNumber, which by dual-write convention matches the fulfilment id.
  return async (notification) => ({
    journeyId: notification.referenceNumber,
    status: mapStatus(notification.status),
    createdAt: notification.created ?? null,
    submittedAt: null,
    concurrencyToken: notification.concurrencyToken ?? null,
    reference: notification.referenceNumber,
    commodity: notification.commodity ?? null,
    originCountryCode: notification.origin?.countryCode ?? null,
    arrivalDate: notification.transport?.arrivalDate ?? null,
    consignorName: await nameOf(notification.consignor, lookup),
    consigneeName: await nameOf(notification.consignee, lookup)
  })
}
