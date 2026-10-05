import { instantFromDateParts } from '../../../../../lib/validate/index.js'
import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { party } from '../../../../address-book/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { SUBMITTED } from '../../../../../engine/persistence/records.js'

/** Dashboard list names: references resolve from the stub book; inline answers
 * already carry the name. Mirrors `real/marshal/list-item.js`, which resolves the
 * same two names against the real book — the backend stores and returns the
 * reference either way. */
const nameOf = async (answer, status) => {
  if (!answer) {
    return null
  }
  if (status === SUBMITTED && answer.name) {
    return answer.name
  }
  if (answer.addressId && status !== SUBMITTED) {
    const record = await party(undefined, answer.addressId)
    return record && !record.deleted ? (record.name ?? null) : null
  }
  return answer.name ?? null
}

export const marshalListItem = async (document) => {
  const answers = projectAnswers(decodePersistedFulfilment(document.fulfilment))
  const commodityName = answers.commodityLines?.[0]?.commoditySelection
  const status = document.status

  return {
    journeyId: document.id,
    status,
    createdAt: document.createdAt,
    submittedAt: document.submittedAt,
    concurrencyToken: document.concurrencyToken ?? 0,
    reference: document.id,
    commodity: commodityName ? { name: commodityName } : null,
    originCountryCode: answers.countryOfOrigin ?? null,
    // The rest of this row uses null for absent, so the helper's undefined is
    // mapped across rather than changing the shape the stub has always sent.
    arrivalDate: instantFromDateParts(answers.arrivalDateAtPort) ?? null,
    consignorName: await nameOf(answers.consignor, status),
    consigneeName: await nameOf(answers.consignee, status)
  }
}
