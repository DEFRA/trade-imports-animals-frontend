import * as state from '../../../../../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

// The selected CN codes in the order the page shows them — one entry per code,
// however many species lines it holds. Group indexes key back to it.
export const commodityCodesOf = (lines) => [
  ...new Set(lines.map(({ entry }) => entry.commoditySelection))
]
