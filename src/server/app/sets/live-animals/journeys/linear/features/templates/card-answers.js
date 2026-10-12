import {
  commodityCode,
  consignee,
  consignor,
  countryOfOrigin
} from '../../../../obligations/index.js'
import * as countries from '../../../../../../services/countries/index.js'
import { decodePersistedFulfilment } from '../../../../../../services/persistence/records/fulfilment-codec/index.js'
import { isBlank } from '../../../../../../lib/answered.js'

const COMMODITY_SEPARATOR = ', '

const commodityNames = (answers) =>
  [
    ...new Set(
      Object.values(answers[commodityCode.id] ?? {}).filter(
        (name) => !isBlank(name)
      )
    )
  ].join(COMMODITY_SEPARATOR)

const originName = (answers) =>
  countries.originDisplayLabel(answers[countryOfOrigin.id])

const partyName = (answers, party) => answers[party.id]?.name ?? ''

/**
 * The four answers a template's card on Manage templates summarises it by:
 * the common name of each commodity, the country of origin, and the consignee's
 * and consignor's names. An answer the template does not hold is an empty
 * string.
 *
 * @param {object[]} [fulfilments] - the template's encoded answers, as the list returns them
 * @returns {Promise<{ commodity: string, origin: string, consignee: string, consignor: string }>} the four answers
 */
export const cardAnswersFor = async (fulfilments = []) => {
  const answers = decodePersistedFulfilment(fulfilments)
  return {
    commodity: commodityNames(answers),
    origin: (await originName(answers)) ?? '',
    consignee: partyName(answers, consignee),
    consignor: partyName(answers, consignor)
  }
}
