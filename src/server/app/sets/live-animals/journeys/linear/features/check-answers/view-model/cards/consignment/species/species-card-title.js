import * as commodities from '../../../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

const NOT_APPLICABLE = copy.notApplicable

export const speciesCardTitle = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  if (!name) {
    return NOT_APPLICABLE
  }
  const code = commodities.commodityCodeFor(name)
  const commodity = commodities.commodityLabel(name, code)
  const species = speciesText(entry)
  return species ? `${commodity} — ${species}` : commodity
}
