/**
 * isBlankValue — the one blank-check for a stored / submitted
 * fulfilment value, shared so its callers cannot drift apart on what
 * "blank" means.
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
 * Nested composites aren't in the model, so this checks one level of
 * composite depth.
 */

export const isBlankValue = (value) => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const values = Object.values(value)
    if (values.length === 0) return true
    return values.every(
      (leaf) => leaf === undefined || leaf === null || leaf === ''
    )
  }
  return false
}
