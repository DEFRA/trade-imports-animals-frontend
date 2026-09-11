import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsCard } from '../cards/documents.js'

const copy = copyFor({ en, cy })

// Unconditional: the section is part of the review whether or not anything has
// been uploaded, so a trader with no documents still sees them named and still
// has a link to the upload page.
export const documentsSection = (journeyId, answers, evaluation, readOnly) => ({
  heading: copy.sections.documents,
  groups: [
    {
      heading: null,
      cards: [documentsCard(journeyId, answers, evaluation, readOnly)]
    }
  ]
})
