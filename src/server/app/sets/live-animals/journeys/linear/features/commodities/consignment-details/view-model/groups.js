import { animalsField, packagesApply, packagesField } from '../fields.js'
import { commodityCodesOf } from '../lines.js'

// One quantity block group per CN code, one species block per line — the
// design's Commodity details page over the line-per-species store
// (design 01-14/15). Each species is named by its scientific name. The
// Selected commodities table rows are built separately, in ./selected-rows.js.
export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  speciesText: entry.speciesSelection,
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

export const linesForGroup = (lines, code, values, errors) =>
  lines
    .filter(({ entry }) => entry.commoditySelection === code)
    .map((line) => groupLine(line, values, errors))

export const buildGroups = (lines, values, errors) =>
  commodityCodesOf(lines).map((code, index) => ({
    index,
    code,
    showPackages: packagesApply(code),
    lines: linesForGroup(lines, code, values, errors)
  }))
