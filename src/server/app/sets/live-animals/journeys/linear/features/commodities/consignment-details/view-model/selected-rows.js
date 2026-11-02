import { buildSelectedCommodityRows } from '../../view-model/selected-commodity-rows.js'
import {
  REMOVE_ACTION_PREFIX,
  REMOVE_SPECIES_ACTION_PREFIX
} from '../remove/actions.js'

const removeActionOf = ({ perSpecies, groupIndex, lines }) =>
  perSpecies
    ? `${REMOVE_SPECIES_ACTION_PREFIX}${lines[0].index}`
    : `${REMOVE_ACTION_PREFIX}${groupIndex}`

export const buildSelectedRows = (lines) =>
  buildSelectedCommodityRows(lines).map((row) => ({
    code: row.code,
    latinNames: row.latinNames,
    removeAction: removeActionOf(row)
  }))
