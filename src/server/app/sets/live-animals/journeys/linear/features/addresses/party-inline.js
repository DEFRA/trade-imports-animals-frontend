import { countryCodeOf } from '../../../../../../services/countries/index.js'

/** Backend wire address from a journey or address-book display block. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postalOrZipCode ?? address.postcode,
  countryCode: address.countryCode ?? countryCodeOf(address.country)
})

/** Inline party shape persisted on the notification and in journey answers. */
export const answerForInlineParty = (chosen) => ({
  addressId: chosen.id,
  name: chosen.name,
  phone: chosen.address?.telephoneNumber,
  email: chosen.address?.emailAddress,
  address: toWireAddress(chosen.address ?? {})
})
