import { speciesName } from '../../species-name.js'

// The declared count is a number once the line is saved and the entered string
// on a re-render, so the summary reads it as text either way. A line the user
// has not counted yet shows nothing rather than "undefined".
const countText = (value) => String(value ?? '')

export const buildSelectedCommodities = (lines) =>
  lines.map(({ entry }) => ({
    code: entry.commodityCode ?? '',
    name: speciesName(entry),
    animals: countText(entry.numberOfAnimalsQuantity)
  }))
