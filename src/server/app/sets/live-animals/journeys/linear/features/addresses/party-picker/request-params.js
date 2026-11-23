export const pageNumber = (value) => {
  const requested = Number.parseInt(value ?? '', 10)
  return Number.isInteger(requested) && requested >= 1 ? requested : 1
}

export const isSearchAction = (payload) => payload.action === 'search'
