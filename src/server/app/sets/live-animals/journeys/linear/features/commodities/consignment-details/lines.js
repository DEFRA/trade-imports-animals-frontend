import * as state from '../../../../../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

// The selected commodities in the order the page shows them — one entry per
// commodity, however many species lines it holds. Group indexes key back to it.
export const commodityNamesOf = (lines) => [
  ...new Set(lines.map(({ entry }) => entry.commoditySelection))
]
