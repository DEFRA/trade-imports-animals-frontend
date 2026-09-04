import { originLabel } from '../../../../../../services/countries/index.js'

/** Backend role name to journey party id. The two vocabularies agree on every
 * role but two: the backend says `destination` where the journey says
 * `placeOfDestination`, and `consignment` where the journey says
 * `contactAddress`. */
const PARTY_ID_BY_ROLE = {
  placeOfOrigin: 'placeOfOrigin',
  consignor: 'consignor',
  consignee: 'consignee',
  importer: 'importer',
  destination: 'placeOfDestination',
  consignment: 'contactAddress'
}

/** One frozen party in the shape the journey renders.
 *
 * Sibling of `toRecord` in services/address-book/client.js — same target shape,
 * different source. That one maps a live address-book record; this one maps a
 * party frozen onto the notification at submit, which nests its address block
 * and keeps the API's own names (`postcode`, `countryCode`, `phone`, `email`).
 *
 * A party with no name never made it onto the notification, so it renders as
 * "not provided" exactly like an unanswered one. */
const toDisplayParty = (party) => {
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

/** The parties a SUBMITTED notification renders: the details frozen onto it at
 * submit, keyed by journey party id.
 *
 * Deliberately resolves nothing. A submitted notification is part of the legal
 * record, so an address edited or deleted since must not change what it shows. */
export const frozenPartiesOf = (frozen) =>
  Object.fromEntries(
    Object.entries(PARTY_ID_BY_ROLE).map(([role, partyId]) => [
      partyId,
      toDisplayParty(frozen?.[role])
    ])
  )
