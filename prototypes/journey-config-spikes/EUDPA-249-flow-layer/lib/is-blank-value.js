/**
 * isBlankValue — the one blank-check for a stored / submitted
 * fulfilment value. Extracted so contract.js, engine/index.js and the
 * CYA controller cannot drift apart on what "blank" means.
 *
 * A value is blank iff it carries no user-entered content:
 *   - undefined, null              → blank
 *   - '' (empty string)            → blank
 *   - [] (empty array)             → blank
 *   - {}                           → blank (composite with no keys)
 *   - { a: '', b: null, c: '' }    → blank (composite whose every leaf
 *                                    is itself a blank primitive)
 *   - anything else                → not blank
 *
 * Second-code-review context: findings #4 (contract.isBlank), #5 (CYA
 * isBlankLeaf), #6 (engine.firstUnfulfilledPageForLine), #7
 * (engine.hasFulfilment) all had the same latent bug — after Phase B
 * of iteration 7 (address-block composites), stored/submitted values
 * can be plain objects, and the four independent blank checks each
 * treated an all-empty composite as "filled" (or gated on
 * `Object.keys > 0` and let `{}` fall through as non-blank). The
 * knock-on: a required address whose sub-fields the user cleared
 * would roll up to Fulfilled, and firstUnfulfilledPageForLine would
 * skip past it instead of returning to it. Nested composites (an
 * object holding another object with all-empty sub-sub-fields) aren't
 * in the model yet, so this checks one level of composite depth.
 */

export function isBlankValue(value) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const values = Object.values(value)
    if (values.length === 0) return true
    return values.every((v) => v === undefined || v === null || v === '')
  }
  return false
}
