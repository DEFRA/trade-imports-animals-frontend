/**
 * Gate helper library — pure factories that build the `applyTo`
 * function attached to an obligation.
 *
 * Contract:
 *   - Each helper returns an
 *     `applyTo(fulfilments, fulfilmentIndexesByObligationId) → decision`.
 *   - Each returned function has a `.metadata` property describing the
 *     gate declaratively — enables static introspection without
 *     executing the closure.
 *
 * Obligation-side additive key:
 *   - `dependsOn?: string[]` — ids of obligations whose stored values
 *     the gate reads. Makes the dependency graph explicit data
 *     alongside the opaque closure so a static reachability prover can
 *     invert gates. A coverage assertion fails the build for any gated
 *     obligation without a complete (declared or derived) `dependsOn`.
 *
 * Which helper to pick — the split is by the SHAPE of the DECISION
 * the gate needs to return (which usually mirrors the gated
 * obligation's category):
 *
 *   - **Single-decision gates** (`single-decision/`) return one
 *     `{ inScope, status, reasons? }` verdict for the whole gated
 *     obligation. Use for unindexed gated obligations: `equalsGate` /
 *     `includesGate` / `presentGate` / `alwaysInScope`.
 *
 *   - **Per-fulfilmentIndex-decision gates**
 *     (`per-fulfilmentIndex-decision/`) return a decision that names
 *     which fulfilmentIndexes are in scope. Use for indexed gated
 *     obligations: `allowListed` / `notInUnionOf`. Pass `null` for
 *     `gatedParentGroup` when gate and gated are at the same identity
 *     level; pass a group when the gated obligation is deeper (the
 *     engine fans across that group's fulfilmentIndexes for each
 *     matching parent).
 *
 * `matches` is a same-frame single-decision equality gate (kept for
 * backwards compat). `anyAllowListed` reduces a group's
 * fulfilmentIndexes to one decision (rather than a per-fulfilmentIndex
 * list) — for the "cph reads ANY commodityCode across commodity lines"
 * case. `branchedGate` is the escape hatch for genuinely non-derivable
 * predicates; must be paired with `predicateMeta` for the reachability
 * prover to synthesise a witness.
 */

export { allowListed } from './per-fulfilmentIndex-decision/allow-listed.js'
export { notInUnionOf } from './per-fulfilmentIndex-decision/not-in-union-of.js'
export { anyAllowListed } from './single-decision/any-allow-listed.js'
export { branchedGate } from './single-decision/branched-gate.js'
export { matches } from './single-decision/matches.js'
export { present } from './single-decision/present.js'
export { equalsGate } from './single-decision/equals-gate.js'
export { presentGate } from './single-decision/present-gate.js'
export { includesGate } from './single-decision/includes-gate.js'
export { alwaysInScope } from './single-decision/always-in-scope.js'
export { obligationMetadata } from './introspection/obligation-metadata.js'
