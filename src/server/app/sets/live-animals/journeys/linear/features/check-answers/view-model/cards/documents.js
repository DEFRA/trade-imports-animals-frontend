import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsPage } from '../../../documents/page.js'
import { changeAction, editableActions } from '../rows/change-link.js'
import { row } from '../rows/summary-row.js'
import { dateText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })

const DOCUMENTS_CARD_ID = 'documents'

const documentRows = (entry) => [
  row(copy.rows.documentReference, entry.accompanyingDocumentReference),
  row(
    copy.rows.documentType,
    copy.documentTypes[entry.accompanyingDocumentType]
  ),
  row(copy.rows.dateOfIssue, dateText(entry.accompanyingDocumentDateOfIssue)),
  row(copy.rows.attachment, entry.filename)
]

const noDocumentRows = () => [row(copy.rows.documentReference, null)]

const documentCard = (journeyId, readOnly, number, rows) => ({
  id: DOCUMENTS_CARD_ID,
  title: copy.documentN(number),
  ...editableActions(
    readOnly,
    changeAction(journeyId, documentsPage.slug, copy.hidden.documentN(number))
  ),
  rows
})

// Documents are optional, so the section always stands: with none uploaded it
// carries the design's single "Document 1" card reading Not applicable, which
// keeps the route to the upload page.
export const documentCards = (journeyId, answers, evaluation, readOnly) => {
  const documents = state.collectionView(answers, ['documents'], evaluation)
  if (documents.length === 0) {
    return [documentCard(journeyId, readOnly, 1, noDocumentRows())]
  }
  return documents.map(({ index, entry }) =>
    documentCard(journeyId, readOnly, index + 1, documentRows(entry))
  )
}
