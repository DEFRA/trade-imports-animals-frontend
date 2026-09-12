import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/** The one placeholder Design release 1 writes against an empty value on a
 * finished card. Several row builders produce it, so it is not a signal on its
 * own: a trader can type it into a free-text answer. `notApplicableCell` marks
 * emptiness structurally instead. */
const NOT_APPLICABLE = copy.notApplicable

export const toArray = (value) => [value ?? []].flat()

export const valueText = (value) => {
  if (isBlank(value)) {
    return NOT_APPLICABLE
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  return value
}

/** A blank date comes back blank, not as the placeholder: every call site hands
 * the result straight to `row`, and writing the placeholder here would leave
 * `row` seeing a non-blank value and the empty date unmarked. Placing the
 * placeholder is `row`'s job. */
export const dateText = (value) =>
  isBlank(value) ? null : `${value.day}/${value.month}/${value.year}`

export const escapeHtml = (value) =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** The value cell of an empty row on a card that is finished: the placeholder,
 * plus `empty: true` as the mark that the row is empty. `blankEmptyValues` in
 * `incomplete-cards.js` keys on that flag rather than on the rendered text, so
 * a trader who types "Not applicable" into a free-text answer keeps it. */
export const notApplicableCell = () => ({ text: NOT_APPLICABLE, empty: true })

/** The value cell of an empty row inside a card that still has answers
 * outstanding. Design release 1 gives it no text at all: the cell is drawn in
 * the missing style and only a screen reader is told the answer is missing, so
 * a trader can see which rows are still owed without reading a word. */
export const missingCell = () => ({
  html:
    '<span class="app-summary-list__value--missing">' +
    `<span class="govuk-visually-hidden">${escapeHtml(copy.missing)}</span>` +
    '</span>'
})
