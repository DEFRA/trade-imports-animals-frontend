import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as documentsEn } from '../../../documents/copy/copy.en.js'
import { copy as documentsCy } from '../../../documents/copy/copy.cy.js'
import { documentsPage } from '../../../documents/page.js'
import { changeAction, editableActions } from '../rows/change-link.js'
import { row } from '../rows/summary-row.js'
import { dateText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const documentsCopy = copyFor({ en: documentsEn, cy: documentsCy })

const documentCard = ({ changeContext, readOnly, number, rows }) => ({
  id: 'documents',
  title: copy.documentN(number),
  ...editableActions({
    readOnly,
    actions: changeAction(
      changeContext,
      documentsPage.slug,
      copy.hidden.document(number)
    )
  }),
  rows
})

const documentRows = (entry) => [
  row(copy.rows.documentReference, entry.accompanyingDocumentReference),
  row(
    copy.rows.documentType,
    documentsCopy.types[entry.accompanyingDocumentType]
  ),
  row(copy.rows.dateOfIssue, dateText(entry.accompanyingDocumentDateOfIssue)),
  row(copy.rows.attachment, entry.filename)
]

/**
 * The documents section's cards: one per uploaded document, or a single
 * "not applicable" card when nothing is uploaded. Unless read-only, each card
 * has a Change action to the documents page.
 *
 * @param {object} options
 * @param {string} options.journeyId - the journey the cards belong to.
 * @param {string[]} options.changeLinkTrail - the trail a link from the review carries.
 * @param {object} options.answers - the journey's answers.
 * @param {object} options.evaluation - the request-level evaluator result.
 * @param {boolean} options.readOnly - true to omit the Change actions.
 * @returns {object[]} the summary cards, in upload order.
 */
export const documentCards = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) => {
  const changeContext = { journeyId, changeLinkTrail }
  const documents = state.collectionView(answers, ['documents'], evaluation)
  if (documents.length === 0) {
    return [
      documentCard({
        changeContext,
        readOnly,
        number: 1,
        rows: [row(copy.rows.documentReference, null)]
      })
    ]
  }
  return documents.map(({ index, entry }) =>
    documentCard({
      changeContext,
      readOnly,
      number: index + 1,
      rows: documentRows(entry)
    })
  )
}
