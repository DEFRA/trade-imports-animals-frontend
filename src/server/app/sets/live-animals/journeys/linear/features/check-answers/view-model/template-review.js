import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { DOCUMENTS_SECTION_ANCHOR } from './sections/documents.js'

const copy = copyFor({ en, cy })

/**
 * A template's review: the review's sections without the documents section,
 * headed as the template's task list heads them. A template holds no documents
 * (template mode leaves the upload page out), so the two sections after the
 * documents renumber, matching the template's task list.
 *
 * @param {object[]} sections - the review's sections, as built
 * @returns {object[]} the sections a template's review shows
 */
export const asTemplateReview = (sections) =>
  sections
    .filter(({ anchor }) => anchor !== DOCUMENTS_SECTION_ANCHOR)
    .map((section) => ({
      ...section,
      heading: copy.template.sections[section.anchor]
    }))
