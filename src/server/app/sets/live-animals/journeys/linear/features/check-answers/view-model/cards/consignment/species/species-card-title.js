import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

const NOT_APPLICABLE = copy.notApplicable

// One card per commodity line = one per species; the title carries both the
// CN code and the species so same-code cards stay distinct.
export const speciesCardTitle = (entry) => {
  const code = (entry.commoditySelection ?? '').trim()
  if (!code) {
    return NOT_APPLICABLE
  }
  const species = speciesText(entry)
  return species ? `${code} — ${species}` : code
}
