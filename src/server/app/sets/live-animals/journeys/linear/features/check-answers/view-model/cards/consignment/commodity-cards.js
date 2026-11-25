import { copyFor } from '../../../../../../../../../shared/copy.js'
import { copy as en } from '../../../copy/copy.en.js'
import { copy as cy } from '../../../copy/copy.cy.js'
import { linesOf } from '../../../../commodities/lines.js'
import { consignmentDetailsPage } from '../../../../commodities/page.js'
import { buildCommodityGroups } from '../../../../commodities/view-model/commodity-groups.js'
import { reviewCardAnchor } from '../../incomplete-cards.js'
import { changeAction, editableActions } from '../../rows/change-link.js'
import { speciesBlock } from './species/species-block.js'

const copy = copyFor({ en, cy })

const firstCardAnchor = (position) =>
  position === 0 ? { anchor: reviewCardAnchor('commodityDetails') } : {}

export const commodityCards = ({
  journeyId,
  changeLinkTrail,
  answers,
  evaluation,
  readOnly
}) =>
  buildCommodityGroups(linesOf(answers, evaluation)).map(
    ({ heading, lines }, position) => ({
      title: heading,
      ...firstCardAnchor(position),
      ...editableActions({
        readOnly,
        actions: changeAction(
          { journeyId, changeLinkTrail },
          consignmentDetailsPage.slug,
          copy.hidden.commodity(heading)
        )
      }),
      speciesBlocks: lines.map((line) =>
        speciesBlock({
          journeyId,
          changeLinkTrail,
          answers,
          evaluation,
          readOnly,
          line
        })
      )
    })
  )
