import { isBlank } from '../../../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import {
  IDENTIFIER_LABELS,
  scopedFields
} from '../../../../../commodities/animal-identification/animal-identification.controller.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// The commodity sets the running order of its own identifiers, and check your
// answers heads one column per identifier the commodity asks for, as the
// identification page does, so a blank cell shows an identifier not given.
// Permanent address stands only where an animal carries one.
export const identifierColumns = (units, commodity) => [
  ...scopedFields(commodity).map(({ id }) => [id, IDENTIFIER_LABELS[id]]),
  ...(units.some((unit) => !isBlank(unit.permanentAddress?.name))
    ? [['permanentAddress', copy.identifierTable.permanentAddress]]
    : [])
]
