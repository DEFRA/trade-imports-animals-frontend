import {
  animalsCertifiedFor,
  commodityCode,
  contactAddress,
  containsUnweanedAnimals,
  placeOfOrigin,
  purposeInInternalMarket,
  reasonForImport
} from '../../../../obligations/index.js'
import { certificationPurposes } from '../../../../../../services/certification-purposes/index.js'
import * as commodities from '../../../../services/commodities/index.js'
import { TEMPLATE_NOT_CARRIED_OBLIGATION_IDS } from '../../flow/template-mode.js'

const FALLBACK_CERTIFIED_FOR = 'further-keeping'
const FALLBACK_UNWEANED = 'no'
const UNWEANED_ANSWERS = ['yes', 'no']
const INTERNAL_MARKET = 'internalMarket'

const without = (fulfilment, obligationIds) =>
  Object.fromEntries(
    Object.entries(fulfilment).filter(([id]) => !obligationIds.includes(id))
  )

const withoutNotCarried = (fulfilment) =>
  without(fulfilment, TEMPLATE_NOT_CARRIED_OBLIGATION_IDS)

const isOffered = (value) =>
  certificationPurposes().some((option) => option.value === value)

const withCertifiedFor = (fulfilment) => ({
  ...fulfilment,
  [animalsCertifiedFor.id]: isOffered(fulfilment[animalsCertifiedFor.id])
    ? fulfilment[animalsCertifiedFor.id]
    : FALLBACK_CERTIFIED_FOR
})

const asksUnweaned = (fulfilment) =>
  Object.values(fulfilment[commodityCode.id] ?? {}).some((code) =>
    commodities.unweanedCommodities().includes(code)
  )

const unweanedAnswer = (fulfilment) =>
  UNWEANED_ANSWERS.includes(fulfilment[containsUnweanedAnimals.id])
    ? fulfilment[containsUnweanedAnimals.id]
    : FALLBACK_UNWEANED

const withUnweaned = (fulfilment) =>
  asksUnweaned(fulfilment)
    ? {
        ...fulfilment,
        [containsUnweanedAnimals.id]: unweanedAnswer(fulfilment)
      }
    : without(fulfilment, [containsUnweanedAnimals.id])

const withPurposeOnlyForInternalMarket = (fulfilment) =>
  fulfilment[reasonForImport.id] === INTERNAL_MARKET
    ? fulfilment
    : without(fulfilment, [purposeInInternalMarket.id])

const withContactAddressOrPlaceOfOrigin = (fulfilment) =>
  fulfilment[contactAddress.id]?.name || !fulfilment[placeOfOrigin.id]?.name
    ? fulfilment
    : {
        ...fulfilment,
        [contactAddress.id]: structuredClone(fulfilment[placeOfOrigin.id])
      }

/**
 * The answers a new notification starts with when it is started from a
 * template. The template's answers are carried as they are, except that the
 * arrival date and every document are left out, "Certified for" falls back to
 * "Further keeping", the unweaned answer is "No" when the commodity asks for it
 * and the template has none, and the purpose is kept only for the internal
 * market. Where the template has no contact address, its place of origin is
 * the contact address.
 *
 * @param {object} fulfilment - the template's UUID-keyed answers. Not changed.
 * @returns {object} the new notification's UUID-keyed answers.
 */
export const notificationSeedFrom = (fulfilment) =>
  [
    withoutNotCarried,
    withCertifiedFor,
    withUnweaned,
    withPurposeOnlyForInternalMarket,
    withContactAddressOrPlaceOfOrigin
  ].reduce((seed, step) => step(seed), structuredClone(fulfilment))
