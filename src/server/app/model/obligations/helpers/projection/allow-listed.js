import { buildProjectionGate } from './internals/build-projection-gate.js'

/**
 * allowListed — obligation is in scope on entries where
 * `gateObligation`'s stored value is in the allowlist.
 *
 * For depth-1 gates (gate and gated at the same identity level), pass
 * `null` for `projectionGroup`; records are the passing gate keys
 * directly.
 *
 * For depth-N > 1 gates (gate at a broader identity level than the
 * gated obligation), pass the gated obligation's parent group as
 * `projectionGroup`. Records are the group's instance-paths whose
 * ancestor prefix has a gate-passing value. The pipeline's
 * `fulfilmentIndexesByObligationId` map supplies the paths — the
 * obligation code doesn't enumerate them itself.
 *
 * Semantic inverse: see `not-in-union-of.js`. Both share the outer
 * factory in `internals/build-projection-gate.js`; only the predicate
 * direction, the values source, and the metadata `type` differ.
 */
export const allowListed = (
  gateObligation,
  values,
  projectionGroup,
  reasons
) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  return buildProjectionGate({
    type: 'allowListed',
    gateObligation,
    currentValues,
    admits: (value) => currentValues().includes(value),
    projectionGroup,
    reasons
  })
}
