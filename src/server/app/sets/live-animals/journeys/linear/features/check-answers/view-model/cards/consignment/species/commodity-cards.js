import * as state from '../../../../../../../../../../engine/index.js'
import { consignmentDetailsPage } from '../../../../../commodities/page.js'
import { changeAction, editableActions } from '../../../rows/change-link.js'
import { COMMODITY_DETAILS_ANCHOR } from '../../../incomplete-cards.js'
import { speciesBlockAnchor } from '../../../species-errors.js'
import { commodityCardTitle } from './commodity-card-title.js'
import { speciesBlock } from './species-block.js'
import { unitsForCommodityLine } from './units-for-commodity-line.js'

const commodityKey = ({ entry }) => (entry.commoditySelection ?? '').trim()

/** Lines grouped by commodity, in the order each commodity first appears. */
const groupByCommodity = (items) =>
  [
    ...items
      .reduce((groups, item) => {
        const key = commodityKey(item)
        return groups.set(key, [...(groups.get(key) ?? []), item])
      }, new Map())
      .entries()
  ].map(([key, lines]) => ({ key, lines }))

/** One card per commodity, one block per species line inside it. The cards carry
 * no `id`, so an unfinished notification never marks them; the first carries
 * the anchor the "Complete commodity details" entry links to. Each species
 * block carries the anchor a species' summary entry links to. */
export const commodityCards = (journeyId, answers, evaluation, readOnly) =>
  groupByCommodity(
    state.collectionView(answers, ['commodityLines'], evaluation)
  ).map(({ key, lines }, cardIndex) => {
    const title = commodityCardTitle(key)
    return {
      title,
      ...editableActions(
        readOnly,
        changeAction(journeyId, consignmentDetailsPage.slug, title)
      ),
      rows: [],
      speciesBlocks: lines.map(({ index, entry }) => ({
        ...speciesBlock(
          journeyId,
          entry,
          unitsForCommodityLine(answers, evaluation, index),
          readOnly
        ),
        anchor: speciesBlockAnchor(index)
      })),
      ...(cardIndex === 0 ? { anchor: COMMODITY_DETAILS_ANCHOR } : {})
    }
  })
