import {
  compose,
  integerInRange,
  requiredIntegerInRange
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { packagesApply } from '../../check-answers/view-model/applicability.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).consignmentDetails

export const animalsField = (index) => `numberOfAnimalsQuantity-${index}`
export const packagesField = (index) => `numberOfPackages-${index}`

export const fieldsFor = (lines) =>
  compose(
    ...lines.flatMap(({ index, entry }) => [
      requiredIntegerInRange(animalsField(index), {
        min: 1,
        messages: {
          required: copy.errors.animalsRequired,
          invalid: copy.errors.animalsWholeNumber
        }
      }),
      ...(packagesApply(entry.commodityCode)
        ? [
            integerInRange(packagesField(index), {
              min: 1,
              message: copy.errors.packagesWholeNumber
            })
          ]
        : [])
    ])
  )
