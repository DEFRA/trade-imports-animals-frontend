import * as commodities from '../../../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { packagesApply } from '../../../applicability.js'
import { row } from '../../../rows/summary-row.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

export const speciesCardRows = (entry) => [
  row(
    copy.rows.commodityCode,
    commodities.commodityCodeFor(entry.commoditySelection)
  ),
  row(copy.rows.commonName, entry.commoditySelection),
  row(copy.rows.species, speciesText(entry)),
  row(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
  ...(packagesApply(entry.commoditySelection)
    ? [row(copy.rows.numberOfPackages, entry.numberOfPackages)]
    : [])
]
