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

export const documentsCard = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) => {
  const groups = state
    .collectionView(answers, ['documents'], evaluation)
    .map(({ index, entry }) => ({
      heading: copy.documentN(index + 1),
      rows: [
        row(copy.rows.documentReference, entry.accompanyingDocumentReference),
        row(
          copy.rows.documentType,
          documentsCopy.types[entry.accompanyingDocumentType]
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
    ...editableActions({
      readOnly,
      actions: changeAction(
        { journeyId, changeLinkTrail },
        documentsPage.slug,
        copy.hidden.cards.documents
      )
    }),
    emptyText: groups.length === 0 ? copy.documentsEmpty : null,
    groups
  }
}
