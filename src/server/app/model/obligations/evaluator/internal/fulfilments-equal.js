import { isNonArrayObject } from '../../helper-internals.js'

// purge may recreate indexedFulfilments entries — compare their keys.
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

const fulfilmentValuesEqual = (valueA, valueB) =>
  valueA === valueB ||
  (isNonArrayObject(valueA) &&
    isNonArrayObject(valueB) &&
    indexedFulfilmentsEqual(valueA, valueB))

// Structural equality between two fulfilments snapshots (obligation-id →
// value). Used by the purge fixpoint to detect convergence. Values are
// compared by reference at the top level (purge only ever drops keys or
// filters an indexedFulfilments map into a fresh object, so a stable
// iteration re-uses the previous object refs for untouched entries; a
// filter produces a new object even when its contents are identical, which
// we resolve by deep-comparing the indexedFulfilments case).
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
    if (!fulfilmentValuesEqual(fulfilmentsA[key], fulfilmentsB[key])) {
      return false
    }
  }
  return true
}
