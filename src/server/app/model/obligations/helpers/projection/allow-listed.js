import { filterAndProject } from './internals/filter-and-project.js'

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
 */
export const allowListed = (
  gateObligation,
  values,
  projectionGroup,
  reasons
) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      (value) => currentValues().includes(value),
      projectionGroup,
      fulfilmentIndexesByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'allowListed',
    obligation: gateObligation.id,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  Object.defineProperty(fn.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return fn
}
