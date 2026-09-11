import { countryCodeOf } from '../countries/index.js'

// An unrecognised code is displayed as the raw code (see toRecord), so it has
// to survive the trip back rather than being lost as an unknown name.
const ISO_ALPHA_2 = /^[A-Z]{2}$/

const countryCodeFrom = (country) =>
  countryCodeOf(country) ??
  (ISO_ALPHA_2.test(country ?? '') ? country : undefined)

/** Backend wire address from a journey or address-book display block. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postalOrZipCode ?? address.postcode,
  countryCode: address.countryCode ?? countryCodeFrom(address.country)
})
