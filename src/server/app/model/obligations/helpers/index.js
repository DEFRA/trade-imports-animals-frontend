/**
 * applyTo helper library — pure factories that build applyTo functions.
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
 *     the `applyTo` closure reads. Makes the dependency graph explicit
 *     data alongside the opaque closure so a static reachability prover
 *     can invert gates. A coverage assertion fails the build for any
 *     gated obligation without a complete (declared or derived)
 *     `dependsOn`.
 *
 * Which helper to pick — the split is by the SHAPE of the gate
 * obligation's stored value, not by identity level:
 *
 *   - **Unindexed gate** (gate has no `within`, or otherwise stores a
 *     single value): use `equalsGate` / `includesGate` / `presentGate`
 *     / `alwaysInScope`. The applyTo returns one decision.
 *
 *   - **Group-scoped gate** (gate has `within`, so
 *     `fulfilments[gate.id]` is an indexedFulfilments map): use
 *     `allowListed` / `notInUnionOf`. `null` projection when gate and
 *     gated are at the same identity level; a `projectionGroup` when
 *     the gated obligation is deeper (the engine walks the projection
 *     group's fulfilmentIndexes for each matching parent).
 *
 * `matches` is a same-frame single-decision equality gate (kept for
 * backwards compat). `anyAllowListed` reduces a group's
 * fulfilmentIndexes to one decision (rather than a per-fulfilmentIndex
 * list) — for the "cph reads ANY commodityCode across commodity lines"
 * case. `branchedGate` is the escape hatch for genuinely non-derivable
 * predicates; must be paired with `predicateMeta` for the reachability
 * prover to synthesise a witness.
 */

export { allowListed } from './projection/allow-listed.js'
export { notInUnionOf } from './projection/not-in-union-of.js'
export { anyAllowListed } from './unindexed/any-allow-listed.js'
export { branchedGate } from './unindexed/branched-gate.js'
export { matches } from './unindexed/matches.js'
export { present } from './unindexed/present.js'
export { equalsGate } from './unindexed/equals-gate.js'
export { presentGate } from './unindexed/present-gate.js'
export { includesGate } from './unindexed/includes-gate.js'
export { alwaysInScope } from './unindexed/always-in-scope.js'
export { obligationMetadata } from './introspection/obligation-metadata.js'
