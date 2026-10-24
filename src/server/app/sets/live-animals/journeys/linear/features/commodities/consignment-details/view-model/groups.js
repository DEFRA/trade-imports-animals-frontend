import { packagesApply } from '../../../check-answers/view-model/applicability.js'
import { animalsField, packagesField } from '../fields.js'
import { commodityCodesOf, linesOfCode } from '../lines.js'
import { speciesLabel } from '../../species-label.js'

export const groupLine = ({ index, entry }, values, errors) => ({
  index,
  speciesText: speciesLabel(entry),
  animalsField: animalsField(index),
  packagesField: packagesField(index),
  animalsValue: values[animalsField(index)] ?? '',
  packagesValue: values[packagesField(index)] ?? '',
  animalsError: errors[animalsField(index)],
  packagesError: errors[packagesField(index)]
})

export const linesForGroup = (lines, code, values, errors) =>
  linesOfCode(lines, code).map((line) => groupLine(line, values, errors))

export const buildGroups = (lines, values, errors) =>
  commodityCodesOf(lines).map((code, index) => ({
    index,
    code,
    showPackages: packagesApply(code),
    lines: linesForGroup(lines, code, values, errors)
  }))
