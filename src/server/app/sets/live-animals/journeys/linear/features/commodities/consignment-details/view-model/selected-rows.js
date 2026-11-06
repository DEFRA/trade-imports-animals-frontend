import { buildSelectedCommodityRows } from '../../view-model/selected-commodity-rows.js'
import { lineKey } from '../../search/selection/line-key.js'
import { removeActionFor, removeSpeciesActionFor } from '../remove/actions.js'

const removeActionOf = ({ perSpecies, code, lines }) =>
  perSpecies
    ? removeSpeciesActionFor(lineKey(lines[0].entry))
    : removeActionFor(code)

export const buildSelectedRows = (lines) =>
  buildSelectedCommodityRows(lines).map((row) => ({
    code: row.code,
    labels: row.labels,
    removeAction: removeActionOf(row)
  }))
