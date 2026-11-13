import { commodityNameFor } from '../../../../services/commodities/index.js'

export const commodityLabel = (commodityCode) => {
  const name = commodityNameFor(commodityCode)
  return name ? `${name} (${commodityCode})` : commodityCode
}
