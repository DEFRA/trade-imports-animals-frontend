import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { speciesLabel } from '../../../../../commodities/species-label.js'

const copy = copyFor({ en, cy })

const NOT_APPLICABLE = copy.notApplicable

export const speciesCardTitle = (entry) => {
  const commodityCode = (entry.commodityCode ?? '').trim()
  if (!commodityCode) {
    return NOT_APPLICABLE
  }
  const speciesLatinName = speciesLabel(entry)
  return speciesLatinName
    ? `${commodityCode} — ${speciesLatinName}`
    : commodityCode
}
