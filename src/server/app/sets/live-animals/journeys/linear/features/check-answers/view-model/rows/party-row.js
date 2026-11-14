import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml } from '../../../../../../../../../../shared/escape-html.js'
import { notApplicableCell } from './value-text.js'

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

const htmlLines = (namedAddress, extraParts) => {
  if (isBlank(namedAddress?.name)) {
    return null
  }
  return [
    `<strong>${escapeHtml(namedAddress.name)}</strong>`,
    ...[
      ...addressLines(namedAddress.address),
      namedAddress.address?.country,
      ...extraParts
    ]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

const addressWithoutContactLines = (permanentAddress) =>
  htmlLines(permanentAddress, [])

const partyLines = (party) =>
  htmlLines(party, [party?.address?.phone, party?.address?.email])

const errorMarkup = (errorText) =>
  '<p class="govuk-error-message">' +
  `<span class="govuk-visually-hidden">${escapeHtml(copy.errors.prefix)}</span> ` +
  `${escapeHtml(errorText)}</p>`

const valueCell = (lines, errorText) => {
  if (!lines) {
    return errorText ? { html: errorMarkup(errorText) } : notApplicableCell()
  }
  const details = lines.join('<br>')
  return { html: errorText ? errorMarkup(errorText) + details : details }
}

export const partyRow = (key, party, { errorText = null } = {}) => ({
  key: { text: key },
  value: valueCell(partyLines(party), errorText)
})

export const permanentAddressRow = (key, permanentAddress) => ({
  key: { text: key },
  value: valueCell(addressWithoutContactLines(permanentAddress), null)
})
