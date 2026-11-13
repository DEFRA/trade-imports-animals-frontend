import { aboutConsignmentSection } from './sections/about-consignment.js'
import { consignmentAddressesSection } from './sections/consignment-addresses.js'
import { contactAddressSection } from './sections/contact-address.js'
import { descriptionOfGoodsSection } from './sections/description-of-goods.js'
import { documentsSection } from './sections/documents.js'
import { transportAndArrivalSection } from './sections/transport-and-arrival.js'

export const buildSections = async ({
  answers,
  scope,
  evaluation,
  journeyId,
  changeLinkTrail,
  reviewPageTrail,
  readOnly = false,
  parties = answers,
  partyErrors = {},
  permanentAddresses = []
}) => {
  const [aboutConsignment, transportAndArrival] = await Promise.all([
    aboutConsignmentSection({
      journeyId,
      changeLinkTrail,
      answers,
      scope,
      readOnly
    }),
    transportAndArrivalSection({
      journeyId,
      changeLinkTrail,
      answers,
      scope,
      readOnly
    })
  ])
  return [
    aboutConsignment,
    descriptionOfGoodsSection({
      journeyId,
      changeLinkTrail,
      answers,
      evaluation,
      readOnly
    }),
    transportAndArrival,
    documentsSection({
      journeyId,
      changeLinkTrail,
      answers,
      evaluation,
      readOnly
    }),
    consignmentAddressesSection({
      journeyId,
      changeLinkTrail,
      reviewPageTrail,
      answers,
      readOnly,
      parties,
      partyErrors,
      permanentAddresses
    }),
    contactAddressSection({
      journeyId,
      changeLinkTrail,
      reviewPageTrail,
      answers,
      readOnly,
      parties,
      partyErrors
    })
  ]
}
