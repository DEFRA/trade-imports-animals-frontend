import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { identifierCell } from './identifier-cell.js'
import { identifierColumns } from './identifier-columns.js'

const copy = copyFor({ en, cy })

export const identifierTable = (units) => {
  if (units.length === 0) {
    return null
  }
  const columns = identifierColumns(units)
  return {
    head: [
      { text: copy.identifierTable.animalColumn },
      ...columns.map(([, label]) => ({ text: label }))
    ],
    rows: units.map((unit, unitIndex) => [
      { text: copy.identifierTable.animalN(unitIndex + 1) },
      ...columns.map(([id]) => ({ text: identifierCell(unit, id) }))
    ])
  }
}
