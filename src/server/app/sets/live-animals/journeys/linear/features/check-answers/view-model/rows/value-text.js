import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

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

/** A blank date comes back blank, not as the placeholder. */
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

/** The value cell of an empty row on a finished card: the placeholder, marked
 * `empty: true`. */
export const notApplicableCell = () => ({ text: NOT_APPLICABLE, empty: true })

/** The value cell of an empty row inside a card that still has answers
 * outstanding: no visible text, and a visually hidden "missing" for a screen
 * reader. */
export const missingCell = () => ({
  html:
    '<span class="app-summary-list__value--missing">' +
    `<span class="govuk-visually-hidden">${escapeHtml(copy.missing)}</span>` +
    '</span>'
})
