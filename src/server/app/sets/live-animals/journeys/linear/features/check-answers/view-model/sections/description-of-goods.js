import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { additionalAnimalDetailsCard } from '../cards/consignment/additional-animal-details.js'
import { speciesCards } from '../cards/consignment/species/species-cards.js'

const copy = copyFor({ en, cy })

/**
 * Design release 1's second numbered section: what is in the consignment. The
 * commodity lines lead, each as its own card under one heading, and the
 * answers that apply across the whole consignment follow.
 *
 * The commodity group stands only while there are lines to show, but the
 * section heading always does — the error summary's species entry anchors to
 * it, and a trader with no lines yet still has to land somewhere.
 */
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
