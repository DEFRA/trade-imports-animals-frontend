// -----------------------------------------------------------------------------
// Meta-first gate helpers.
//
// The `branchedGate`-plus-`predicateMeta` pattern used by regionCode /
// purposeInInternalMarket / commercialTransporter / privateTransporter /
// transitedCountries co-declares the same dependency THREE times: the
// predicate closure body reads `fulfilments[X.id]`, `predicateMeta`
// restates it as `{operator, obligationId, value}`, and `dependsOn`
// restates it a third time as `[X.id]`. Rename the gate obligation and
// three touchpoints have to stay aligned — miss one and the closure
// body silently drifts from what static analysis THINKS the gate reads.
//
// The four helpers below (`equalsGate`, `presentGate`, `includesGate`,
// `alwaysInScope`) extend the pattern that `allowListed` / `notInUnionOf`
// already use — the helper's `.metadata` IS the definition, and the
// closure body is auto-generated from it. `branchedGate` stays as an
// escape hatch for genuinely opaque predicates, of which the manifest
// today has none.
//
// Frame semantics — all four helpers use the SAME-FRAME direct-read
// pattern used by `matches` / `anyAllowListed` / `branchedGate`: the
// closure reads `fulfilments[gateObligation.id]` and returns a single
// `{inScope, status, reasons?}` decision. No `filterAndProject`, no
// projection group, no touching of `fulfilmentIndexesByObligationId`.
// The migration sites are all notification-level unindexed gates; the
// depth-N projection variants stay `allowListed` / `notInUnionOf`.
// -----------------------------------------------------------------------------

/**
 * equalsGate — "gate stored value === target ? whenTrue : whenFalse".
 *
 * The workhorse for status-swap and purge-on-flip patterns:
 *   - `regionCode` — mandatory when `regionCodeRequirement === 'yes'`,
 *     otherwise optional (both branches in-scope; status flips).
 *   - `purposeInInternalMarket` — mandatory when `reasonForImport ===
 *     'internalMarket'`, otherwise out of scope (purge on flip).
 *   - `commercialTransporter` / `privateTransporter` — in scope when
 *     `transporterType` matches, otherwise out of scope.
 *
 * The status-flip case (both branches in-scope) is a natural consequence
 * of the caller-supplied decisions — no separate status-only variant is
 * needed. Whatever the caller passes as `whenTrue` / `whenFalse` is
 * returned verbatim.
 *
 * @param {object} gateObligation — the obligation whose stored value is read.
 * @param {*} value — the target value for equality.
 * @param {object} whenTrue — decision returned on match.
 * @param {object} whenFalse — decision returned on mismatch.
 */
export const equalsGate = (gateObligation, value, whenTrue, whenFalse) => {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value ? whenTrue : whenFalse
  fn.metadata = {
    type: 'equalsGate',
    obligation: gateObligation.id,
    value,
    whenTrue,
    whenFalse
  }
  return fn
}
