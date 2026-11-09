import { addressBookCountryName } from '../countries/index.js'
import { COMMERCIAL, NEW, PRIVATE } from './records.js'
import {
  COMMERCIAL_TRANSPORTER_COUNTRY_CODE,
  COMMERCIAL_TRANSPORTER_COUNTRY_NAME
} from './commercial-country.js'
import { WIRE_COMMERCIAL } from './wire-types.js'

const isCommercial = (wireType) => wireType === WIRE_COMMERCIAL

/** The list row a transporter the address book returned renders as. A
 * commercial transporter's country is the fixed display word; a private
 * one's is resolved the way the address book's own records are. Every
 * address-book transporter is not yet approved: the address book carries no
 * approval status. */
export const transporterRowOf = async (wireTransporter) => ({
  id: wireTransporter.id,
  type: isCommercial(wireTransporter.type) ? COMMERCIAL : PRIVATE,
  status: NEW,
  name: wireTransporter.name,
  approvalNumber: wireTransporter.approvalNumber,
  address: {
    addressLine1: wireTransporter.addressLine1,
    addressLine2: wireTransporter.addressLine2,
    townOrCity: wireTransporter.townOrCity,
    county: wireTransporter.county,
    postcode: wireTransporter.postcode,
    country: isCommercial(wireTransporter.type)
      ? COMMERCIAL_TRANSPORTER_COUNTRY_NAME
      : await addressBookCountryName(wireTransporter.countryCode),
    countryCode: wireTransporter.countryCode,
    phone: wireTransporter.phone,
    email: wireTransporter.email
  }
})

const ADDRESS_FIELDS = [
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'phone',
  'email'
]

const addressFieldsOf = (address = {}) =>
  Object.fromEntries(
    ADDRESS_FIELDS.map((field) => [field, address[field] ?? ''])
  )

const countryCodeOf = (wireType, address) =>
  isCommercial(wireType)
    ? COMMERCIAL_TRANSPORTER_COUNTRY_CODE
    : (address?.countryCode ?? '')

const approvalNumberFieldOf = (party) =>
  party.approvalNumber ? { approvalNumber: party.approvalNumber } : {}

/** The address book's create body for a transporter saved from the journey.
 * A commercial transporter's country is the fixed stored code, never the
 * form's own address fields. */
export const wireTransporterOf = (party, wireType) => ({
  name: party.name,
  ...addressFieldsOf(party.address),
  countryCode: countryCodeOf(wireType, party.address),
  type: wireType,
  ...approvalNumberFieldOf(party)
})
