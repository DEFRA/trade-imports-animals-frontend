import * as state from '../../../../../../../engine/index.js'

export const identifierCapOf = (answers, lineIndex) =>
  state.collectionCapAt(answers, [
    'commodityLines',
    lineIndex,
    'animalIdentifiers'
  ])

export const capAllowsEntry = (cap) => cap !== null && cap > 0

export const holdsOneAnimal = (cap) => cap === 1

export const isAtCap = (cap, recordCount) => cap !== null && recordCount >= cap
