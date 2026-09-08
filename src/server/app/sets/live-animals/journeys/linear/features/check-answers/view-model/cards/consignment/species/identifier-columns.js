import { isBlank } from '../../../../../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../../../../../shared/copy.js'
import {
  IDENTIFIER_LABELS,
  scopedFields
} from '../../../../../commodities/animal-identification/animal-identification.controller.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// The commodity sets the running order of its own identifiers, so check your
// answers reads them back in the order the identification page asked for
// them. Only identifiers a unit actually carries get a column here — this is
// a read-back of what was entered, not a list of what was asked for.
export const identifierColumns = (units, commodity) => [
  ...scopedFields(commodity)
    .filter(({ id }) => units.some((unit) => !isBlank(unit[id])))
    .map(({ id }) => [id, IDENTIFIER_LABELS[id]]),
  ...(units.some((unit) => !isBlank(unit.permanentAddress?.name))
    ? [['permanentAddress', copy.identifierTable.permanentAddress]]
    : [])
]
