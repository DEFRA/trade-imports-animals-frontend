import { hasIndexedSegments } from '../../../../../bridge/fulfilment-id.js'
import { isObject } from '../shape/object.js'

export const unknownStoredAsRecords = (stored) => {
  if (!isObject(stored)) {
    return false
  }
  const fulfilmentIds = Object.keys(stored)
  return (
    fulfilmentIds.length > 0 &&
    fulfilmentIds.every((fulfilmentId) => hasIndexedSegments(fulfilmentId))
  )
}
