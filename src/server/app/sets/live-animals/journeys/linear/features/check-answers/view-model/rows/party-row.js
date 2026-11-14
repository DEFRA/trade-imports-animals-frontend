import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml } from '../../../../../../../../../../shared/escape-html.js'
import { addressParts } from '../../../addresses/party-picker/view-model/address-lines.js'
import { notApplicableCell } from './value-text.js'

const copy = copyFor({ en, cy })

const htmlLines = (namedAddress) => {
  if (isBlank(namedAddress?.name)) {
    return null
  }
  return [
    `<strong>${escapeHtml(namedAddress.name)}</strong>`,
    ...[...addressParts(namedAddress.address), namedAddress.address?.country]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

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
  value: valueCell(htmlLines(party), errorText)
})
