import * as state from '../../../../../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

export const commodityCodesOf = (lines) => [
  ...new Set(lines.map(({ entry }) => entry.commodityCode))
]
