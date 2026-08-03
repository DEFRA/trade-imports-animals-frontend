import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { row } from '../rows/summary-row.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.contact

export const contactCard = (journeyId, answers, scope) => ({
  heading: cardCopy.heading,
  rows: [
    row({
      label: cardCopy.rows.name,
      value: answers.responsiblePersonName,
      obligationName: 'responsiblePersonName',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.email,
      value: answers.responsiblePersonEmail,
      obligationName: 'responsiblePersonEmail',
      journeyId,
      scope
    }),
    row({
      label: cardCopy.rows.telephone,
      value: answers.responsiblePersonTelephone,
      obligationName: 'responsiblePersonTelephone',
      journeyId,
      scope
    })
  ].filter(Boolean),
  tables: []
})
