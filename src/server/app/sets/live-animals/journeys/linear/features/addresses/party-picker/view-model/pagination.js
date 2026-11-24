/** How many of the addresses a picker found one page holds. */
export const ADDRESSES_A_PAGE = 8

export const FIRST_PAGE = 1

const A_WHOLE_NUMBER = /^\d+$/

/** The page a query string asks for, or nothing when what it asks for is not
 * a page a picker can serve. */
export const pageAskedFor = (value) => {
  if (!A_WHOLE_NUMBER.test(value ?? '')) {
    return undefined
  }
  const asked = Number(value)
  return asked >= FIRST_PAGE ? asked : undefined
}

export const pageCountOf = (addressesFound) =>
  Math.max(FIRST_PAGE, Math.ceil(addressesFound / ADDRESSES_A_PAGE))

export const servedPageOf = (requestedPage, addressesFound) =>
  Math.min(requestedPage, pageCountOf(addressesFound))

export const addressesOnPage = (addresses, page) => {
  const from = (page - FIRST_PAGE) * ADDRESSES_A_PAGE
  return addresses.slice(from, from + ADDRESSES_A_PAGE)
}

const numbersToShow = (page, totalPages) => {
  const eitherSideOfCurrent = 1
  const shown = [
    FIRST_PAGE,
    page - eitherSideOfCurrent,
    page,
    page + eitherSideOfCurrent,
    totalPages
  ].filter((number) => number >= FIRST_PAGE && number <= totalPages)
  return [...new Set(shown)].sort((left, right) => left - right)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.flatMap((number, index, shown) => {
    const item = { number, href: hrefFor(number), current: number === page }
    const skipsPages = index > 0 && number - shown[index - 1] > 1
    return skipsPages ? [{ ellipsis: true }, item] : [item]
  })

/** The `govukPagination` view model for a picker, or nothing when one page
 * holds every address it found. `hrefFor` gives the results link for a page. */
export const paginationLinks = ({ page, totalPages, labels }, hrefFor) => {
  const minimumPagesToPaginate = 2
  if (totalPages < minimumPagesToPaginate) {
    return null
  }
  return {
    previous:
      page > FIRST_PAGE
        ? { href: hrefFor(page - 1), text: labels.previous }
        : undefined,
    next:
      page < totalPages
        ? { href: hrefFor(page + 1), text: labels.next }
        : undefined,
    items: itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
  }
}
