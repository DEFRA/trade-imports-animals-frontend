import * as state from '../../../../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)

export const hasAnimalCount = ({ entry }) =>
  String(entry.numberOfAnimalsQuantity ?? '') !== ''

export const commodityNamesOf = (lines) => [
  ...new Set(lines.map(({ entry }) => entry.commoditySelection))
]

export const linesOfCommodity = (lines, name) =>
  lines.filter(({ entry }) => entry.commoditySelection === name)
