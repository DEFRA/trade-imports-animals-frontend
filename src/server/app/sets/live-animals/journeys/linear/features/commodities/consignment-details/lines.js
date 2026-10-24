import * as state from '../../../../../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

export const commodityCodesOf = (lines) => [
  ...new Set(lines.map(({ entry }) => entry.commodityCode))
]

export const linesOfCode = (lines, code) =>
  lines.filter(({ entry }) => entry.commodityCode === code)

export const entriesNotOfCode = (entries, code) =>
  entries.filter((entry) => entry.commodityCode !== code)
