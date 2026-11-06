import { isObject } from '../../../../lib/object.js'

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
  (isObject(fulfilmentA) &&
    isObject(fulfilmentB) &&
    indexedFulfilmentsEqual(fulfilmentA, fulfilmentB))

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
