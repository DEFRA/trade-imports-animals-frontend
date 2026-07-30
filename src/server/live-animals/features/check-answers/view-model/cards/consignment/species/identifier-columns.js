import { isBlank } from '../../../../../../lib/answered.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { IDENTIFIER_LABELS } from '../../../../../commodities/animal-identification.controller.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const identifierColumns = (units) => [
  ...Object.entries(IDENTIFIER_LABELS).filter(([id]) =>
    units.some((unit) => !isBlank(unit[id]))
  ),
  ...(units.some((unit) => !isBlank(unit.permanentAddress?.name))
    ? [['permanentAddress', copy.identifierTable.permanentAddress]]
    : [])
]
