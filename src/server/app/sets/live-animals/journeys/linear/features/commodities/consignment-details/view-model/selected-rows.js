import * as commodities from '../../../../../../services/commodities/index.js'
import { commodityNamesOf, linesOfCommodity } from '../lines.js'
import {
  REMOVE_ACTION_PREFIX,
  REMOVE_SPECIES_ACTION_PREFIX
} from '../remove/actions.js'

const latinNameOf = ({ entry }) =>
  commodities.speciesLatinName(entry.speciesSelection)

const commodityRow = (lines, name, code, index) => ({
  code,
  name,
  latinNames: linesOfCommodity(lines, name).map(latinNameOf),
  removeAction: `${REMOVE_ACTION_PREFIX}${index}`
})

const speciesRows = (lines, name, code) =>
  linesOfCommodity(lines, name).map((line) => ({
    code,
    name: commodities.speciesCommonName(name, line.entry.speciesSelection),
    latinNames: [latinNameOf(line)],
    removeAction: `${REMOVE_SPECIES_ACTION_PREFIX}${line.index}`
  }))

export const buildSelectedRows = (lines) =>
  commodityNamesOf(lines).flatMap((name, index) => {
    const code = commodities.commodityCodeFor(name) ?? ''
    return commodities.speciesListedIndividually(name)
      ? speciesRows(lines, name, code)
      : [commodityRow(lines, name, code, index)]
  })
