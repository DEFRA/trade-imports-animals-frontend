import { filterAndProject } from './filter-and-project.js'

/**
 * Shared factory for projection-gate helpers (`allowListed`,
 * `notInUnionOf`). Callers supply the three per-flavour specifics:
 *
 *   - `type`          — stamped onto `.metadata.type`
 *   - `currentValues` — getter for the live allowlist / union;
 *                       wrapped by `Object.defineProperty` on
 *                       `.metadata.values` for lazy static inspection
 *   - `admits`        — the per-value predicate (in-list vs
 *                       not-in-union); `filterAndProject` applies it
 *                       per fulfilmentIndex
 */
export const buildProjectionGate = ({
  type,
  gateObligation,
  currentValues,
  admits,
  projectionGroup,
  reasons
}) => {
  const fn = (fulfilments, fulfilmentIndexesByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      admits,
      projectionGroup,
      fulfilmentIndexesByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type,
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
