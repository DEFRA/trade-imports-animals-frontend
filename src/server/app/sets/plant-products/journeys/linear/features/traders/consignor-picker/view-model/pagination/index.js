import { paginationItems } from './page-numbers.js'
import { resultsHref } from './results-href.js'

const MIN_PAGES_TO_SHOW_PAGINATION = 2

export const pagination = (
  journeyId,
  { query, page, totalPages, selectedId }
) => {
  if (totalPages < MIN_PAGES_TO_SHOW_PAGINATION) {
    return null
  }

  const hrefFor = (number) =>
    resultsHref(journeyId, { query, page: number, selectedId })

  return {
    previous: page > 1 ? { href: hrefFor(page - 1) } : undefined,
    next: page < totalPages ? { href: hrefFor(page + 1) } : undefined,
    items: paginationItems(page, totalPages, hrefFor)
  }
}
