import * as state from '../../../../../../../../../../engine/index.js'

export const unitsForCommodityLine = (answers, evaluation, index) =>
  state
    .collectionView(
      answers,
      ['commodityLines', index, 'animalIdentifiers'],
      evaluation
    )
    .map(({ entry: unit }) => unit)
