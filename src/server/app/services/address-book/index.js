import { isStubMode } from '../../../common/services/mode.js'
import * as client from './client.js'
import { STUB_BOOK } from './stub/index.js'

/** Addresses are read-only here: the notification journey selects from the
 * organisation's book, and adding, changing and removing an address belongs
 * to the INS frontend. A transporter the journey adds is written here
 * instead, through `services/transporters`, because the journey is where it
 * is entered. */

const haystack = (record) =>
  [record.name, ...Object.values(record.address ?? {})]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

const matchesSearch = (record, query) =>
  haystack(record).includes(query.trim().toLowerCase())

const holdsRole = (record, role) =>
  !role || record.roles.length === 0 || record.roles.includes(role)

const pageNumbersFrom = (first, last) =>
  Array.from({ length: last - first + 1 }, (_, index) => first + index)

const readEveryLivePage = async (orgId, query) => {
  const PAGES_READ_AT_ONCE = 4
  const readPage = (page) =>
    client.listAddresses(orgId, {
      page,
      pageSize: client.MAX_API_PAGE_SIZE,
      query
    })
  const first = await readPage(1)
  const records = [...first.records]
  for (
    let batchStart = 2;
    batchStart <= first.totalPages;
    batchStart += PAGES_READ_AT_ONCE
  ) {
    const batchEnd = Math.min(
      batchStart + PAGES_READ_AT_ONCE - 1,
      first.totalPages
    )
    const batch = await Promise.all(
      pageNumbersFrom(batchStart, batchEnd).map(readPage)
    )
    records.push(...batch.flatMap((found) => found.records))
  }
  return records
}

/** The organisation's live addresses matching an optional search term,
 * narrowed to an optional role: a record holding that role, or holding no
 * role at all, matches; with no role given, every matching record does. */
export const addresses = async (orgId, { query = '', role } = {}) => {
  const matching = isStubMode()
    ? STUB_BOOK.filter((record) => matchesSearch(record, query))
    : await readEveryLivePage(orgId, query)
  return matching.filter((record) => holdsRole(record, role))
}

/** One address by id. Resolves to undefined when the record does not exist for
 * this organisation; a soft-deleted record comes back with `deleted: true` so
 * callers can treat a deletion as "never entered" without mistaking an outage
 * for one. */
export const party = async (orgId, id) => {
  if (isStubMode()) {
    return STUB_BOOK.find((record) => record.id === id)
  }
  return client.getAddress(orgId, id)
}
