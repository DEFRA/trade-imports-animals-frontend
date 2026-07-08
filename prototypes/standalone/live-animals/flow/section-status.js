import { statusOf, NA, FULFILLED, OPTIONAL } from '../engine/status.js'
import { collectsOf } from './dispatch.js'
import { answerSections } from './flow.js'

export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))

export const sectionStatus = (section, answers, inScope) =>
  statusOf(sectionObligationIds(section), answers, inScope)

/**
 * Submit-readiness roll-up: true once every answer-gathering section is
 * submit-ready. An OPTIONAL section (a collection with no
 * `required`/`requiredAtLeastOne`, e.g. `documents`) must NOT block — you can
 * submit with none — so OPTIONAL is accepted alongside FULFILLED and NA.
 * Excludes `review` (see flow.js#answerSections for the declaration circularity).
 */
export const readyForCheckYourAnswers = (answers, inScope) =>
  answerSections.every((section) => {
    const status = sectionStatus(section, answers, inScope)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
