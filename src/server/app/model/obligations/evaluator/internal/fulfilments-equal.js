import { isNonArrayObject } from '../../helper-internals.js'

// purge may recreate indexedFulfilments entries as fresh objects with the
// same content — reference equality wouldn't catch convergence, so compare
// keys and values.
const indexedFulfilmentsEqual = (indexedA, indexedB) => {
  const keysA = Object.keys(indexedA)
  const keysB = Object.keys(indexedB)
  if (keysA.length !== keysB.length) {
    return false
  }
  for (const key of keysA) {
    if (!Object.hasOwn(indexedB, key)) {
      return false
    }
    if (indexedA[key] !== indexedB[key]) {
      return false
    }
  }
  return true
}

// Compare one obligation's fulfilment from each snapshot. Either shape:
// an unindexed value (primitive, null, array — all handled by `===`)
// or an indexedFulfilments map (deep-compared).
const fulfilmentEqual = (fulfilmentA, fulfilmentB) =>
  fulfilmentA === fulfilmentB ||
  (isNonArrayObject(fulfilmentA) &&
    isNonArrayObject(fulfilmentB) &&
    indexedFulfilmentsEqual(fulfilmentA, fulfilmentB))

// Structural equality between two fulfilments snapshots (obligation-id →
// value). Used by the purge fixpoint to detect convergence.
export function fulfilmentsEqual(fulfilmentsA, fulfilmentsB) {
  if (fulfilmentsA === fulfilmentsB) {
    return true
  }
  const keysA = Object.keys(fulfilmentsA)
  const keysB = Object.keys(fulfilmentsB)
  if (keysA.length !== keysB.length) {
    return false
  }
  for (const key of keysA) {
    if (!Object.hasOwn(fulfilmentsB, key)) {
      return false
    }
    if (!fulfilmentEqual(fulfilmentsA[key], fulfilmentsB[key])) {
      return false
    }
  }
  return true
}
