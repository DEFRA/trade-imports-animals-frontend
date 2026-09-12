import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml } from './value-text.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

export const addressLines = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.townOrCity,
    address.county,
    address.postalOrZipCode
  ].filter((part) => !isBlank(part))

export const partyLines = (party) => {
  if (isBlank(party?.name)) {
    return null
  }
  return [
    `<strong>${escapeHtml(party.name)}</strong>`,
    ...[...addressLines(party.address), party.address?.country]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

/** A summary list has no error state of its own, so an outstanding role carries
 * the error-message markup inside its value cell — the same class, and the same
 * visually-hidden prefix, that govukErrorMessage renders on a form field. */
const errorCell = (errorText) => ({
  html:
    '<p class="govuk-error-message">' +
    `<span class="govuk-visually-hidden">${escapeHtml(copy.errors.prefix)}</span> ` +
    `${escapeHtml(errorText)}</p>`
})

/** Resolved lines win over `errorText`: a role that has details to show renders
 * them, and the error is dropped. The two never arrive together in practice —
 * `outstandingPartyErrors` only raises an error for a role that resolved to
 * nothing, which is exactly the case where `partyLines` returns `null`. */
const valueCell = (lines, errorText) => {
  if (lines) {
    return { html: lines.join('<br>') }
  }
  return errorText ? errorCell(errorText) : { text: NOT_PROVIDED }
}

/** A key and a value with no Change link of its own, like an ordinary row — the
 * card that holds the role carries the one link to the page that collects it. */
export const partyRow = (key, party, { errorText = null } = {}) => ({
  key: { text: key },
  value: valueCell(partyLines(party), errorText)
})
