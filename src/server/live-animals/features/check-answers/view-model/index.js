import { copyFor } from '../../../shared/copy.js'
import { copy as en } from '../copy.en.js'
import { copy as cy } from '../copy.cy.js'
import { contactAddressCard } from './cards/addresses/contact-address.js'
import { rolesAndAddressesCard } from './cards/addresses/roles-and-addresses.js'
import { additionalAnimalDetailsCard } from './cards/consignment/additional-animal-details.js'
import { importDetailsCard } from './cards/consignment/import-details.js'
import { speciesCards } from './cards/consignment/species/species-cards.js'
import { documentsCard } from './cards/documents.js'
import { arrivalDetailsCard } from './cards/movement/arrival-details.js'
import { transportDetailsCard } from './cards/movement/transport-details.js'

const copy = copyFor({ en, cy })

export const buildSections = (
  answers,
  scope,
  evaluation,
  journeyId,
  readOnly = false
) => {
  const species = speciesCards(journeyId, answers, evaluation, readOnly)
  const documents = documentsCard(journeyId, answers, evaluation, readOnly)
  return [
    {
      heading: copy.sections.aboutTheConsignment,
      groups: [
        {
          heading: copy.groups.consignmentDetails,
          cards: [importDetailsCard(journeyId, answers, scope, readOnly)]
        },
        {
          heading: copy.groups.commodityDetails,
          cards: [
            additionalAnimalDetailsCard(journeyId, answers, scope, readOnly)
          ]
        },
        ...(species.length
          ? [{ heading: copy.groups.species, cards: species }]
          : [])
      ]
    },
    {
      heading: copy.sections.movement,
      groups: [
        {
          heading: null,
          cards: [
            arrivalDetailsCard(journeyId, answers, scope, readOnly),
            transportDetailsCard(journeyId, answers, scope, readOnly)
          ]
        }
      ]
    },
    {
      heading: copy.sections.addresses,
      groups: [
        {
          heading: null,
          cards: [
            rolesAndAddressesCard(journeyId, answers, readOnly),
            contactAddressCard(journeyId, answers, readOnly)
          ]
        }
      ]
    },
    ...(documents
      ? [
          {
            heading: copy.sections.documents,
            groups: [{ heading: null, cards: [documents] }]
          }
        ]
      : [])
  ]
}
