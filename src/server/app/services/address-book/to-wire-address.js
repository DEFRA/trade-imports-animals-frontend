import { countryCodeOf } from '../countries/index.js'

/** Backend wire address from a journey or address-book display block. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postalOrZipCode ?? address.postcode,
  countryCode: address.countryCode ?? countryCodeOf(address.country)
})
