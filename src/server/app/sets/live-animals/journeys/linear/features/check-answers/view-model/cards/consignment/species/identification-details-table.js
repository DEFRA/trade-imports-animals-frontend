import { copyFor } from '../../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../../copy/copy.en.js'
import { copy as cy } from '../../../../copy/copy.cy.js'
import { animalLabelOf } from '../../../../../commodities/animal-identification/animal-label.js'
import { valueText } from '../../../rows/value-text.js'
import { filledIdentifierColumns } from './identifier-columns.js'

const copy = copyFor({ en, cy })

export const identificationDetailsTable = (
  units,
  commodityCode,
  speciesLatinName
) => {
  if (units.length === 0) {
    return null
  }
  const columns = filledIdentifierColumns(
    units,
    commodityCode,
    speciesLatinName
  )
  return {
    head: [
      { text: copy.identificationDetails.animalColumn },
      ...columns.map(([, label]) => ({ text: label }))
    ],
    rows: units.map((unit, unitIndex) => [
      { text: animalLabelOf(speciesLatinName, unitIndex + 1) },
      ...columns.map(([id]) => ({ text: valueText(unit[id]) }))
    ])
  }
}
