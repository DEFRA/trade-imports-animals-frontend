import { originLabel } from '../../../../../../services/countries/index.js'
import { PARTIES, CONTACT_PARTY } from './parties.js'

/** Backend role name to journey party id. The two vocabularies agree on every
 * role but two: the backend says `destination` where the journey says
 * `placeOfDestination`, and `consignment` where the journey says
 * `contactAddress`. */
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

/** One stored inline party in the shape the journey renders.
 *
 * Sibling of `toRecord` in services/address-book/client.js — same target shape,
 * different source. That one maps a live address-book record; this one maps a
 * party held inline on the notification, which nests its address block and keeps
 * the API's own names (`postcode`, `countryCode`, `phone`, `email`).
 *
 * A party with no name never made it onto the notification, so it renders as
 * "not provided" exactly like an unanswered one. */
export const toDisplayParty = (party) => {
  if (!party?.name) {
    return undefined
  }
  const address = party.address ?? {}
  return {
    id: party.addressId ?? null,
    name: party.name,
    address: {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      townOrCity: address.townOrCity,
      county: address.county,
      postalOrZipCode: address.postcode,
      country: originLabel(address.countryCode) ?? address.countryCode,
      telephoneNumber: party.phone,
      emailAddress: party.email
    }
  }
}

/** SUBMITTED render path — build display parties from stored inline answers. */
export const partiesFromStoredAnswers = (answers = {}) =>
  Object.fromEntries(
    JOURNEY_PARTY_IDS.map((partyId) => [
      partyId,
      toDisplayParty(answers[partyId])
    ])
  )
