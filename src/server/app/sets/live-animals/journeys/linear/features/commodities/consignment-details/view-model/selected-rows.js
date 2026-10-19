import * as commodities from '../../../../../../services/commodities/index.js'
import { speciesName } from '../../species-name.js'
import { commodityCodesOf } from '../lines.js'
import {
  REMOVE_ACTION_PREFIX,
  REMOVE_SPECIES_ACTION_PREFIX
} from '../remove/actions.js'

const linesOfCode = (lines, code) =>
  lines.filter(({ entry }) => entry.commoditySelection === code)

const commodityRow = (lines, code, index) => ({
  code,
  name: linesOfCode(lines, code)
    .map(({ entry }) => speciesName(entry))
    .join(', '),
  removeAction: `${REMOVE_ACTION_PREFIX}${index}`
})

const speciesRows = (lines, code) =>
  linesOfCode(lines, code).map(({ index, entry }) => ({
    code,
    name: speciesName(entry),
    removeAction: `${REMOVE_SPECIES_ACTION_PREFIX}${index}`
  }))

// One Selected commodities row per code, naming the species chosen under it,
// except under commodity code 01061900: there the design gives each chosen
// species its own row, with a Remove that drops that species and keeps the
// rest of the commodity (design 01-14).
export const buildSelectedRows = (lines) =>
  commodityCodesOf(lines).flatMap((code, index) =>
    commodities.speciesListedIndividually(code)
      ? speciesRows(lines, code)
      : [commodityRow(lines, code, index)]
  )
