import { addressBookCountryName } from '../../../../../../services/countries/index.js'
import { PARTIES, CONTACT_PARTY } from './parties.js'

export const PARTY_ID_BY_ROLE = {
  placeOfOrigin: 'placeOfOrigin',
  consignor: 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  destination: 'placeOfDestination',
  consignment: 'contactAddress'
}

const JOURNEY_PARTY_IDS = [
  ...PARTIES.map((party) => party.id),
  CONTACT_PARTY.id
]

/** The stored inline party in the shape the journey renders, or nothing when it has no name. */
export const toDisplayParty = async (party) => {
  if (!party?.name) {
    return undefined
  }
  const address = party.address ?? {}
  return {
    name: party.name,
    address: {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      townOrCity: address.townOrCity,
      county: address.county,
      postcode: address.postcode,
      country: await addressBookCountryName(address.countryCode),
      phone: party.phone,
      email: party.email
    }
  }
}

export const partiesFromStoredAnswers = async (answers = {}) => {
  const entries = await Promise.all(
    JOURNEY_PARTY_IDS.map(async (partyId) => [
      partyId,
      await toDisplayParty(answers[partyId])
    ])
  )
  return Object.fromEntries(entries)
}
