import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsCard } from '../cards/documents.js'

const copy = copyFor({ en, cy })

export const documentsSection = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) => ({
  anchor: 'documents-section',
  heading: copy.sections.documents,
  groups: [
    {
      heading: copy.groups.uploadDocuments,
      cards: [
        documentsCard({
          journeyId,
          changeLinkTrail,
          answers,
          evaluation,
          readOnly
        })
      ]
    }
  ]
})
