import * as commodities from '../../../../services/commodities/index.js'
import { splitKey } from '../selection/keys.js'

export const selectedSummary = (selected) =>
  selected.map((key) => {
    const [name, species] = splitKey(key)
    const code = commodities.commodityCodeFor(name)
    const label = commodities.speciesLabel(species) ?? species
    return { key, text: `${name} (${code}) — ${label}` }
  })
