/**
 * Shared internals for `helpers.js` — canonical "stored fulfilment
 * value → candidate scalars" normalization. Extracted so the same
 * three-branch shape-test isn't duplicated across `anyAllowListed`,
 * `filterAndProject`, and `present`.
 *
 * Kept in a separate module (not a named export of `helpers.js`) so the
 * `analysis/coverage.test.js` invariant — "every helpers.js named export
 * is an applyTo factory" — still holds. These are shape-level utilities,
 * not gate helpers.
 *
 * Two functions:
 *   - `isRecordMap(value)` — shape test. Answers the taxonomy question
 *     (top-level scalar vs group-scoped gate).
 *   - `readGate(fulfilments, gateId) → { present, candidates }` — one
 *     canonical read of the stored value. `present` flags "any stored
 *     value at all"; `candidates` is the flattened array of scalar
 *     values callers check against an allowlist / target.
 *
 * Semantics preserved verbatim from the original inline logic:
 *   - `undefined` stored value → `{ present: false, candidates: [] }`
 *   - records-map (plain object) → `{ present: true, candidates:
 *     Object.values(stored) }`
 *   - anything else (scalar, null, array, boolean, number) → `{ present:
 *     true, candidates: [stored] }`. Arrays fall through to the scalar
 *     branch (preserves the `!Array.isArray(stored)` guard — an array-
 *     valued fulfilment is one opaque candidate, not spread).
 */

/**
 * isRecordMap — true iff `value` is a plain records-keyed object
 * (not a scalar, not null, not an array). Distinguishes group-scoped
 * fulfilments (`{lineId1: value, ...}`) from top-level scalar
 * fulfilments.
 *
 * @param {*} value
 * @returns {boolean}
 */
export const isRecordMap = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * readGate — canonical "stored → candidates" normalization. Reads
 * `fulfilments[gateId]` and returns `{ present, candidates }`.
 *
 * @param {object} fulfilments - the raw storage map.
 * @param {string} gateId - the obligation id whose stored value to read.
 * @returns {{ present: boolean, candidates: unknown[] }}
 */
export const readGate = (fulfilments, gateId) => {
  const stored = fulfilments[gateId]
  if (stored === undefined) return { present: false, candidates: [] }
  if (isRecordMap(stored)) {
    return { present: true, candidates: Object.values(stored) }
  }
  return { present: true, candidates: [stored] }
}
