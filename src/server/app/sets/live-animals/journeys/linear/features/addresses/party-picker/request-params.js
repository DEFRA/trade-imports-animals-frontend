export const pageNumber = (value) => {
  const number = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(number) ? 1 : number
}

export const isSearchAction = (payload) => payload.action === 'search'
