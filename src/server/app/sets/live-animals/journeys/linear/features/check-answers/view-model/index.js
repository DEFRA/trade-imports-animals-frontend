import { aboutConsignmentSection } from './sections/about-consignment.js'
import { addressesSection } from './sections/addresses.js'
import { documentsSection } from './sections/documents.js'
import { movementSection } from './sections/movement.js'

export const buildSections = (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false,
  parties = answers
) => {
  const documents = documentsSection(journeyId, answers, evaluation, readOnly)
  return [
    aboutConsignmentSection(journeyId, answers, scope, evaluation, readOnly),
    movementSection(journeyId, answers, scope, readOnly),
    addressesSection(journeyId, answers, readOnly, parties),
    ...(documents ? [documents] : [])
  ]
}
