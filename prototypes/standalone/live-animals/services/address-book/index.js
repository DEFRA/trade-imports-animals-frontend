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

const created = new Map()

export const parties = (role) => [
  ...(BY_ROLE[role] ?? []),
  ...(created.get(role) ?? [])
]

export const party = (role, id) =>
  parties(role).find((option) => option.id === id)

export const addParty = (role, { name, address }) => {
  const entries = created.get(role) ?? []
  const record = {
    id: `created-${role}-${entries.length + 1}`,
    name,
    address: { ...address }
  }
  created.set(role, [...entries, record])
  return record
}
