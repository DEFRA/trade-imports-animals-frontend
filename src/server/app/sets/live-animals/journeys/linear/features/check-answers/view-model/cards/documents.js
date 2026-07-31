import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { changeHref, editableActions } from '../rows/change-link.js'
import { readOnlyRow } from '../rows/summary-row.js'
import { dateText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })

export const documentsCard = (journeyId, answers, evaluation, readOnly) => {
  const documents = state
    .collectionView(answers, ['documents'], evaluation)
    .map(({ index, entry }) => ({
      heading: copy.documentN(index + 1),
      rows: [
        readOnlyRow(
          copy.rows.documentReference,
          entry.accompanyingDocumentReference
        ),
        readOnlyRow(
          copy.rows.documentType,
          copy.documentTypes[entry.accompanyingDocumentType]
        ),
        {
          key: { text: copy.rows.dateOfIssue },
          value: { text: dateText(entry.accompanyingDocumentDateOfIssue) }
        },
        readOnlyRow(
          copy.rows.attachmentType,
          entry.accompanyingDocumentAttachmentType
        )
      ]
    }))
  if (documents.length === 0) return null
  return {
    title: copy.cards.documents,
    ...editableActions(readOnly, {
      items: [
        {
          href: changeHref(journeyId, 'documents'),
          text: copy.change,
          visuallyHiddenText: copy.hidden.documents
        }
      ]
    }),
    documents
  }
}
