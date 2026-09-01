import { INDEX_DELIMITER } from '../../fulfilment-id.js'

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
