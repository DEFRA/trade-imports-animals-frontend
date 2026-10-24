import { speciesLabel } from '../../species-label.js'

const countText = (value) => String(value ?? '')

export const buildSelectedCommodities = (lines) =>
  lines.map(({ entry }) => ({
    code: entry.commodityCode,
    name: speciesLabel(entry),
    animals: countText(entry.numberOfAnimalsQuantity)
  }))
