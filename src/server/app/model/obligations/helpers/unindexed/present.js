import { isNonArrayObject } from '../../helper-internals.js'

const isNullish = (value) => value === undefined || value === null
const hasFulfilmentIndexes = (fulfilment) => Object.keys(fulfilment).length > 0

// Predicate primitive — true iff the obligation has any stored value
// (unindexed: not null/undefined; indexed: at least one key). Returns
// a predicate, not an applyTo — compose into `branchedGate` or a
// `.some()` / `.every()` chain for cross-sibling patterns.
export const present = (obligation) => {
  return (fulfilments) => {
    const fulfilment = fulfilments[obligation.id]
    if (isNullish(fulfilment)) {
      return false
    }
    if (isNonArrayObject(fulfilment)) {
      return hasFulfilmentIndexes(fulfilment)
    }
    return true
  }
}
