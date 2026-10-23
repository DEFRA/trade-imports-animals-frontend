import * as commodities from '../../../../../../services/commodities/index.js'
import { animalsField, packagesApply, packagesField } from '../fields.js'
import { buildCommodityGroups } from '../../view-model/commodity-groups.js'

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

export const buildGroups = (lines, values, errors) =>
  buildCommodityGroups(lines).map((group) => ({
    ...group,
    showPackages: packagesApply(group.name),
    lines: group.lines.map((line) => groupLine(line, values, errors))
  }))
