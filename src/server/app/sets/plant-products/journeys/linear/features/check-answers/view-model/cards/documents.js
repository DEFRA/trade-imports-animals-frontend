import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { changeHref } from '../rows/change-link.js'
import { dateText, documentTypeText } from '../rows/value-text.js'

const copy = copyFor({ en, cy })
const cardCopy = copy.cards.documents
const cell = (text) => ({ text: String(text ?? '') })

export const documentsCard = (journeyId, answers, evaluation) => {
  const documents = state.collectionView(
    answers,
    ['accompanyingDocuments'],
    evaluation
  )
  return {
    heading: cardCopy.heading,
    rows: [],
    tables: [
      {
        caption: cardCopy.heading,
        captionClasses: 'govuk-visually-hidden',
        head: Object.values(cardCopy.columns).map((text) => ({ text })),
        rows: documents.map(({ entry }) => [
          cell(documentTypeText(entry.documentType)),
          cell(entry.documentReference),
          cell(dateText(entry.issueDate))
        ])
      }
    ],
    action: {
      href: changeHref('accompanyingDocuments', journeyId),
      text: copy.change,
      visuallyHiddenText: cardCopy.change
    }
  }
}
