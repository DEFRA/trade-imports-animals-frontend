export const LIST_PAGE_SIZE = 20

export const validPage = (page) =>
  Number.isInteger(page) && page > 0 ? page : 1

export const sortByCreatedAt = (sort) => {
  const direction = sort?.endsWith(',asc') ? 1 : -1
  return (left, right) =>
    direction * left.createdAt.localeCompare(right.createdAt)
}
