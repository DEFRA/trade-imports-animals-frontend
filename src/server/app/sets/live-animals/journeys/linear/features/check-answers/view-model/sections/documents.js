import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { documentCards } from '../cards/documents.js'

const copy = copyFor({ en, cy })

/** The anchor of the documents section, which a template's review leaves out. */
export const DOCUMENTS_SECTION_ANCHOR = 'documents-section'

// Unconditional: the section is part of the review whether or not anything has
// been uploaded, so a trader with no documents still sees them named and still
// has a link to the upload page.
export const documentsSection = (journeyId, answers, evaluation, readOnly) => ({
  // Suffixed, unlike its sibling sections: the first document card owns the
  // `documents` id, which is what the error summary's "Complete documents" link
  // anchors to. Normalising this to the plain slug would duplicate the id and
  // send that link to this heading instead of the unfinished card.
  anchor: DOCUMENTS_SECTION_ANCHOR,
  heading: copy.sections.documents,
  cards: documentCards(journeyId, answers, evaluation, readOnly)
})

const owesHealthCertificate = (journey) =>
  journey.status === state.SUBMITTED_ACTION_REQUIRED &&
  (journey.outstandingItems ?? []).includes(
    state.OUTSTANDING_HEALTH_CERTIFICATE
  )

/** On an action-required notification with nothing uploaded, the section says
 * what to upload in place of its cards. */
export const withMissingHealthCertificate = (
  sections,
  journey,
  answers,
  evaluation
) => {
  if (
    !owesHealthCertificate(journey) ||
    state.collectionView(answers, ['documents'], evaluation).length > 0
  ) {
    return sections
  }
  return sections.map((section) =>
    section.anchor === DOCUMENTS_SECTION_ANCHOR
      ? { ...section, cards: [], error: copy.errors.uploadHealthCertificate }
      : section
  )
}
