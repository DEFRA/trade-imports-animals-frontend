export const MIN_SEARCH_LENGTH = 3

export const normaliseQuery = (value) => String(value ?? '').trim()

export const isSearchable = (query) =>
  normaliseQuery(query).length >= MIN_SEARCH_LENGTH
