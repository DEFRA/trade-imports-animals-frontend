import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { row } from '../rows/summary-row.js'
import {
  bcpText,
  controlPointText,
  dateText,
  timeText,
  transportText,
  yesNoText
} from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.transport

const containerRows = (
  journeyId,
  answers,
  scope,
  evaluation,
  readOnly = false
) => {
  if (answers.usesContainers !== true) {
    return []
  }
  return state
    .collectionView(answers, ['containers'], evaluation)
    .flatMap(({ index, entry }) => {
      const number = index + 1
      return [
        row({
          label: cardCopy.rows.containerNumber(number),
          value: entry.containerNumber,
          obligationName: `containers[${index}].containerNumber`,
          journeyId,
          scope,
          readOnly
        }),
        row({
          label: cardCopy.rows.sealNumber(number),
          value: entry.sealNumber,
          obligationName: `containers[${index}].sealNumber`,
          journeyId,
          scope,
          readOnly
        }),
        row({
          label: cardCopy.rows.officialSeal(number),
          value: yesNoText(entry.officialSeal, copy.yesNo),
          obligationName: `containers[${index}].officialSeal`,
          journeyId,
          scope,
          readOnly
        })
      ].filter(Boolean)
    })
}

export const transportCard = (
  journeyId,
  answers,
  scope,
  evaluation,
  readOnly = false
) => ({
  heading: cardCopy.heading,
  rows: [
    row({
      label: cardCopy.rows.borderControlPost,
      value: bcpText(answers.borderControlPost),
      obligationName: 'borderControlPost',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.inspectionPremises,
      value: controlPointText(answers.inspectionPremises),
      obligationName: 'inspectionPremises',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.meansOfTransport,
      value: transportText(answers.meansOfTransport),
      obligationName: 'meansOfTransport',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.transportIdentification,
      value: answers.transportIdentification,
      obligationName: 'transportIdentification',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.transportDocumentReference,
      value: answers.transportDocumentReference,
      obligationName: 'transportDocumentReference',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.arrivalDate,
      value: dateText(answers.arrivalDate),
      obligationName: 'arrivalDate',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.arrivalTime,
      value: timeText(answers.arrivalTime),
      obligationName: 'arrivalTime',
      journeyId,
      scope,
      readOnly
    }),
    row({
      label: cardCopy.rows.usesContainers,
      value: yesNoText(answers.usesContainers, copy.yesNo),
      obligationName: 'usesContainers',
      journeyId,
      scope,
      readOnly
    }),
    ...containerRows(journeyId, answers, scope, evaluation, readOnly)
  ].filter(Boolean),
  tables: []
})
