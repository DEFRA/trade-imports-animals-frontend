/**
 * Shape-level utilities shared by the gate helpers — the
 * "stored fulfilment → candidate values" normalisation used by
 * `anyAllowListed`, `runGate`, and `present`.
 *
 * Kept in a separate module (not re-exported through `helpers/index.js`)
 * so the `analysis/coverage.test.js` invariant — "every `helpers/index.js`
 * named export is an applyTo factory" — still holds.
 */

// True iff `value` is a non-null non-array object — the shape check that
// separates indexedFulfilments from unindexed fulfilments in callers.
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
