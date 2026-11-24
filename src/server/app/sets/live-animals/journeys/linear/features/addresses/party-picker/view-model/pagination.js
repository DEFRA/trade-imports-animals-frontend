import {
  FIRST_PAGE,
  previousAndNextLinks
} from '../../../../../../../../shared/paging.js'

export const ADDRESSES_A_PAGE = 8

export const pageCountOf = (addressesFoundCount) =>
  Math.max(FIRST_PAGE, Math.ceil(addressesFoundCount / ADDRESSES_A_PAGE))

export const servedPageOf = (requestedPage, addressesFoundCount) =>
  Math.min(requestedPage, pageCountOf(addressesFoundCount))

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

export const paginationLinks = ({ page, totalPages, labels }, hrefFor) => {
  const links = previousAndNextLinks({ page, totalPages, labels }, hrefFor)
  if (links === null) {
    return null
  }
  return {
    ...links,
    items: itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
  }
}
