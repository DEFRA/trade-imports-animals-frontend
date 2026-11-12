import { matchPositions } from './search-fold.js'
import { escapeHtml } from '../../../shared/escape-html.js'

const strongMatch = (text) =>
  `<strong class="govuk-!-font-weight-bold">${escapeHtml(text)}</strong>`

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
