import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { additionalDetailsCard } from '../cards/consignment/additional-details.js'
import { speciesCards } from '../cards/consignment/species/species-cards.js'

const copy = copyFor({ en, cy })

export const descriptionOfGoodsSection = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) => ({
  anchor: 'description-of-the-goods',
  heading: copy.sections.descriptionOfTheGoods,
  cards: [
    ...speciesCards({
      journeyId,
      changeLinkTrail,
      answers,
      evaluation,
      readOnly
    }),
    additionalDetailsCard({
      journeyId,
      changeLinkTrail,
      answers,
      readOnly
    })
  ]
})
