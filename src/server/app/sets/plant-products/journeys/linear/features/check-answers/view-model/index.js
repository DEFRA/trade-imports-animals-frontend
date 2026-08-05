import { aboutConsignmentCard } from './cards/about-consignment.js'
import { additionalDetailsCard } from './cards/additional-details.js'
import { commoditiesCard } from './cards/commodities.js'
import { contactCard } from './cards/contact.js'
import { documentsCard } from './cards/documents.js'
import { goodsMovementCard } from './cards/goods-movement.js'
import { nominatedContactsCard } from './cards/nominated-contacts.js'
import { tradersCard } from './cards/traders.js'
import { transportCard } from './cards/transport.js'

export const buildSections = (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false
) => [
  aboutConsignmentCard(journeyId, answers, scope, readOnly),
  commoditiesCard(journeyId, answers, scope, evaluation, readOnly),
  additionalDetailsCard(journeyId, answers, scope, readOnly),
  transportCard(journeyId, answers, scope, evaluation, readOnly),
  goodsMovementCard(journeyId, answers, scope, readOnly),
  contactCard(journeyId, answers, scope, readOnly),
  nominatedContactsCard(journeyId, answers, evaluation, readOnly),
  documentsCard(journeyId, answers, evaluation, readOnly),
  tradersCard(journeyId, answers, scope, readOnly)
]
