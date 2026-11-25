export const FIRST_PAGE = 1

const A_WHOLE_NUMBER = /^\d+$/

export const pageAskedFor = (value) => {
  if (!A_WHOLE_NUMBER.test(value ?? '')) {
    return undefined
  }
  const asked = Number(value)
  return asked >= FIRST_PAGE ? asked : undefined
}

export const previousAndNextLinks = ({ page, totalPages, labels }, hrefFor) => {
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
        : undefined
  }
}
