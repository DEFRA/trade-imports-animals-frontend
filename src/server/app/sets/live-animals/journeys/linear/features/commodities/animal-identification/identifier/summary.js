import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy }).identification

export const IDENTIFIER_LABELS = copy.identifierLabels

export const animalIdentifierSummary = (unit) => {
  const parts = Object.entries(IDENTIFIER_LABELS)
    .filter(([id]) => (unit[id] ?? '').toString().trim() !== '')
    .map(([id, label]) => `${label}: ${unit[id]}`)
  if (unit.permanentAddress?.name) {
    parts.push(
      `${copy.permanentAddressSummaryLabel}: ${unit.permanentAddress.name}`
    )
  }
  return parts.length ? parts.join(', ') : copy.noIdentifier
}
