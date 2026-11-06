import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { packagesApply } from '../../../applicability.js'
import { row } from '../../../rows/summary-row.js'

const copy = copyFor({ en, cy })

export const speciesCardRows = (entry) => [
  row(copy.rows.commodityCode, entry.commodityCode),
  row(copy.rows.speciesCommonName, entry.speciesCommonName),
  row(copy.rows.species, entry.speciesLatinName),
  row(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
  ...(packagesApply(entry.commodityCode)
    ? [row(copy.rows.numberOfPackages, entry.numberOfPackages)]
    : [])
]
