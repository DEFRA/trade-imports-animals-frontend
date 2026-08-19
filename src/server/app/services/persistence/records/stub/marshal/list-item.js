import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { party } from '../../../../address-book/index.js'
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

/** Dashboard list names: references resolve from the stub book; inline answers
 * already carry the name. Mirrors `real/marshal/list-item.js`, which resolves the
 * same two names against the real book — the backend stores and returns the
 * reference either way. */
const nameOf = async (answer) => {
  if (!answer) {
    return null
  }
  if (answer.addressId) {
    const record = await party(undefined, answer.addressId)
    return record && !record.deleted ? (record.name ?? null) : null
  }
  return answer.name ?? null
}

export const marshalListItem = async (document) => {
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
    consignorName: await nameOf(answers.consignor),
    consigneeName: await nameOf(answers.consignee)
  }
}
