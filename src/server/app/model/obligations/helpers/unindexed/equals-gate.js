// Meta-first gate helpers — `.metadata` IS the definition, and the
// closure body is auto-generated from it. Replaces the
// `branchedGate` + `predicateMeta` + `dependsOn` triple-declaration
// pattern, where a rename could silently drift the closure body away
// from what static analysis thought the gate read.
//
// All four helpers here (`equalsGate`, `presentGate`, `includesGate`,
// `alwaysInScope`) use the same-frame direct-read pattern: the closure
// reads `fulfilments[gateObligation.id]` and returns a single
// `{inScope, status, reasons?}` decision — no `runGate`, no
// gatedParentGroup. Depth-N projection variants stay in `allowListed`
// / `notInUnionOf`.

/**
 * equalsGate — "gate stored value === target ? whenTrue : whenFalse".
 *
 * Workhorse for status-swap and purge-on-flip patterns. Both
 * `whenTrue` and `whenFalse` are returned verbatim, so a caller who
 * passes two in-scope decisions gets a pure status flip (e.g.
 * `regionCode` mandatory ↔ optional), and one in-scope + one
 * out-of-scope gets a purge-on-flip (e.g. `purposeInInternalMarket`
 * dropped when `reasonForImport` changes).
 */
export const equalsGate = (gateObligation, value, whenTrue, whenFalse) => {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value ? whenTrue : whenFalse
  fn.metadata = {
    gateType: 'equalsGate',
    obligationId: gateObligation.id,
    value,
    whenTrue,
    whenFalse
  }
  return fn
}
