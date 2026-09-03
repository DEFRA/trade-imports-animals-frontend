import * as commodities from '../../../../../../services/commodities/index.js'
import { commodityNamesOf } from '../lines.js'
import {
  REMOVE_ACTION_PREFIX,
  REMOVE_SPECIES_ACTION_PREFIX
} from '../remove/actions.js'

const commodityRow = (name, code, index) => ({
  code,
  name,
  removeAction: `${REMOVE_ACTION_PREFIX}${index}`
})

const speciesRows = (lines, name, code) =>
  lines
    .filter(({ entry }) => entry.commoditySelection === name)
    .map(({ index, entry }) => ({
      code,
      name: commodities.speciesCommonName(name, entry.speciesSelection),
      removeAction: `${REMOVE_SPECIES_ACTION_PREFIX}${index}`
    }))

// One Selected commodities row per commodity, except under commodity code
// 01061900: there the design gives each chosen species its own row, named by
// the species rather than by the commodity, with a Remove that drops that
// species and keeps the rest of the commodity (design 01-14).
export const buildSelectedRows = (lines) =>
  commodityNamesOf(lines).flatMap((name, index) => {
    const code = commodities.commodityCodeFor(name) ?? ''
    return commodities.speciesListedIndividually(name)
      ? speciesRows(lines, name, code)
      : [commodityRow(name, code, index)]
  })
