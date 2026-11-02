import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { additionalAnimalDetailsCard } from '../cards/consignment/additional-animal-details.js'
import { speciesCards } from '../cards/consignment/species/species-cards.js'

const copy = copyFor({ en, cy })

export const descriptionOfGoodsSection = (
  journeyId,
  answers,
  evaluation,
  readOnly
) => {
  const species = speciesCards(journeyId, answers, evaluation, readOnly)
  return {
    anchor: 'description-of-the-goods',
    heading: copy.sections.descriptionOfTheGoods,
    groups: [
      ...(species.length
        ? [{ heading: copy.groups.commodityDetails, cards: species }]
        : []),
      {
        heading: copy.groups.additionalDetails,
        cards: [additionalAnimalDetailsCard(journeyId, answers, readOnly)]
      }
    ]
  }
}
