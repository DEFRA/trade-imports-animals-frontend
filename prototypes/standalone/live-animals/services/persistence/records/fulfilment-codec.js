/**
 * Storage codec for the evaluator's fulfilments map.
 *
 * Persistence uses an array so obligation and fulfilment ids are ordinary
 * fields. The evaluator continues to receive its existing UUID-keyed map.
 * Both directions preserve input order and pass values through unchanged.
 */

import { groups, obligations } from '../../../model/obligations/obligations.js'

const obligationsById = new Map(
  obligations.map((obligation) => [obligation.id, obligation])
)
const groupIds = new Set(groups.map((group) => group.id))

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const hasExactlyKeys = (value, expected) => {
  const keys = Object.keys(value)
  return (
    keys.length === expected.length &&
    expected.every((key) => hasOwn(value, key))
  )
}

const fail = (message) => {
  throw new TypeError(`Invalid persisted fulfilment: ${message}`)
}

const validateObligationId = (obligationId) => {
  if (typeof obligationId !== 'string' || obligationId.length === 0) {
    fail('obligationId must be a non-empty string')
  }
}

const validateValue = (value, location) => {
  if (value === undefined) {
    fail(`${location} value must be present`)
  }
}

const segmentsOf = (fulfilmentId) => fulfilmentId.split('/')

const hasIndexedSegments = (fulfilmentId) =>
  typeof fulfilmentId === 'string' &&
  fulfilmentId.length > 0 &&
  segmentsOf(fulfilmentId).every(
    (segment) => segment.length > 0 && /\d+$/.test(segment)
  )

const depthOf = (obligation) => {
  let depth = 0
  let ancestor = obligation.within
  while (ancestor) {
    depth += 1
    ancestor = ancestor.within
  }
  return depth
}

const validateFulfilmentId = (fulfilmentId, obligation) => {
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

const validateCurrentForm = (obligationId, form) => {
  const obligation = obligationsById.get(obligationId)
  if (!obligation) return

  if (groupIds.has(obligationId)) {
    fail(`structural group ${obligationId} cannot carry a fulfilment`)
  }

  const expectedForm = obligation.within ? 'records' : 'value'
  if (form !== expectedForm) {
    fail(`obligation ${obligationId} must use ${expectedForm}`)
  }
}

const decodeRecords = (entry, obligation) => {
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

const recordsEntry = (obligationId, stored, obligation) => {
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

const unknownStoredAsRecords = (stored) => {
  if (!isObject(stored)) return false
  const fulfilmentIds = Object.keys(stored)
  return (
    fulfilmentIds.length > 0 &&
    fulfilmentIds.every((fulfilmentId) => hasIndexedSegments(fulfilmentId))
  )
}

/**
 * Convert the evaluator's UUID-keyed map to persisted obligation entries.
 *
 * The map's own key order becomes entry order. Record-map key order becomes
 * nested record order.
 *
 * @param {object} map evaluator fulfilments
 * @returns {Array<object>} persisted fulfilment entries
 */
export const encodeEvaluatorFulfilments = (map) => {
  if (!isObject(map)) {
    fail('evaluator fulfilments must be an object')
  }

  return Object.entries(map).map(([obligationId, stored]) => {
    validateObligationId(obligationId)
    const obligation = obligationsById.get(obligationId)

    if (obligation) {
      const form = obligation.within ? 'records' : 'value'
      validateCurrentForm(obligationId, form)
      if (form === 'records') {
        return recordsEntry(obligationId, stored, obligation)
      }
    } else if (unknownStoredAsRecords(stored)) {
      return recordsEntry(obligationId, stored)
    }

    validateValue(stored, `obligation ${obligationId}`)
    return { obligationId, value: stored }
  })
}

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
