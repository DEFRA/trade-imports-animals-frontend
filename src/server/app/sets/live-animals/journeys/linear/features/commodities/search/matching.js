/** Nothing is listed until the trader has typed at least this many
 * characters — the reference list is far larger than the stub suggests, so an
 * unfiltered page is not a usable page. */
export const MIN_SEARCH_LENGTH = 3

export const normaliseQuery = (value) => String(value ?? '').trim()

export const isSearchable = (query) =>
  normaliseQuery(query).length >= MIN_SEARCH_LENGTH

const wordsOf = (text) =>
  String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

/**
 * A query matches text when its words are a run of word-prefixes in that text.
 * So 'tau' matches 'Bos taurus' on its second word, and 'bos tau' matches only
 * where the two words run in that order.
 *
 * @param {string} text - the text being searched.
 * @param {string} query - what the trader typed.
 * @returns {boolean} whether the query matches.
 */
export const matchesWords = (text, query) => {
  const queryWords = wordsOf(query)
  const textWords = wordsOf(text)
  if (queryWords.length === 0) {
    return false
  }
  const matchesFromStart = (start) =>
    queryWords.every((word, offset) =>
      textWords[start + offset]?.startsWith(word)
    )
  return textWords.some((_word, start) => matchesFromStart(start))
}

/** Commodity codes are digit strings, so they match on prefix rather than on
 * whole words — '010' narrows to the 0101/0102 range the way a trader expects. */
export const matchesCode = (code, query) =>
  String(code ?? '')
    .toLowerCase()
    .startsWith(normaliseQuery(query).toLowerCase())
