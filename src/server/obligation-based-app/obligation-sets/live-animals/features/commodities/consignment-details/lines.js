import * as state from '../../../engine/index.js'

export const linesOf = (answers, evaluation) =>
  state.collectionView(answers, ['commodityLines'], evaluation)
