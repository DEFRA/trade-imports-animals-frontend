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

export const buildGroups = (lines, values, errors) =>
  commodityNamesOf(lines).map((name, index) => ({
    index,
    name,
    code: commodities.commodityCodeFor(name) ?? '',
    showPackages: packagesApply(name),
    lines: linesForGroup(lines, name, values, errors)
  }))
