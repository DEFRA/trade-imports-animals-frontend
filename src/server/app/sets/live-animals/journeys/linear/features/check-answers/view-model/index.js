import { aboutConsignmentSection } from './sections/about-consignment.js'
import { consignmentPartiesSection } from './sections/consignment-parties.js'
import { contactAddressSection } from './sections/contact-address.js'
import { descriptionOfGoodsSection } from './sections/description-of-goods.js'
import { documentsSection } from './sections/documents.js'
import { transportAndArrivalSection } from './sections/transport-and-arrival.js'

// Design release 1's six numbered sections, in its order. The numbers are part
// of each section's heading copy, so the order here and the numbering there
// have to agree.
export const buildSections = async (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false,
  parties = answers,
  partyErrors = {}
) => {
  // aboutConsignment and transportAndArrival read reference-data through
  // async view-model cards; the other four sections are sync. Run the two
  // async sections in parallel and assemble the array once they resolve.
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
    contactAddressSection(journeyId, answers, readOnly, parties)
  ]
}
