import * as commodities from '../../../../../../services/commodities/index.js'
import { animalsField, packagesApply, packagesField } from '../fields.js'
import { commodityNamesOf } from '../lines.js'

// One quantity block group per commodity, one species block per line — the
// design's Commodity details page over the line-per-species store
// (design 01-14/15). The Selected commodities table rows are built separately,
// in ./selected-rows.js.
export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  speciesText:
    commodities.speciesLabel(entry.speciesSelection) ?? entry.speciesSelection,
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

export const linesForGroup = (lines, name, values, errors) =>
  lines
    .filter(({ entry }) => entry.commoditySelection === name)
    .map((line) => groupLine(line, values, errors))

export const buildGroups = (lines, values, errors) =>
  commodityNamesOf(lines).map((name, index) => ({
    index,
    name,
    code: commodities.commodityCodeFor(name) ?? '',
    showPackages: packagesApply(name),
    lines: linesForGroup(lines, name, values, errors)
  }))
