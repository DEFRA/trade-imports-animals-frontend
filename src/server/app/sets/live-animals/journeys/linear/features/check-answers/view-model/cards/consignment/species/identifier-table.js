import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { identifierCell } from './identifier-cell.js'
import { identifierColumns } from './identifier-columns.js'
import { speciesText } from './species-text.js'

const copy = copyFor({ en, cy })

const animalLabel = (species, number) =>
  species
    ? copy.identifierTable.animalNamed(species, number)
    : copy.identifierTable.animalN(number)

export const identifierTable = (units, entry) => {
  if (units.length === 0) {
    return null
  }
  const columns = identifierColumns(units, entry.commoditySelection)
  const species = speciesText(entry)
  return {
    head: [
      { text: copy.identifierTable.animalColumn },
      ...columns.map(([, label]) => ({ text: label }))
    ],
    rows: units.map((unit, unitIndex) => [
      { text: animalLabel(species, unitIndex + 1) },
      ...columns.map(([id]) => ({ text: identifierCell(unit, id) }))
    ])
  }
}
