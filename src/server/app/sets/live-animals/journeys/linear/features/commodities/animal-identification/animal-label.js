import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).identification

export const animalLabelOf = (speciesLabel, number) =>
  speciesLabel
    ? copy.animalRowNamed(speciesLabel, number)
    : copy.animalRow(number)
