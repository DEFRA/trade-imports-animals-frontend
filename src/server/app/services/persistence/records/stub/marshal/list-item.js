import { isoDateFromDateParts } from '../../../../../lib/validate/index.js'
import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

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
    arrivalDate: isoDateFromDateParts(answers.arrivalDateAtPort) ?? null,
    consignorName: answers.consignor?.name ?? null,
    consigneeName: answers.consignee?.name ?? null
  }
}
