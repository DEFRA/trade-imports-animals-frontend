import {
  CONSIGNOR_OPTIONS,
  CONSIGNEE_OPTIONS,
  IMPORTER_OPTIONS,
  PLACE_OF_ORIGIN_OPTIONS,
  DESTINATION_OPTIONS,
  CONTACT_OPTIONS,
  COMMERCIAL_TRANSPORTER_OPTIONS
} from './stub.js'

const BY_ROLE = {
  consignor: CONSIGNOR_OPTIONS,
  consignee: CONSIGNEE_OPTIONS,
  importer: IMPORTER_OPTIONS,
  placeOfOrigin: PLACE_OF_ORIGIN_OPTIONS,
  destination: DESTINATION_OPTIONS,
  contact: CONTACT_OPTIONS,
  commercialTransporter: COMMERCIAL_TRANSPORTER_OPTIONS
}

export const parties = (role) => BY_ROLE[role]

export const party = (role, id) =>
  BY_ROLE[role]?.find((option) => option.id === id)
