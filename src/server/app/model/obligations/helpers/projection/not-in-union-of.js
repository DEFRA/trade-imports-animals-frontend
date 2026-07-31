import { deriveUnion } from './internals/derive-union.js'
import { filterAndProject } from './internals/filter-and-project.js'

/**
 * notInUnionOf — dual of `allowListed`. Obligation is in scope on
 * entries whose `gateObligation` stored value is NOT in the union of
 * the given allowlists. The derived union is computed at helper-
 * invocation time (not on each call) and pinned on `.metadata.values`
 * so static analysis (witness synthesiser, browser-side controllers)
 * can inspect "would this value be admitted?" without executing the
 * closure.
 *
 * Two input shapes accepted:
 *   - `[[a, b], [c, d]]` — a list of allowlists (typical case:
 *     `notInUnionOf(commodityCode, [passportCommodities(),
 *     tattooCommodities(), earTagCommodities(), horseNameCommodities()],
 *     unitRecord, reasons)`). The union is set-like — duplicates across
 *     allowlists collapse.
 *   - `[a, b, c]` — a flat list of values (single-allowlist complement).
 *     Ergonomic shorthand; the derived union is just the input.
 *
 * Rationale — `notInUnionOf` as a
 * derived-union helper over `.metadata.values` is STRICTLY better than
 * a hand-restated four-whitelist complement expressed as an opaque JS
 * predicate: adding a fifth typed identifier to one of the source
 * allowlists widens the derived union automatically; a hand-restated
 * complement would silently double-gate if the author forgot to add a
 * fifth `!X.includes(code)` conjunct.
 *
 * See also `allowListed` (identical projection/frame semantics — the
 * two are duals).
 */
export const notInUnionOf = (
  gateObligation,
  unionOfAllowlists,
  projectionGroup,
  reasons
) => {
  const derivedUnion = deriveUnion(unionOfAllowlists)
  const admit = (value) => !derivedUnion.includes(value)
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      admit,
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'notInUnionOf',
    obligation: gateObligation.id,
    values: derivedUnion,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}
