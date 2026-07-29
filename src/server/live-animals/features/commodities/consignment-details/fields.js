import { compose, integerInRange } from '../../../lib/validate/index.js'
import { copyFor } from '../../../shared/copy.js'
import * as commodities from '../../../services/commodities/index.js'
import { copy as en } from '../copy.en.js'
import { copy as cy } from '../copy.cy.js'

const copy = copyFor({ en, cy }).consignmentDetails

export const packagesApply = (commoditySelection) =>
  commodities.packageCountCommodities().includes(commoditySelection)

export const animalsField = (index) => `numberOfAnimalsQuantity-${index}`
export const packagesField = (index) => `numberOfPackages-${index}`

export const fieldsFor = (lines) =>
  compose(
    ...lines.flatMap(({ index, entry }) => [
      integerInRange(animalsField(index), {
        min: 1,
        message: copy.errors.animalsWholeNumber
      }),
      ...(packagesApply(entry.commoditySelection)
        ? [
            integerInRange(packagesField(index), {
              min: 1,
              message: copy.errors.packagesWholeNumber
            })
          ]
        : [])
    ])
  )
