import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsPage } from '../../../documents/page.js'
import { cardAction, editableActions } from '../rows/change-link.js'
import { row } from '../rows/summary-row.js'
import { dateText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })

export const documentsCard = (journeyId, answers, evaluation, readOnly) => {
  const documents = state
    .collectionView(answers, ['documents'], evaluation)
    .map(({ index, entry }) => ({
      heading: copy.documentN(index + 1),
      rows: [
        row(copy.rows.documentReference, entry.accompanyingDocumentReference),
        row(
          copy.rows.documentType,
          copy.documentTypes[entry.accompanyingDocumentType]
        ),
        row(
          copy.rows.dateOfIssue,
          dateText(entry.accompanyingDocumentDateOfIssue)
        ),
        row(copy.rows.attachmentType, entry.accompanyingDocumentAttachmentType)
      ]
    }))
  return {
    id: 'documents',
    title: copy.cards.documents,
    ...editableActions(
      readOnly,
      cardAction(journeyId, documentsPage.slug, copy.hidden.cards.documents)
    ),
    emptyText: documents.length === 0 ? copy.documentsEmpty : null,
    documents
  }
}
