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

const animalsValidatorsFor = (lines) => {
  const ANIMALS_MAX = 9223372036854775807n
  return lines.map(({ index }) =>
    requiredIntegerInRange(animalsField(index), {
      min: 1,
      max: ANIMALS_MAX,
      messages: {
        required: copy.errors.animalsRequired,
        invalid: copy.errors.animalsWholeNumber,
        max: copy.errors.animalsAboveMax(ANIMALS_MAX)
      }
    })
  )
}

const packagesValidatorsFor = (lines) =>
  lines
    .filter(({ entry }) => packagesApply(entry.commodityCode))
    .map(({ index }) =>
      integerInRange(packagesField(index), {
        min: 1,
        message: copy.errors.packagesWholeNumber
      })
    )

export const fieldsFor = (lines) =>
  compose(...animalsValidatorsFor(lines), ...packagesValidatorsFor(lines))
