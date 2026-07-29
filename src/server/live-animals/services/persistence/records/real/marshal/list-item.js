import { mapStatus } from '../status.js'

export const marshalListItem = (item) => ({
  journeyId: item.id,
  status: mapStatus(item.status),
  createdAt: item.createdAt ?? null,
  submittedAt: item.submittedAt ?? null,
  reference: item.reference,
  commodity: item.commodityDisplay,
  originCountryCode: item.originCountryCode,
  arrivalDate: item.arrivalDate,
  consignorName: item.consignorName,
  consigneeName: item.consigneeName
})
