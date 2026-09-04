import { filterAndProject } from './filter-and-project.js'

/**
 * Build a projection-gate applyTo function. Centralises the shared
 * outer-wrapper machinery for gate helpers such as `allowListed` and
 * `notInUnionOf`; callers supply the three specifics that vary between
 * gate flavours:
 *
 *   - `type`          — the string stamped onto `.metadata.type`
 *   - `currentValues` — a getter returning the live allowlist / union.
 *                       Wrapped by `Object.defineProperty` on
 *                       `.metadata.values` so static analysis can
 *                       inspect it without executing the closure.
 *   - `admits`        — the predicate `(value) => boolean` deciding which
 *                       stored gate values pass. `filterAndProject`
 *                       applies it per fulfilmentIndex; the
 *                       flavour-specific direction (in-list vs
 *                       not-in-union) lives here.
 *
 * Everything else — the `fulfilments` lookup, the `filterAndProject`
 * call, the `reasons` wrap, the metadata construction and lazy `values`
 * property — is shared and lives in one place.
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
