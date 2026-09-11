import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentsCard } from '../cards/documents.js'

const copy = copyFor({ en, cy })

// Unconditional: the section is part of the review whether or not anything has
// been uploaded, so a trader with no documents still sees them named and still
// has a link to the upload page.
export const documentsSection = (journeyId, answers, evaluation, readOnly) => ({
  // Suffixed, unlike its sibling sections: the documents CARD already owns the
  // `documents` id, which is what the error summary's "Complete documents" link
  // anchors to. Normalising this to the plain slug would duplicate the id and
  // send that link to this heading instead of the unfinished card.
  anchor: 'documents-section',
  heading: copy.sections.documents,
  groups: [
    {
      heading: null,
      cards: [documentsCard(journeyId, answers, evaluation, readOnly)]
    }
  ]
})
