import { copyFor } from '../../../../../../../shared/copy.js'
import { speciesLabel } from '../species-label.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).identification

/**
 * How one animal of a commodity line is named wherever the journey lists it.
 *
 * @param {{speciesLatinName?: string, speciesCommonName?: string}} line - the
 * commodity line the animal belongs to.
 * @param {number} number - the animal's position on its line.
 * @returns {string} the species label and the number, or the number alone
 * while the line names no species.
 */
export const animalLabelOf = (line, number) => {
  const species = speciesLabel(line)
  return species ? copy.animalRowNamed(species, number) : copy.animalRow(number)
}
