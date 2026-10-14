import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml, notApplicableCell } from './value-text.js'

const copy = copyFor({ en, cy })

export const addressLines = (address = {}) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.addressLine3,
    address.townOrCity,
    address.county,
    address.postcode
  ].filter((part) => !isBlank(part))

export const partyLines = (party) => {
  if (isBlank(party?.name)) {
    return null
  }
  return [
    `<strong>${escapeHtml(party.name)}</strong>`,
    ...[
      ...addressLines(party.address),
      party.address?.country,
      party.address?.phone,
      party.address?.email
    ]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

/** A summary list has no error state of its own, so a role in error carries
 * the error-message markup inside its value cell — the same class, and the same
 * visually-hidden prefix, that govukErrorMessage renders on a form field. */
const errorMarkup = (errorText) =>
  '<p class="govuk-error-message">' +
  `<span class="govuk-visually-hidden">${escapeHtml(copy.errors.prefix)}</span> ` +
  `${escapeHtml(errorText)}</p>`

/** An address that breaks the address-book rules still shows, under its error,
 * so the trader can see what needs correcting. */
const valueCell = (lines, errorText) => {
  if (!lines) {
    return errorText ? { html: errorMarkup(errorText) } : notApplicableCell()
  }
  const details = lines.join('<br>')
  return { html: errorText ? errorMarkup(errorText) + details : details }
}

/** The card holds the one Change link; this row adds only Edit details. */
const editAction = (lines, editHref, key) =>
  lines && editHref
    ? {
        actions: {
          items: [
            {
              href: editHref,
              text: copy.editDetails,
              visuallyHiddenText: key.toLowerCase()
            }
          ]
        }
      }
    : {}

export const partyRow = (key, party, { errorText = null, editHref } = {}) => {
  const lines = partyLines(party)
  return {
    key: { text: key },
    value: valueCell(lines, errorText),
    ...editAction(lines, editHref, key)
  }
}
