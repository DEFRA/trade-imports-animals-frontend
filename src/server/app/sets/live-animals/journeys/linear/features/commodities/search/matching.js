/** Nothing is listed until the trader has typed at least this many
 * characters — MDM's species list runs to thousands, so an unfiltered page is
 * not a usable page. */
export const MIN_SEARCH_LENGTH = 3

export const SEARCH_PAGE_SIZE = 10

export const normaliseQuery = (value) => String(value ?? '').trim()

export const isSearchable = (query) =>
  normaliseQuery(query).length >= MIN_SEARCH_LENGTH
