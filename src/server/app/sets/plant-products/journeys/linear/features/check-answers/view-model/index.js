import { aboutConsignmentCard } from './cards/about-consignment.js'
import { additionalDetailsCard } from './cards/additional-details.js'
import { commoditiesCard } from './cards/commodities.js'
import { contactCard } from './cards/contact.js'
import { documentsCard } from './cards/documents.js'
import { goodsMovementCard } from './cards/goods-movement.js'
import { nominatedContactsCard } from './cards/nominated-contacts.js'
import { tradersCard } from './cards/traders.js'
import { transportCard } from './cards/transport.js'

export const buildSections = (answers, scope, evaluation, journeyId) => [
  aboutConsignmentCard(journeyId, answers, scope),
  commoditiesCard(journeyId, answers, scope, evaluation),
  additionalDetailsCard(journeyId, answers, scope),
  transportCard(journeyId, answers, scope, evaluation),
  goodsMovementCard(journeyId, answers, scope),
  contactCard(journeyId, answers, scope),
  nominatedContactsCard(journeyId, answers, evaluation),
  documentsCard(journeyId, answers, evaluation),
  tradersCard(journeyId, answers, scope)
]
