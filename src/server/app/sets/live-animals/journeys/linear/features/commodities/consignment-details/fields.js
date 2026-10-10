import {
  compose,
  requiredIntegerInRange
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as commodities from '../../../../../services/commodities/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).consignmentDetails

export const packagesApply = (commoditySelection) =>
  commodities.packageCountCommodities().includes(commoditySelection)

export const animalsField = (index) => `numberOfAnimalsQuantity-${index}`
export const packagesField = (index) => `numberOfPackages-${index}`

// The error summary lists errors by question: every number of animals error
// before any number of packages error.
export const fieldsFor = (lines) => {
  const animalsSchemas = lines.map(({ index }) =>
    requiredIntegerInRange(animalsField(index), {
      min: 1,
      messages: {
        required: copy.errors.animalsRequired,
        invalid: copy.errors.animalsWholeNumber
      }
    })
  )
  const packagesSchemas = lines
    .filter(({ entry }) => packagesApply(entry.commoditySelection))
    .map(({ index }) =>
      requiredIntegerInRange(packagesField(index), {
        min: 1,
        messages: {
          required: copy.errors.packagesRequired,
          invalid: copy.errors.packagesWholeNumber
        }
      })
    )
  return compose(...animalsSchemas, ...packagesSchemas)
}
