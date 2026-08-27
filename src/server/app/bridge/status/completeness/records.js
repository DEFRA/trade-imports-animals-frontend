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

// The in-scope records for a collection that sit directly under parentRecId
// (parentRecId null -> a top-level collection: all its records).
export const childRecords = (obligation, parentRecId, state) => {
  const records = state.obligations?.[obligation.id]?.records ?? []
  return parentRecId === null
    ? records
    : records.filter((record) =>
        record.fulfilmentIndex.startsWith(`${parentRecId}${INDEX_DELIMITER}`)
      )
}
