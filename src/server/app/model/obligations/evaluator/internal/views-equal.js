import { isKeyedRecord } from './is-keyed-record.js'

// purge may recreate keyed-record entries — compare their keys.
const keyedRecordsEqual = (recordA, recordB) => {
  const recordKeysA = Object.keys(recordA)
  const recordKeysB = Object.keys(recordB)
  if (recordKeysA.length !== recordKeysB.length) {
    return false
  }
  for (const recordKey of recordKeysA) {
    if (!Object.hasOwn(recordB, recordKey)) {
      return false
    }
    if (recordA[recordKey] !== recordB[recordKey]) {
      return false
    }
  }
  return true
}

// Structural equality between two fulfilment views (obligation-id → value).
// Used by the purge fixpoint to detect convergence. Values are compared by
// reference at the top level (purge only ever drops keys or filters
// derived-leaf record maps into a fresh object, so a stable iteration
// re-uses the previous object refs for untouched entries; a filter
// produces a new object even when its contents are identical, which we
// resolve by deep-comparing the keyed-record case).
export function viewsEqual(viewA, viewB) {
  if (viewA === viewB) {
    return true
  }
  const keysA = Object.keys(viewA)
  const keysB = Object.keys(viewB)
  if (keysA.length !== keysB.length) {
    return false
  }
  for (const key of keysA) {
    if (!Object.hasOwn(viewB, key)) {
      return false
    }
    const valueA = viewA[key]
    const valueB = viewB[key]
    if (valueA === valueB) {
      continue
    }
    if (isKeyedRecord(valueA) && isKeyedRecord(valueB)) {
      if (keyedRecordsEqual(valueA, valueB)) {
        continue
      }
      return false
    }
    return false
  }
  return true
}
