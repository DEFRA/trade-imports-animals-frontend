import * as commodities from '../../../../../../services/commodities/index.js'
import { animalsField, packagesApply, packagesField } from '../fields.js'
import { commodityNamesOf, linesOfCommodity } from '../lines.js'

export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  latinName: commodities.speciesLatinName(entry.speciesSelection),
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

export const linesForGroup = (lines, name, values, errors) =>
  linesOfCommodity(lines, name).map((line) => groupLine(line, values, errors))

const groupOf = (lines, values, errors) => (name, index) => {
  const code = commodities.commodityCodeFor(name) ?? ''
  return {
    index,
    name,
    code,
    label: commodities.commodityLabel(name, code),
    showPackages: packagesApply(name),
    lines: linesForGroup(lines, name, values, errors)
  }
}

export const buildGroups = (lines, values, errors) =>
  commodityNamesOf(lines).map(groupOf(lines, values, errors))
