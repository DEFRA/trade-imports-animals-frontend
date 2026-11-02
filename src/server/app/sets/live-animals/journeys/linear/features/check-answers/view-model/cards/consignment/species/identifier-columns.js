import { isBlank } from '../../../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import {
  IDENTIFIER_LABELS,
  scopedFields
} from '../../../../../commodities/animal-identification/animal-identification.controller.js'
import { PERMANENT_ADDRESS } from '../../../../../commodities/animal-identification/identifier/fields.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const filledIdentifierColumns = (units, commodityCode) => [
  ...scopedFields(commodityCode)
    .filter(({ id }) => units.some((unit) => !isBlank(unit[id])))
    .map(({ id }) => [id, IDENTIFIER_LABELS[id]]),
  ...(units.some((unit) => !isBlank(unit[PERMANENT_ADDRESS]?.name))
    ? [[PERMANENT_ADDRESS, copy.identifierTable.permanentAddress]]
    : [])
]
