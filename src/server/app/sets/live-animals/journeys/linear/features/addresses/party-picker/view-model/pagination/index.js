import { paginationItems } from './page-numbers.js'
import { resultsHref } from './results-href.js'

const MINIMUM_PAGES_TO_PAGINATE = 2

export const pagination = (
  journeyId,
  party,
  { query, page, totalPages, selectedId, changing }
) => {
  if (totalPages < MINIMUM_PAGES_TO_PAGINATE) {
    return null
  }
  const hrefFor = (number) =>
    resultsHref(journeyId, party, {
      query,
      page: number,
      selectedId,
      changing
    })
  return {
    previous: page > 1 ? { href: hrefFor(page - 1) } : undefined,
    next: page < totalPages ? { href: hrefFor(page + 1) } : undefined,
    items: paginationItems(page, totalPages, hrefFor)
  }
}
