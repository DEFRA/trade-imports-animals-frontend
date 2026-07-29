import { projectAnswers } from '../../../../../bridge/fulfilments.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) return null
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const marshalListItem = (document) => {
  const answers = projectAnswers(decodePersistedFulfilment(document.fulfilment))
  const commodityName = answers.commodityLines?.[0]?.commoditySelection

  return {
    journeyId: document.id,
    status: document.status,
    createdAt: document.createdAt,
    submittedAt: document.submittedAt,
    reference: document.id,
    commodity: commodityName ? { name: commodityName } : null,
    originCountryCode: answers.countryOfOrigin ?? null,
    arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
    consignorName: answers.consignor?.name ?? null,
    consigneeName: answers.consignee?.name ?? null
  }
}
