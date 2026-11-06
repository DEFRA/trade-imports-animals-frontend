import { speciesLabel } from '../../species-label.js'
import { legendFor } from '../../commodity-legend.js'

const byLegend = (leftCode, rightCode) =>
  legendFor(leftCode).localeCompare(legendFor(rightCode))

export const inLegendOrder = (codes) => [...codes].sort(byLegend)

const bySpeciesLabel = (left, right) =>
  speciesLabel(left).localeCompare(speciesLabel(right))

export const inSpeciesLabelOrder = (rows) => [...rows].sort(bySpeciesLabel)
