import { commodityCodesOf, linesOfCode } from '../lines.js'

export const buildCommodityGroups = (lines) =>
  commodityCodesOf(lines).map((code, index) => ({
    index,
    code,
    heading: code,
    lines: linesOfCode(lines, code)
  }))
