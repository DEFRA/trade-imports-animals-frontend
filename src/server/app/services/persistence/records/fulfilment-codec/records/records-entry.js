import { fail } from '../fail.js'
import { isObject } from '../shape/object.js'
import { validateFulfilmentId } from '../validate/fulfilment-id.js'
import { validateValue } from '../validate/value.js'

export const recordsEntry = (obligationId, stored, obligation) => {
  if (!isObject(stored)) {
    fail(`obligation ${obligationId} must contain a records map`)
  }

  const records = Object.entries(stored)
  if (records.length === 0) {
    fail(`records for ${obligationId} must not be empty`)
  }

  return {
    obligationId,
    records: records.map(([fulfilmentId, value]) => {
      validateFulfilmentId(fulfilmentId, obligation)
      validateValue(value, `record "${fulfilmentId}"`)
      return { fulfilmentId, value }
    })
  }
}
