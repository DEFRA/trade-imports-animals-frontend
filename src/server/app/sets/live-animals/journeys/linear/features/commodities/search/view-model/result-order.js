import { speciesLabel } from '../../species-label.js'

const byCode = (leftCode, rightCode) => leftCode.localeCompare(rightCode)

export const inCodeOrder = (codes) => [...codes].sort(byCode)

const bySpeciesLabel = (left, right) =>
  speciesLabel(left).localeCompare(speciesLabel(right))

export const inSpeciesLabelOrder = (rows) => [...rows].sort(bySpeciesLabel)
