import { isRealMode } from '../mode.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../lib/http-status.js'
import * as client from './client.js'
import { STUB_BOOK } from './stub/index.js'

/** Rows per page of the picker's results table (design 05-03..06). Owned here,
 * not by the pages — the address book owns its own search and pagination, and
 * the API's page size is server-owned (cv-025), so this service re-slices an
 * API page down to this size rather than asking for it. */
export const PAGE_SIZE = 5

/** Addresses have no type in the address book (D3) — the same record may be a
 * consignor on one notification and a consignee on the next. So every picker
 * searches one book, and no function here takes a role. What a picker does
 * with the record it gets back is the page's business, not the book's. */

// Stub mode only: records created in-journey during this process's lifetime.
const created = []

const stubBook = () => [...STUB_BOOK, ...created]

const haystack = (record) =>
  [record.name, ...Object.values(record.address ?? {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const pageOf = (records, requested) => {
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE))
  const current =
    Number.isInteger(requested) && requested >= 1 && requested <= totalPages
      ? requested
      : 1
  const from = (current - 1) * PAGE_SIZE
  return {
    results: records.slice(from, from + PAGE_SIZE),
    total: records.length,
    page: current,
    totalPages,
    pageSize: PAGE_SIZE
  }
}

const searchStub = (query, requested) => {
  const term = query.trim().toLowerCase()
  return pageOf(
    stubBook().filter((record) => haystack(record).includes(term)),
    requested
  )
}

/** One page of ours, cut out of one page of theirs. Their page holds
 * `API_PAGE_SIZE` records and ours holds `PAGE_SIZE`, so a page of ours falls
 * entirely inside a single page of theirs — no straddling, no second call. */
const sliceAt = async (orgId, query, requested) => {
  const offset = (requested - 1) * PAGE_SIZE
  let apiPage = Math.floor(offset / client.API_PAGE_SIZE) + 1
  let found = await client.listAddresses(orgId, { page: apiPage, query })

  // The server owns its page size. If it is not what we assumed, the page we
  // just asked for was the wrong one — redo the arithmetic with the real size.
  if (found.pageSize > 0 && found.pageSize !== client.API_PAGE_SIZE) {
    apiPage = Math.floor(offset / found.pageSize) + 1
    found = await client.listAddresses(orgId, { page: apiPage, query })
  }

  const within = offset - (apiPage - 1) * found.pageSize
  return {
    results: found.records.slice(within, within + PAGE_SIZE),
    total: found.totalItems,
    page: requested,
    totalPages: Math.max(1, Math.ceil(found.totalItems / PAGE_SIZE)),
    pageSize: PAGE_SIZE
  }
}

/** An out-of-range page falls back to the first — the book decides what a page
 * is, the pages only render what comes back. The API rejects an out-of-range
 * page with a 400, so that is a fallback and not an error. */
const searchReal = async (orgId, query, requested) => {
  try {
    const found = await sliceAt(orgId, query, requested)
    if (requested <= found.totalPages) {
      return found
    }
  } catch (error) {
    if (error.status !== HTTP_STATUS_BAD_REQUEST) {
      throw error
    }
  }
  return sliceAt(orgId, query, 1)
}

/** Free-text search over the organisation's book, returning one page. */
export const search = async (orgId, { query = '', page = 1 } = {}) => {
  const requested = Number.isInteger(page) && page >= 1 ? page : 1
  return isRealMode()
    ? searchReal(orgId, query, requested)
    : searchStub(query, requested)
}

/** Every address the organisation has saved, unpaginated — for the contact
 * picker, which renders a flat radio list rather than a searchable table. */
export const all = async (orgId) => {
  if (!isRealMode()) {
    return stubBook()
  }

  const first = await client.listAddresses(orgId, { page: 1 })
  if (first.totalPages <= 1) {
    return first.records
  }

  // Page 1 is already in hand, so the rest start at 2.
  const FIRST_REMAINING_PAGE = 2
  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, index) =>
      client.listAddresses(orgId, { page: index + FIRST_REMAINING_PAGE })
    )
  )
  return [...first.records, ...rest.flatMap((found) => found.records)]
}

/** One address by id. Resolves to undefined when the record does not exist for
 * this organisation; a soft-deleted record comes back with `deleted: true` so
 * callers can treat a deletion as "never entered" without mistaking an outage
 * for one. */
export const party = async (orgId, id) => {
  if (!isRealMode()) {
    return stubBook().find((record) => record.id === id)
  }
  return client.getAddress(orgId, id)
}

/** Save a new address to the organisation's book and return it, id included —
 * the journey commits that id as its reference. */
export const addParty = async (orgId, record) => {
  if (!isRealMode()) {
    const saved = {
      ...record,
      id: `created-${created.length + 1}`,
      deleted: false
    }
    created.push(saved)
    return saved
  }
  return client.createAddress(orgId, record)
}
