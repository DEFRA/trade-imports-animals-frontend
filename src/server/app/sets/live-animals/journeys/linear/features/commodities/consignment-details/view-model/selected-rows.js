import * as commodities from '../../../../../../services/commodities/index.js'
import { speciesLabel } from '../../species-label.js'
import { commodityCodesOf, linesOfCode } from '../lines.js'
import {
  REMOVE_ACTION_PREFIX,
  REMOVE_SPECIES_ACTION_PREFIX
} from '../remove/actions.js'

const commodityRow = (lines, code, index) => ({
  code,
  name: linesOfCode(lines, code)
    .map(({ entry }) => speciesLabel(entry))
    .join(', '),
  removeAction: `${REMOVE_ACTION_PREFIX}${index}`
})

const speciesRows = (lines, code) =>
  linesOfCode(lines, code).map(({ index, entry }) => ({
    code,
    name: speciesLabel(entry),
    removeAction: `${REMOVE_SPECIES_ACTION_PREFIX}${index}`
  }))

export const buildSelectedRows = (lines) =>
  commodityCodesOf(lines).flatMap((code, index) =>
    commodities.listsSpeciesIndividually(code)
      ? speciesRows(lines, code)
      : [commodityRow(lines, code, index)]
  )
