import * as commodities from '../../../../../services/commodities/index.js'
import { commodityNamesOf, linesOfCommodity } from '../lines.js'

export const buildCommodityGroups = (lines) =>
  commodityNamesOf(lines).map((name, index) => {
    const code = commodities.commodityCodeFor(name) ?? ''
    return {
      index,
      name,
      code,
      heading: `${name} (${code})`,
      lines: linesOfCommodity(lines, name)
    }
  })
