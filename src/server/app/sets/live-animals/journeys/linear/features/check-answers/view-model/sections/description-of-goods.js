import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { additionalAnimalDetailsCard } from '../cards/consignment/additional-animal-details.js'
import { speciesCards } from '../cards/consignment/species/species-cards.js'

const copy = copyFor({ en, cy })

/**
 * Design release 2.1's second numbered section: what is in the consignment.
 * The commodity lines lead, each as its own card, and the Additional details
 * card for the answers that apply across the whole consignment follows. Every
 * card stands straight under the section heading.
 *
 * The section heading always stands, even with no commodity lines yet — the
 * error summary's species entry anchors to it, and a trader with no lines yet
 * still has to land somewhere.
 */
export const descriptionOfGoodsSection = (
  journeyId,
  answers,
  evaluation,
  readOnly
) => ({
  anchor: 'description-of-the-goods',
  heading: copy.sections.descriptionOfTheGoods,
  cards: [
    ...speciesCards(journeyId, answers, evaluation, readOnly),
    additionalAnimalDetailsCard(journeyId, answers, readOnly)
  ]
})
