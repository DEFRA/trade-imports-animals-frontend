import { INDEX_DELIMITER } from '../../fulfilment-id.js'

// The in-scope fulfilmentIndexes for a collection that sit directly under
// `parentFulfilmentIndex` (null → a top-level collection: all its indexes).
export const childFulfilmentIndexes = (
  obligation,
  parentFulfilmentIndex,
  state
) => {
  const fulfilmentIndexes =
    state.obligations?.[obligation.id]?.fulfilmentIndexes ?? []
  return parentFulfilmentIndex === null
    ? fulfilmentIndexes
    : fulfilmentIndexes.filter((fulfilmentIndex) =>
        fulfilmentIndex.startsWith(`${parentFulfilmentIndex}${INDEX_DELIMITER}`)
      )
}
