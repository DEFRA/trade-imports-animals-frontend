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

/** Rows per page of the picker's results table (design 05-03..06: 40 records
 * over 8 pages). Owned here, not by the pages — the address book owns its own
 * search and pagination. */
export const PAGE_SIZE = 5

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

const haystack = (record) =>
  [record.name, ...Object.values(record.address ?? {})]
    .filter((part) => part)
    .join(' ')
    .toLowerCase()

/** Free-text search over a role's book (name, address or country), returning
 * one page of matches. An out-of-range page falls back to the first — the book
 * decides what a page is, the pages only render what comes back. */
export const search = (role, { query = '', page = 1 } = {}) => {
  const term = query.trim().toLowerCase()
  const matched = parties(role).filter((record) =>
    haystack(record).includes(term)
  )
  const totalPages = Math.max(1, Math.ceil(matched.length / PAGE_SIZE))
  const current =
    Number.isInteger(page) && page >= 1 && page <= totalPages ? page : 1
  const from = (current - 1) * PAGE_SIZE
  return {
    results: matched.slice(from, from + PAGE_SIZE),
    total: matched.length,
    page: current,
    totalPages,
    pageSize: PAGE_SIZE
  }
}
