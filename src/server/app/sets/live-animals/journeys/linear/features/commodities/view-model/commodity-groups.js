import { commodityCodesOf, linesOfCode } from '../lines.js'
import { legendFor } from '../commodity-legend.js'

export const buildCommodityGroups = (lines) =>
  commodityCodesOf(lines).map((code, index) => ({
    index,
    code,
    heading: legendFor(code),
    lines: linesOfCode(lines, code)
  }))
