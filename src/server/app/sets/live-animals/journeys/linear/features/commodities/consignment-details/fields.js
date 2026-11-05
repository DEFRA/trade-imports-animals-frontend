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

const BACKEND_QUANTITY_MAX = 2147483647

const animalsValidatorsFor = (lines) =>
  lines.map(({ index }) =>
    requiredIntegerInRange(animalsField(index), {
      min: 1,
      max: BACKEND_QUANTITY_MAX,
      messages: {
        required: copy.errors.animalsRequired,
        invalid: copy.errors.animalsWholeNumber,
        max: copy.errors.animalsAboveMax(BACKEND_QUANTITY_MAX)
      }
    })
  )

const packagesValidatorsFor = (lines) =>
  lines
    .filter(({ entry }) => packagesApply(entry.commodityCode))
    .map(({ index }) =>
      integerInRange(packagesField(index), {
        min: 1,
        max: BACKEND_QUANTITY_MAX,
        messages: {
          invalid: copy.errors.packagesWholeNumber,
          max: copy.errors.packagesAboveMax(BACKEND_QUANTITY_MAX)
        }
      })
    )

export const fieldsFor = (lines) =>
  compose(...animalsValidatorsFor(lines), ...packagesValidatorsFor(lines))
