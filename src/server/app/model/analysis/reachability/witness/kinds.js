// ---------------------------------------------------------------------------
// Witness synthesis.
//
// Each structured helper attaches a `.metadata` sidecar describing its
// gate shape. `synthesiseWitness` inspects that sidecar and returns a
// concrete `{ obligationId, value }` pair that — when written into a
// fulfilments map keyed by `obligationId` — makes the closure return
// `inScope: true`. The tightened prover (`proveWithWitnesses`) uses
// the witness to confirm value-level reachability, not just graph
// reachability.
//
// Classification of the manifest's gated obligations:
//   - structured (witness-synthesisable) — helpers with recoverable
//     metadata: `allowListed`, `anyAllowListed`, `matches`,
//     `notInUnionOf`, plus `branchedGate` when the caller supplies
//     `predicateMeta`.
//   - trivial (total-over-branches) — `branchedGate` where both
//     `whenTrue.inScope` and `whenFalse.inScope` are `true`. The gate
//     is always open regardless of the closure's read; no witness
//     needed. Currently the four accompanying-document siblings +
//     regionCode.
//   - opaque — reserved for future opaque-by-design helpers. Empty on
//     the current manifest — see `OPAQUE_HELPER_TYPES` below.
// ---------------------------------------------------------------------------

/**
 * Witness kind — the classification `synthesiseWitness` returns so the
 * prover can branch on it uniformly. Exported for the coverage gate:
 * every gated obligation must classify as one of these three.
 *
 * - `'witness'`  — value-level check available: `{ kind: 'witness',
 *                  obligationId, value }`.
 * - `'trivial'`  — gate is always open (both branches in-scope, or the
 *                  obligation carries no `applyTo`): `{ kind: 'trivial' }`.
 * - `'opaque'`   — helper metadata does not carry a data-level target;
 *                  falls back to graph-level check only:
 *                  `{ kind: 'opaque', reason }`.
 */
export const WITNESS_KIND = Object.freeze({
  WITNESS: 'witness',
  TRIVIAL: 'trivial',
  OPAQUE: 'opaque'
})

/**
 * STRUCTURED_HELPER_TYPES — the `.metadata.gateType` labels for helpers
 * whose gates `synthesiseWitness` can invert into a concrete
 * `{ obligationId, value }` witness. Each label here MUST have a
 * matching `case` in `synthesiseWitness`'s dispatch (the coverage test
 * in `analysis/coverage.test.js` pins this both ways). Adding a new
 * structured helper is a three-touch change: helper in `helpers.js`,
 * case in `synthesiseWitness`, and an entry here.
 *
 * Every new operator carries a second tax — a witness synthesiser + a
 * seeding rule. This set is the build-time enforcement of the first
 * half of that tax.
 */
export const STRUCTURED_HELPER_TYPES = new Set([
  'allowListed',
  'anyAllowListed',
  'matches',
  'branchedGate',
  'notInUnionOf',
  // Meta-first gate helpers. Each helper's `.metadata` fully describes
  // the gate — the closure body is auto-generated from it, so witness
  // synthesis reads the metadata directly.
  'equalsGate',
  'presentGate',
  'includesGate',
  'alwaysInScope'
])

/**
 * OPAQUE_HELPER_TYPES — the `.metadata.gateType` labels for helpers
 * classified as opaque BY DECLARED DESIGN. Presence here is an
 * explicit deferral, not "we forgot to write the synth". Every entry
 * must be justified with a comment naming the reason.
 *
 * Currently EMPTY — every manifest gate is data-level invertible. The
 * set is retained (with a placeholder-invariant of `size >= 0`) as the
 * enforcement point for future opaque-by-design helpers: if a new
 * helper CAN'T be data-level inverted (e.g. an ML-scored predicate),
 * listing it here with a comment is the honest thing to do. Any
 * addition MUST cite the reason.
 */
export const OPAQUE_HELPER_TYPES = new Set([])
