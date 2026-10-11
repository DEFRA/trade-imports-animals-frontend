import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentCards } from '../cards/documents.js'

const copy = copyFor({ en, cy })

// Unconditional: the section is part of the review whether or not anything has
// been uploaded, so a trader with no documents still sees them named and still
// has a link to the upload page.
export const documentsSection = (journeyId, answers, evaluation, readOnly) => ({
  // Suffixed, unlike its sibling sections: the first document card owns the
  // `documents` id, which is what the error summary's "Complete documents" link
  // anchors to. Normalising this to the plain slug would duplicate the id and
  // send that link to this heading instead of the unfinished card.
  anchor: 'documents-section',
  heading: copy.sections.documents,
  cards: documentCards(journeyId, answers, evaluation, readOnly)
})
