import { matchPositions } from './search-fold.js'

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char])

const MATCH_CLASS = 'govuk-!-font-weight-bold'

const strongMatch = (text) =>
  `<strong class="${MATCH_CLASS}">${escapeHtml(text)}</strong>`

/** The text as safe HTML, with each place the search term matches (ignoring
 * case and accents) wrapped in a bold `<strong>`. */
export const escapeAndBoldMatches = (text, term) => {
  const positions = matchPositions(text, term)
  const pieces = positions.flatMap(({ start, end }, index) => {
    const previousEnd = positions[index - 1]?.end ?? 0
    return [
      escapeHtml(text.slice(previousEnd, start)),
      strongMatch(text.slice(start, end))
    ]
  })
  const lastEnd = positions.at(-1)?.end ?? 0
  return [...pieces, escapeHtml(text.slice(lastEnd))].join('')
}
