import { aboutConsignmentSection } from './sections/about-consignment.js'
import { consignmentPartiesSection } from './sections/consignment-parties.js'
import { contactAddressSection } from './sections/contact-address.js'
import { descriptionOfGoodsSection } from './sections/description-of-goods.js'
import { documentsSection } from './sections/documents.js'
import { transportAndArrivalSection } from './sections/transport-and-arrival.js'

// Design release 1's six numbered sections, in its order. The numbers are part
// of each section's heading copy, so the order here and the numbering there
// have to agree.
export const buildSections = (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false,
  parties = answers,
  partyErrors = {}
) => [
  aboutConsignmentSection(journeyId, answers, scope, readOnly),
  descriptionOfGoodsSection(journeyId, answers, evaluation, readOnly),
  transportAndArrivalSection(journeyId, answers, scope, readOnly),
  documentsSection(journeyId, answers, evaluation, readOnly),
  consignmentPartiesSection(journeyId, answers, readOnly, parties, partyErrors),
  contactAddressSection(journeyId, answers, readOnly, parties)
]
