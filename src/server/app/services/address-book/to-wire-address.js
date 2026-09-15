/** Backend wire address from a journey or address-book display block.
 *
 * Every source of an address that persists — the private-transporter form,
 * saved address-book records via toRecord, party-picker selections — commits
 * the ISO code as `countryCode`. The mapper carries that code through
 * verbatim, so persistence has no dependency on reference data. */
export const toWireAddress = (address = {}) => ({
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  townOrCity: address.townOrCity,
  county: address.county,
  postcode: address.postalOrZipCode ?? address.postcode,
  countryCode: address.countryCode
})
