import { isBlankValue } from './is-blank-value.js'
import { deriveUnion } from './helpers/internals/derive-union.js'

export const isNonArrayObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const samePair = (listed, value) =>
  Array.isArray(listed) &&
  listed.length === value.length &&
  listed.every((part, position) => part === value[position])

// Whether a gate's list holds `value`: a pair such as `[code, species]`
// matches a listed pair part for part, any other value matches by identity.
export const listsGateValue = (values, value) =>
  Array.isArray(value)
    ? values.some((listed) => samePair(listed, value))
    : values.includes(value)

const COMPLEMENT_GATE_TYPES = new Set(['notInUnionOf', 'anyNotInUnionOf'])

export const resolveUnion = (unionOfLists) =>
  deriveUnion(
    typeof unionOfLists === 'function' ? unionOfLists() : unionOfLists
  )

export const isOutsideUnion = (value, union) =>
  !isBlankValue(value) && !union.includes(value)

/**
 * Whether a gate admits a value, read from the gate's metadata alone: a
 * complement gate admits a value that is not blank and not in its union,
 * every other gate admits what its list holds.
 *
 * @param {object} [metadata] - the gate's `applyTo.metadata`.
 * @param {*} value - the value to test against the gate's list.
 * @returns {boolean}
 */
export const admitsValue = (metadata, value) => {
  const values = metadata?.values ?? []
  return COMPLEMENT_GATE_TYPES.has(metadata?.gateType)
    ? isOutsideUnion(value, values)
    : listsGateValue(values, value)
}

// Read `fulfilments[gateId]` and normalise to `{ present, candidates }`:
//   - undefined            → { present: false, candidates: [] }
//   - indexedFulfilments   → { present: true,  candidates: Object.values(...) }
//   - anything else        → { present: true,  candidates: [value] }
// Arrays fall through the last branch as one opaque candidate (not spread).
export const readGate = (fulfilments, gateId) => {
  const fulfilment = fulfilments[gateId]
  if (fulfilment === undefined) {
    return { present: false, candidates: [] }
  }
  if (isNonArrayObject(fulfilment)) {
    return { present: true, candidates: Object.values(fulfilment) }
  }
  return { present: true, candidates: [fulfilment] }
}
