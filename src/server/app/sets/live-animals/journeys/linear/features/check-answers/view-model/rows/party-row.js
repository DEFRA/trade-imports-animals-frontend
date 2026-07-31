import { isBlank } from '../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { changeAction, editableActions } from './change-link.js'
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
  if (isBlank(party?.name)) return null
  return [
    `<strong>${escapeHtml(party.name)}</strong>`,
    ...[...addressLines(party.address), party.address?.country]
      .filter((part) => !isBlank(part))
      .map(escapeHtml)
  ]
}

export const partyRow = (
  journeyId,
  readOnly,
  key,
  party,
  obligationId,
  visuallyHiddenText = null
) => {
  const lines = partyLines(party)
  return {
    key: { text: key },
    value: lines ? { html: lines.join('<br>') } : { text: NOT_PROVIDED },
    ...editableActions(
      readOnly,
      changeAction(
        journeyId,
        obligationId,
        visuallyHiddenText ?? key.toLowerCase()
      )
    )
  }
}
