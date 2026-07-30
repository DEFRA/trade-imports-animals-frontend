import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { packagesApply } from '../../../applicability.js'
import { readOnlyRow } from '../../../rows/summary-row.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

export const speciesCardRows = (entry) => [
  readOnlyRow(
    copy.rows.commodityCode,
    commodities.commodityCodeFor(entry.commoditySelection)
  ),
  readOnlyRow(copy.rows.commonName, entry.commoditySelection),
  readOnlyRow(copy.rows.species, speciesText(entry)),
  readOnlyRow(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
  ...(packagesApply(entry.commoditySelection)
    ? [readOnlyRow(copy.rows.numberOfPackages, entry.numberOfPackages)]
    : [])
]
