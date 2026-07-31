import * as commodities from '../../../../../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

const NOT_PROVIDED = copy.notProvided

// One card per commodity line = one per species; the title carries
// both the commodity and the species so same-commodity cards stay distinct.
export const speciesCardTitle = (entry) => {
  const name = (entry.commoditySelection ?? '').trim()
  if (!name) return NOT_PROVIDED
  const code = commodities.commodityCodeFor(name)
  const commodity = code ? `${name} (${code})` : name
  const species = speciesText(entry)
  return species ? `${commodity} — ${species}` : commodity
}
