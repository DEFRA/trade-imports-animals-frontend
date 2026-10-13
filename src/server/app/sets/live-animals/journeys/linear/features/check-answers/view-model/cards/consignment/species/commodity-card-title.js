import * as commodities from '../../../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// One card per commodity: the title carries the commodity and its code, and the
// species stand as blocks inside the card.
export const commodityCardTitle = (name) => {
  const commodity = (name ?? '').trim()
  if (!commodity) {
    return copy.notApplicable
  }
  const code = commodities.commodityCodeFor(commodity)
  return code ? `${commodity} (${code})` : commodity
}
