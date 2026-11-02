import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { escapeHtml } from '../../../../../../../../shared/escape-html.js'
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

/** A blank date comes back blank, not as "Not applicable". */
export const dateText = (value) =>
  isBlank(value) ? null : `${value.day}/${value.month}/${value.year}`

/** The "Not applicable" cell, marked `empty: true`. */
export const notApplicableCell = () => ({ text: NOT_APPLICABLE, empty: true })

/** A cell with no visible text and a visually hidden "Missing". */
export const missingCell = () => ({
  html: `<span class="govuk-visually-hidden">${escapeHtml(copy.missing)}</span>`
})
