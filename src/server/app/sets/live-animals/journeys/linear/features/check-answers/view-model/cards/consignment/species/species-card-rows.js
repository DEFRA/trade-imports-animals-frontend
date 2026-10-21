import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { packagesApply } from '../../../applicability.js'
import { row } from '../../../rows/summary-row.js'
import { speciesLatinNameOf } from './species-latin-name.js'

const copy = copyFor({ en, cy })

export const speciesCardRows = (entry) => [
  row(copy.rows.commodityCode, entry.commodityCode),
  row(copy.rows.commonName, entry.commonName ?? ''),
  row(copy.rows.species, speciesLatinNameOf(entry)),
  row(copy.rows.numberOfAnimals, entry.numberOfAnimalsQuantity),
  ...(packagesApply(entry.commodityCode)
    ? [row(copy.rows.numberOfPackages, entry.numberOfPackages)]
    : [])
]
