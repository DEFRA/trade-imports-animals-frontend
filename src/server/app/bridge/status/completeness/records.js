import { INDEX_DELIMITER } from '../../fulfilment-id.js'

// The record map for a grouped leaf ({ fulfilmentIndex: value }), or undefined.
export const recordMap = (obligation, state) => {
  const stored = state.fulfilments?.[obligation.id]
  if (
    stored === undefined ||
    stored === null ||
    typeof stored !== 'object' ||
    Array.isArray(stored)
  ) {
    return undefined
  }
  return stored
}

// The in-scope records for a collection that sit directly under
// `parentFulfilmentIndex` (null -> a top-level collection: all its records).
export const childRecords = (obligation, parentFulfilmentIndex, state) => {
  const records = state.obligations?.[obligation.id]?.records ?? []
  return parentFulfilmentIndex === null
    ? records
    : records.filter((record) =>
        record.fulfilmentIndex.startsWith(
          `${parentFulfilmentIndex}${INDEX_DELIMITER}`
        )
      )
}
