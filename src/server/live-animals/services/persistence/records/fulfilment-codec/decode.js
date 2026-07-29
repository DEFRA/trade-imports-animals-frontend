import { fail } from './fail.js'
import { obligationsById } from './obligations/lookup.js'
import { decodeRecords } from './records/decode-records.js'
import { hasExactlyKeys, hasOwn, isObject } from './shape/object.js'
import { validateCurrentForm } from './validate/current-form.js'
import { validateObligationId } from './validate/obligation-id.js'
import { validateValue } from './validate/value.js'

/**
 * Convert persisted obligation entries to the evaluator's UUID-keyed map.
 *
 * Entry order becomes the map's own key order. Values are not interpreted,
 * cloned, or coerced.
 *
 * @param {Array<object>} entryArr persisted fulfilment entries
 * @returns {object} evaluator fulfilments
 */
export const decodePersistedFulfilment = (entryArr) => {
  if (!Array.isArray(entryArr)) {
    fail('fulfilment must be an array')
  }

  const seenObligationIds = new Set()
  const decoded = []

  for (const entry of entryArr) {
    if (!isObject(entry)) {
      fail('each entry must be an object')
    }

    const hasValue = hasOwn(entry, 'value')
    const hasRecords = hasOwn(entry, 'records')
    if (hasValue === hasRecords) {
      fail('each entry must contain exactly one of value or records')
    }

    const form = hasValue ? 'value' : 'records'
    const expectedKeys =
      form === 'value' ? ['obligationId', 'value'] : ['obligationId', 'records']
    if (!hasExactlyKeys(entry, expectedKeys)) {
      fail(`a ${form} entry must contain exactly obligationId and ${form}`)
    }

    const { obligationId } = entry
    validateObligationId(obligationId)
    if (seenObligationIds.has(obligationId)) {
      fail(`duplicate obligationId "${obligationId}"`)
    }
    validateCurrentForm(obligationId, form)

    const obligation = obligationsById.get(obligationId)
    let stored
    if (form === 'records') {
      stored = decodeRecords(entry, obligation)
    } else {
      validateValue(entry.value, `obligation ${obligationId}`)
      stored = entry.value
    }

    seenObligationIds.add(obligationId)
    decoded.push([obligationId, stored])
  }

  return Object.fromEntries(decoded)
}
