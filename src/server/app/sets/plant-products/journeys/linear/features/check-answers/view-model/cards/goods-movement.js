import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { row } from '../rows/summary-row.js'
import { yesNoText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.goodsMovement

export const goodsMovementCard = (
  journeyId,
  answers,
  scope,
  readOnly = false
) => ({
  heading: cardCopy.heading,
  rows: [
    row({
      label: cardCopy.rows.commonTransitConvention,
      value:
        copy.ctcOptions[answers.commonTransitConvention] ??
        answers.commonTransitConvention,
      obligationName: 'commonTransitConvention',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.movementReferenceNumber,
      value: answers.movementReferenceNumber,
      obligationName: 'movementReferenceNumber',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.usingGvms,
      value: yesNoText(answers.usingGvms, copy.yesNo),
      obligationName: 'usingGvms',
      journeyId,
      scope,
      readOnly
    })
  ].filter(Boolean),
  tables: []
})
