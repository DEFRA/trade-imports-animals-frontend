import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { changeHref, editableActions } from '../rows/change-link.js'
import { readOnlyRow } from '../rows/summary-row.js'
import { dateText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })

// Documents are optional, so nothing uploaded is the ordinary case rather than
// an edge one. The card stands either way (design release 1): the review page
// has to say that documents are part of the notification and offer the route to
// add them. An empty card would read as broken, so with no entries it carries a
// line saying none have been added.
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
    emptyText: documents.length === 0 ? copy.documentsEmpty : null,
    documents
  }
}
