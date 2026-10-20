import { animalsField, packagesApply, packagesField } from '../fields.js'
import { commodityCodesOf } from '../lines.js'

export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  speciesText: entry.speciesLatinName,
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

export const linesForGroup = (lines, code, values, errors) =>
  lines
    .filter(({ entry }) => entry.commodityCode === code)
    .map((line) => groupLine(line, values, errors))

export const buildGroups = (lines, values, errors) =>
  commodityCodesOf(lines).map((code, index) => ({
    index,
    code,
    showPackages: packagesApply(code),
    lines: linesForGroup(lines, code, values, errors)
  }))
