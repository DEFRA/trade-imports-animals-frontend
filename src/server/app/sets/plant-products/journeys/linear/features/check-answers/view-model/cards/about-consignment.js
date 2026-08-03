import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { readOnlyRow, row } from '../rows/summary-row.js'
import { countryText, purposeText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.aboutConsignment

export const aboutConsignmentCard = (journeyId, answers, scope) => ({
  heading: cardCopy.heading,
  rows: [
    readOnlyRow(
      cardCopy.rows.importType,
      copy.importTypes[answers.importType] ?? answers.importType
    ),
    row({
      label: cardCopy.rows.countryOfOrigin,
      value: countryText(answers.countryOfOrigin),
      obligationName: 'countryOfOrigin',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.countryOfConsignment,
      value: countryText(answers.countryOfConsignment),
      obligationName: 'countryOfConsignment',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.internalReference,
      value: answers.internalReference,
      obligationName: 'internalReference',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.reasonForImport,
      value: purposeText(answers.reasonForImport),
      obligationName: 'reasonForImport',
      journeyId,
      scope
    })
  ].filter(Boolean),
  tables: []
})
