/** Nothing is listed until the trader has typed at least this many
 * characters — the reference list is far larger than the stub suggests, so an
 * unfiltered page is not a usable page. */
export const MIN_SEARCH_LENGTH = 3

export const normaliseQuery = (value) => String(value ?? '').trim()

export const isSearchable = (query) =>
  normaliseQuery(query).length >= MIN_SEARCH_LENGTH

const wordsOf = (text) =>
  Array.from(String(text ?? '').matchAll(/[a-z0-9]+/gi), (match) => ({
    word: match[0].toLowerCase(),
    start: match.index
  }))

const rangesOfRunFrom = (textWords, queryWords, start) =>
  queryWords.map((queryWord, offset) => {
    const textWord = textWords[start + offset]
    return {
      start: textWord.start,
      end: textWord.start + queryWord.word.length
    }
  })

const runMatchesFrom = (textWords, queryWords, start) =>
  queryWords.every((queryWord, offset) =>
    textWords[start + offset]?.word.startsWith(queryWord.word)
  )

/**
 * Where a query matches text: each place its words run as word-prefixes in
 * that text. So 'tau' matches 'Bos taurus' on its second word, and 'bos tau'
 * matches only where the two words run in that order.
 *
 * @param {string} text - the text being searched.
 * @param {string} query - what the trader typed.
 * @returns {Array<{start: number, end: number}>} the matched character ranges
 *   of the text, in order; empty when the query does not match.
 */
export const wordMatchRanges = (text, query) => {
  const queryWords = wordsOf(query)
  const textWords = wordsOf(text)
  if (queryWords.length === 0) {
    return []
  }
  const ranges = textWords
    .map((_word, start) => start)
    .filter((start) => runMatchesFrom(textWords, queryWords, start))
    .flatMap((start) => rangesOfRunFrom(textWords, queryWords, start))
  return ranges.filter(
    (range, index) => index === 0 || range.start >= ranges[index - 1].end
  )
}

export const matchesWords = (text, query) =>
  wordMatchRanges(text, query).length > 0

/** Commodity codes are digit strings, so they match on prefix rather than on
 * whole words — '010' narrows to the 0101/0102 range the way a trader expects. */
export const matchesCode = (code, query) =>
  String(code ?? '')
    .toLowerCase()
    .startsWith(normaliseQuery(query).toLowerCase())

export const codeMatchRanges = (code, query) => {
  const length = normaliseQuery(query).length
  return length > 0 && matchesCode(code, query)
    ? [{ start: 0, end: length }]
    : []
}
