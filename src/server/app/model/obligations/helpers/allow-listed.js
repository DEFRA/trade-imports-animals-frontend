import { buildGate } from './internals/build-gate.js'

/**
 * allowListed — in scope on entries where `gateObligation`'s stored
 * value is in the allowlist.
 *
 * - Depth-1 (gate + gated at the same identity level): pass `null` for
 *   `gatedParentGroup`; fulfilmentIndexes are the passing gate keys.
 * - Depth-N > 1 (gate broader than gated): pass the gated obligation's
 *   parent group as `gatedParentGroup`; fulfilmentIndexes are that
 *   group's fulfilmentIndexes whose ancestor prefix has a passing gate.
 *
 * Semantic inverse: `not-in-union-of.js`. Both share the outer factory
 * in `internals/build-gate.js`.
 */
export const allowListed = (
  gateObligation,
  values,
  gatedParentGroup,
  reasons
) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  return buildGate({
    gateType: 'allowListed',
    gateObligation,
    currentValues,
    admits: (value) => currentValues().includes(value),
    gatedParentGroup,
    reasons
  })
}
