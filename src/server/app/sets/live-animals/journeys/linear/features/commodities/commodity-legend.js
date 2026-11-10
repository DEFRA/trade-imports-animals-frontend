import { commodityNameFor } from '../../../../services/commodities/index.js'

export const legendFor = (commodityCode) => commodityCode

export const namedLegendFor = (commodityCode) => {
  const name = commodityNameFor(commodityCode)
  return name ? `${name} (${commodityCode})` : legendFor(commodityCode)
}
