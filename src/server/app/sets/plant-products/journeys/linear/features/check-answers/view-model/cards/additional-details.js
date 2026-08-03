import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { readOnlyRow, row } from '../rows/summary-row.js'
import { grossVolumeUnitText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.additionalDetails

const sum = (lines, field) =>
  (Array.isArray(lines) ? lines : []).reduce(
    (total, line) => total + Number(line?.[field] ?? 0),
    0
  )

export const additionalDetailsCard = (journeyId, answers, scope) => ({
  heading: cardCopy.heading,
  rows: [
    row({
      label: cardCopy.rows.totalGrossWeight,
      value: answers.totalGrossWeight,
      obligationName: 'totalGrossWeight',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.grossVolume,
      value: answers.grossVolume,
      obligationName: 'grossVolume',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.grossVolumeUnit,
      value: grossVolumeUnitText(answers.grossVolumeUnit),
      obligationName: 'grossVolumeUnit',
      journeyId,
      scope
    }),
    readOnlyRow(
      cardCopy.rows.totalNetWeight,
      sum(answers.commodityLines, 'netWeight')
    ),
    readOnlyRow(
      cardCopy.rows.totalPackages,
      sum(answers.commodityLines, 'numberOfPackages')
    )
  ].filter(Boolean),
  tables: []
})
