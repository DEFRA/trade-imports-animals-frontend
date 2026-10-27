import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { lineTitle } from '../../../../../commodities/line-title.js'

const copy = copyFor({ en, cy })

export const speciesCardTitle = (entry) =>
  (entry.commodityCode ?? '').trim() ? lineTitle(entry) : copy.notApplicable
