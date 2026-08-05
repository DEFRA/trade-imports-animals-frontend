import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsCard } from '../cards/documents.js'

const copy = copyFor({ en, cy })

export const documentsSection = (journeyId, answers, evaluation, readOnly) => {
  const documents = documentsCard(journeyId, answers, evaluation, readOnly)
  if (!documents) {
    return null
  }
  return {
    heading: copy.sections.documents,
    groups: [{ heading: null, cards: [documents] }]
  }
}
