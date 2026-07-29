import { fail } from '../fail.js'
import { hasExactlyKeys, isObject } from '../shape/object.js'
import { validateFulfilmentId } from '../validate/fulfilment-id.js'
import { validateValue } from '../validate/value.js'

export const decodeRecords = (entry, obligation) => {
  if (!Array.isArray(entry.records) || entry.records.length === 0) {
    fail(`records for ${entry.obligationId} must be a non-empty array`)
  }

  const seenFulfilmentIds = new Set()
  const records = []
  for (const record of entry.records) {
    if (
      !isObject(record) ||
      !hasExactlyKeys(record, ['fulfilmentId', 'value'])
    ) {
      fail(
        `each record for ${entry.obligationId} must contain exactly ` +
          'fulfilmentId and value'
      )
    }

    const { fulfilmentId, value } = record
    if (seenFulfilmentIds.has(fulfilmentId)) {
      fail(
        `duplicate fulfilmentId "${String(fulfilmentId)}" for ` +
          entry.obligationId
      )
    }
    validateFulfilmentId(fulfilmentId, obligation)
    validateValue(value, `record "${fulfilmentId}"`)
    seenFulfilmentIds.add(fulfilmentId)
    records.push([fulfilmentId, value])
  }

  return Object.fromEntries(records)
}
