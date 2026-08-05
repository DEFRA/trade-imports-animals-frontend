import {
  depthOf,
  hasIndexedSegments,
  segmentsOf
} from '../../../../../bridge/fulfilment-id.js'
import { fail } from '../fail.js'

export const validateFulfilmentId = (fulfilmentId, obligation) => {
  if (!hasIndexedSegments(fulfilmentId)) {
    fail(
      `fulfilmentId "${String(
        fulfilmentId
      )}" must have a trailing numeric index on every segment`
    )
  }

  if (obligation) {
    const actualDepth = segmentsOf(fulfilmentId).length
    const expectedDepth = depthOf(obligation)
    if (actualDepth !== expectedDepth) {
      fail(
        `fulfilmentId "${fulfilmentId}" has depth ${actualDepth}; ` +
          `${obligation.id} requires depth ${expectedDepth}`
      )
    }
  }
}
