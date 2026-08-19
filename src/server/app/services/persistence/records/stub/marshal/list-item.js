import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

const YEAR_DIGITS = 4
const MONTH_DIGITS = 2
const DAY_DIGITS = 2

export const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) {
    return null
  }
  return `${String(year).padStart(YEAR_DIGITS, '0')}-${String(month).padStart(MONTH_DIGITS, '0')}-${String(day).padStart(DAY_DIGITS, '0')}`
}

export const marshalListItem = (document) => {
  const answers = projectAnswers(decodePersistedFulfilment(document.fulfilment))
  const commodityName = answers.commodityLines?.[0]?.commoditySelection

  return {
    journeyId: document.id,
    status: document.status,
    createdAt: document.createdAt,
    submittedAt: document.submittedAt,
    concurrencyToken: document.concurrencyToken ?? 0,
    reference: document.id,
    commodity: commodityName ? { name: commodityName } : null,
    originCountryCode: answers.countryOfOrigin ?? null,
    arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
    consignorName: answers.consignor?.name ?? null,
    consigneeName: answers.consignee?.name ?? null
  }
}
