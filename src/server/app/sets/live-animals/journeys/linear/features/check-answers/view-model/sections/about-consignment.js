import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { additionalAnimalDetailsCard } from '../cards/consignment/additional-animal-details.js'
import { importDetailsCard } from '../cards/consignment/import-details.js'
import { speciesCards } from '../cards/consignment/species/species-cards.js'

const copy = copyFor({ en, cy })

export const aboutConsignmentSection = (
  journeyId,
  answers,
  scope,
  evaluation,
  readOnly
) => {
  const species = speciesCards(journeyId, answers, evaluation, readOnly)
  return {
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
  }
}
