const numbersToShow = (page, totalPages) => {
  const shown = [1, page - 1, page, page + 1, totalPages].filter(
    (number) => number >= 1 && number <= totalPages
  )
  return [...new Set(shown)].sort((a, b) => a - b)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.reduce(
    (acc, number) => {
      const items =
        number - acc.last > 1 ? [...acc.items, { ellipsis: true }] : acc.items
      return {
        items: [
          ...items,
          { number, href: hrefFor(number), current: number === page }
        ],
        last: number
      }
    },
    { items: [], last: 0 }
  ).items

export const paginationItems = (page, totalPages, hrefFor) =>
  itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)
