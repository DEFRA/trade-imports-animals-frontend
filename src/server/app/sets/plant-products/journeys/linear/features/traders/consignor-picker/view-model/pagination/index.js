import { paginationItems } from './page-numbers.js'
import { resultsHref } from './results-href.js'

export const pagination = (
  journeyId,
  { query, page, totalPages, selectedId }
) => {
  if (totalPages < 2) {
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
