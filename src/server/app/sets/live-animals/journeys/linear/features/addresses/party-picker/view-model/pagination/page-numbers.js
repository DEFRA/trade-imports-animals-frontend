const FIRST_PAGE = 1
const PAGES_EITHER_SIDE_OF_CURRENT = 1

const numbersToShow = (page, totalPages) => {
  const shown = [
    FIRST_PAGE,
    page - PAGES_EITHER_SIDE_OF_CURRENT,
    page,
    page + PAGES_EITHER_SIDE_OF_CURRENT,
    totalPages
  ].filter((number) => number >= FIRST_PAGE && number <= totalPages)
  return [...new Set(shown)].sort((left, right) => left - right)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.flatMap((number, index, shown) => {
    const item = {
      number,
      href: hrefFor(number),
      current: number === page
    }
    const skipsPages = index > 0 && number - shown[index - 1] > 1
    return skipsPages ? [{ ellipsis: true }, item] : [item]
  })

export const paginationItems = (page, totalPages, hrefFor) =>
  itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
