import { isNonArrayObject } from '../../helper-internals.js'

const isNullish = (value) => value === undefined || value === null
const hasFulfilmentIndexes = (fulfilment) => Object.keys(fulfilment).length > 0

/**
 * present — predicate primitive. True iff the given obligation has
 * any stored value. For scalar obligations checks `!== undefined`;
 * for indexed obligations checks the storage map has at least one key.
 *
 * Returns a predicate (not an applyTo). Compose into a `branchedGate`
 * or `.some()` / `.every()` chain with other siblings for
 * cross-sibling patterns.
 */
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
