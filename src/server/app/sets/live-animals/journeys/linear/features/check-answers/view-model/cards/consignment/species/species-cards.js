import * as state from '../../../../../../../../../../engine/index.js'
import { editableActions } from '../../../rows/change-link.js'
import { identifierTable } from './identifier-table.js'
import { speciesCardActions } from './species-card-actions.js'
import { speciesCardRows } from './species-card-rows.js'
import { speciesCardTitle } from './species-card-title.js'
import { unitsForCommodityLine } from './units-for-commodity-line.js'

export const speciesCards = (journeyId, answers, evaluation, readOnly) =>
  state
    .collectionView(answers, ['commodityLines'], evaluation)
    .map(({ index, entry }) => ({
      title: speciesCardTitle(entry),
      ...editableActions(readOnly, speciesCardActions(journeyId, index)),
      rows: speciesCardRows(entry),
      identifierTable: identifierTable(
        unitsForCommodityLine(answers, evaluation, index),
        entry.commoditySelection
      )
    }))
