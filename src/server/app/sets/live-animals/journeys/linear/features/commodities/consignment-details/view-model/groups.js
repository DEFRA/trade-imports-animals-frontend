import { packagesApply } from '../../../check-answers/view-model/applicability.js'
import { animalsField, packagesField } from '../fields.js'
import { speciesLabel } from '../../species-label.js'
import { buildCommodityGroups } from '../../view-model/commodity-groups.js'

export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  latinName: speciesLabel(entry),
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
    showPackages: packagesApply(group.code),
    lines: group.lines.map((line) => groupLine(line, values, errors))
  }))
