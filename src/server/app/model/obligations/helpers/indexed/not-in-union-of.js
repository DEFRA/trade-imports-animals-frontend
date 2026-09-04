import { deriveUnion } from './internals/derive-union.js'
import { buildIndexedGate } from './internals/build-indexed-gate.js'

/**
 * notInUnionOf — dual of `allowListed`. In scope on entries whose
 * `gateObligation` stored value is NOT in the union of the given
 * allowlists. The union is derived at call-time and exposed on
 * `.metadata.values`, so static analysis can ask "would this value be
 * admitted?" without executing the closure.
 *
 * Accepts either `[[a, b], [c, d]]` (list of allowlists — duplicates
 * collapse) or `[a, b, c]` (flat single-list shorthand).
 *
 * The derived-union approach is deliberately stronger than a
 * hand-restated multi-allowlist complement: adding a fifth entry to a
 * source allowlist widens the union automatically, whereas a
 * hand-written `!a.includes(x) && !b.includes(x) && …` predicate would
 * silently double-gate if the author forgot to add the fifth
 * conjunct.
 */
export const notInUnionOf = (
  gateObligation,
  unionOfAllowlists,
  gatedParentGroup,
  reasons
) => {
  const currentValues = () =>
    deriveUnion(
      typeof unionOfAllowlists === 'function'
        ? unionOfAllowlists()
        : unionOfAllowlists
    )
  return buildIndexedGate({
    gateType: 'notInUnionOf',
    gateObligation,
    currentValues,
    admits: (value) => !currentValues().includes(value),
    gatedParentGroup,
    reasons
  })
}
