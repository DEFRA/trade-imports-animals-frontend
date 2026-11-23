import { paginationItems } from './page-numbers.js'
import { resultsHref } from '../results-href.js'

/** How many of a role's addresses one page of the picker holds. */
export const ADDRESSES_A_PAGE = 8

const FIRST_PAGE = 1
const MINIMUM_PAGES_TO_PAGINATE = 2

export const pageCountOf = (addressesFound) =>
  Math.max(FIRST_PAGE, Math.ceil(addressesFound / ADDRESSES_A_PAGE))

/** The page the picker serves for the one asked for: the last page when the
 * request is past it. */
export const servedPageOf = (requestedPage, addressesFound) =>
  Math.min(requestedPage, pageCountOf(addressesFound))

export const addressesBeforePage = (page) =>
  (page - FIRST_PAGE) * ADDRESSES_A_PAGE

export const addressesOnPage = (addresses, page) => {
  const from = addressesBeforePage(page)
  return addresses.slice(from, from + ADDRESSES_A_PAGE)
}

/** The `govukPagination` view model for a picker, or nothing when one page
 * holds every address the role's list offers. */
export const paginationLinks = (
  journeyId,
  party,
  { query, page, totalPages, selectedId, trail, labels }
) => {
  if (totalPages < MINIMUM_PAGES_TO_PAGINATE) {
    return null
  }
  const hrefFor = (number) =>
    resultsHref(journeyId, party, { query, page: number, selectedId, trail })
  return {
    previous:
      page > FIRST_PAGE
        ? { href: hrefFor(page - 1), text: labels.previous }
        : undefined,
    next:
      page < totalPages
        ? { href: hrefFor(page + 1), text: labels.next }
        : undefined,
    items: paginationItems(page, totalPages, hrefFor)
  }
}
