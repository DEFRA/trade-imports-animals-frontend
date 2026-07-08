import {
  CONSIGNOR_OPTIONS,
  CONSIGNEE_OPTIONS,
  IMPORTER_OPTIONS,
  PLACE_OF_ORIGIN_OPTIONS,
  DESTINATION_OPTIONS,
  CONTACT_OPTIONS,
  COMMERCIAL_TRANSPORTER_OPTIONS
} from './stub.js'

// The saved parties keyed by the role each list fills, in reference-data
// order. Each record carries the full V4 Standard Address Block; the
// commercialTransporter records additionally carry an approvalNumber, so a
// copy-commit of the chosen record preserves every field.
const BY_ROLE = {
  consignor: CONSIGNOR_OPTIONS,
  consignee: CONSIGNEE_OPTIONS,
  importer: IMPORTER_OPTIONS,
  placeOfOrigin: PLACE_OF_ORIGIN_OPTIONS,
  destination: DESTINATION_OPTIONS,
  contact: CONTACT_OPTIONS,
  commercialTransporter: COMMERCIAL_TRANSPORTER_OPTIONS
}

/** The saved parties for a role, in reference-data order — for select options and validation membership. */
export const parties = (role) => BY_ROLE[role]

/** The single saved party record for a role and id, or undefined when unknown — the record to copy on selection. */
export const party = (role, id) =>
  BY_ROLE[role]?.find((option) => option.id === id)
