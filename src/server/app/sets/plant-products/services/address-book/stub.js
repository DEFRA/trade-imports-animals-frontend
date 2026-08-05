import { CANNED_CONSIGNORS } from './canned-consignors.js'
import { readCreated, writeCreated } from './session-store.js'

// Canned because the data is canned, not because the module is mode-gated:
// there is no real plant address book to switch to, so this implementation
// serves the same catalogue whatever PLANT_PRODUCTS_MODE says.
const storedRecord = ({ id, name, telephone, email, address }) => ({
  id,
  name,
  telephone: telephone ?? '',
  email: email ?? '',
  address: { ...address }
})

export const list = async (request) => [
  ...CANNED_CONSIGNORS,
  ...readCreated(request)
]

export const find = async (request, id) =>
  (await list(request)).find((record) => record.id === id)

export const add = async (request, record) => {
  const created = readCreated(request)
  const stored = storedRecord({
    ...record,
    id: `created-consignor-${created.length + 1}`
  })
  writeCreated(request, [...created, stored])
  return stored
}

/** Rows per page of the picker's results table. Owned here, not by the page —
 * the address book owns its own search and pagination and the pages render
 * whatever comes back. */
export const PAGE_SIZE = 5

const haystack = (record) =>
  [record.name, ...Object.values(record.address ?? {})]
    .filter((part) => part)
    .join(' ')
    .toLowerCase()

/** The book's whole filter-and-slice contract in one pure function. Exported
 * because the picker pages a list that is the book's records plus the
 * consignor already on the notification, and that combined list has to be
 * paged by these same rules rather than by a second copy of them. */
export const searchRecords = (records, { query = '', page = 1 } = {}) => {
  const term = String(query ?? '')
    .trim()
    .toLowerCase()
  const matched = records.filter((record) => haystack(record).includes(term))
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

/** Free-text search over everything the book serves — the canned catalogue and
 * this session's created records — returning one page of matches. */
export const search = async (request, options) =>
  searchRecords(await list(request), options)
