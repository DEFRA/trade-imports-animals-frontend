/**
 * applyTo helper library — pure functions that build applyTo functions.
 *
 * Part of a prototype exploring "consolidate on applyTo + helpers" as
 * an alternative to the gatedBy DSL. Companion to
 * `obligations-all-applyto.js`.
 *
 * Design contract:
 *   - Each helper is a pure function returning an
 *     `applyTo(fulfilments, fulfilmentIdsByObligationId) → decision`.
 *   - `fulfilments` is the raw storage map.
 *   - `fulfilmentIdsByObligationId` is a `Map<obligationId, string[]>`
 *     giving current instance-paths per obligation (in particular per
 *     group, so a gated obligation can look up its parent-group's
 *     instances without enumerating storage itself).
 *   - Each returned function has a `.metadata` property describing
 *     the gate declaratively. Enables optional static
 *     introspection / cross-language export without giving up the
 *     imperative-JS surface.
 *
 * All helpers are unit-testable in isolation — see helpers.test.js.
 */

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
 * `fulfilmentIdsByObligationId` map supplies the paths — the
 * obligation code doesn't enumerate them itself.
 */
export function allowListed(gateObligation, values, projectionGroup, reasons) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      (value) => values.includes(value),
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'allowListed',
    obligation: gateObligation.id,
    values,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * allowListedByPredicate — like `allowListed` but the allowlist is
 * expressed as a predicate function. Useful for inverse gates (`not in
 * any of these lists`) and other conditions not expressible as a plain
 * value array.
 */
export function allowListedByPredicate(
  gateObligation,
  predicate,
  projectionGroup,
  reasons
) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      predicate,
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'allowListedByPredicate',
    obligation: gateObligation.id,
    // Expose the predicate so callers can ask "would this value be
    // admitted?" without executing the whole applyTo closure (which
    // requires evaluator state). Used by browser-side helpers like
    // features/units/pickSeedObligationForLine to decide whether a
    // fresh line's commodity code opens this obligation.
    predicate,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * anyAllowListed — scalar aggregation. True if ANY of the gate
 * obligation's stored values is in the allowlist. Returns whenTrue on
 * match, whenFalse on miss. Handles per-line-gate → notification-level-
 * gated shape (e.g. CPH: "any commodity line has a CPH-required code").
 */
export function anyAllowListed(gateObligation, values, whenTrue, whenFalse) {
  const fn = (fulfilments) => {
    const stored = fulfilments[gateObligation.id]
    const candidates =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? Object.values(stored)
        : stored !== undefined
          ? [stored]
          : []
    return candidates.some((v) => values.includes(v)) ? whenTrue : whenFalse
  }
  fn.metadata = {
    type: 'anyAllowListed',
    obligation: gateObligation.id,
    values,
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * branchedGate — evaluate a predicate; return whenTrue or whenFalse.
 *
 * Use for extended-form scope decisions where both branches are
 * in-scope (retain-value / status-swap patterns like the accompanying-
 * document all-or-nothing block).
 *
 * The predicate has the same signature as an applyTo function:
 * `(fulfilments, fulfilmentIdsByObligationId) → boolean`.
 */
export function branchedGate(predicate, whenTrue, whenFalse) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) =>
    predicate(fulfilments, fulfilmentIdsByObligationId) ? whenTrue : whenFalse
  fn.metadata = {
    type: 'branchedGate',
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * matches — scalar equality check. True where `gateObligation`'s
 * stored value equals `value`. Returns a scalar decision.
 */
export function matches(gateObligation, value) {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value
      ? { inScope: true }
      : { inScope: false }
  fn.metadata = { type: 'matches', obligation: gateObligation.id, value }
  return fn
}

/**
 * present — predicate primitive. True iff the given obligation has
 * any stored value. For scalar obligations checks `!== undefined`;
 * for indexed obligations checks the storage map has at least one key.
 *
 * Returns a predicate (not an applyTo). Compose into a `branchedGate`
 * or `.some()` / `.every()` chain with other siblings for
 * cross-sibling patterns.
 */
export function present(obligation) {
  return (fulfilments) => {
    const stored = fulfilments[obligation.id]
    if (stored === undefined) return false
    if (stored === null) return false
    if (typeof stored === 'object' && !Array.isArray(stored)) {
      return Object.keys(stored).length > 0
    }
    return true
  }
}

// -----------------------------------------------------------------------------
// Internal — shared filter-and-project logic between allowListed and
// allowListedByPredicate.
// -----------------------------------------------------------------------------

function filterAndProject(
  storedForGate,
  predicate,
  projectionGroup,
  fulfilmentIdsByObligationId
) {
  const stored = storedForGate ?? {}
  const passingKeys =
    typeof stored === 'object' && !Array.isArray(stored)
      ? Object.entries(stored)
          .filter(([, v]) => predicate(v))
          .map(([k]) => k)
      : predicate(stored)
        ? ['']
        : []

  if (passingKeys.length === 0) return { inScope: false }

  if (!projectionGroup) {
    return { inScope: true, records: passingKeys }
  }

  const projectionPaths =
    fulfilmentIdsByObligationId?.get(projectionGroup.id) ?? []
  const records = projectionPaths.filter((path) =>
    passingKeys.includes(pathPrefix(path))
  )
  return { inScope: records.length > 0, records }
}

function pathPrefix(path) {
  const slash = path.indexOf('/')
  return slash === -1 ? path : path.slice(0, slash)
}
