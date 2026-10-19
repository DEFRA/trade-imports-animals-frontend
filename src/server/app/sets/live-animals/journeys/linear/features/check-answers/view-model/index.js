import { aboutConsignmentSection } from './sections/about-consignment.js'
import { consignmentPartiesSection } from './sections/consignment-parties.js'
import { contactAddressSection } from './sections/contact-address.js'
import { descriptionOfGoodsSection } from './sections/description-of-goods.js'
import { documentsSection } from './sections/documents.js'
import { transportAndArrivalSection } from './sections/transport-and-arrival.js'

export const buildSections = async (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false,
  parties = answers,
  partyErrors = {}
) => {
  const [aboutConsignment, transportAndArrival] = await Promise.all([
    aboutConsignmentSection(journeyId, answers, scope, readOnly),
    transportAndArrivalSection(journeyId, answers, scope, readOnly)
  ])
  return [
    aboutConsignment,
    descriptionOfGoodsSection(journeyId, answers, evaluation, readOnly),
    transportAndArrival,
    documentsSection(journeyId, answers, evaluation, readOnly),
    consignmentPartiesSection(
      journeyId,
      answers,
      readOnly,
      parties,
      partyErrors
    ),
    contactAddressSection(journeyId, answers, readOnly, parties, partyErrors)
  ]
}
