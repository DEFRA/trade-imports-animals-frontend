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
 * Which helper to pick — guidance by CURRENT usage patterns, not a
 * folder-level contract. Every helper handles input shapes defensively
 * via `runGate`; the pattern below describes how they're typically
 * used, not what they exclusively support.
 *
 *   - Returning one `{ inScope, status, reasons? }` verdict for the
 *     whole gated obligation: `equalsGate` / `includesGate` /
 *     `presentGate` / `alwaysInScope` / `matches`. Typically used when
 *     the gated obligation is unindexed.
 *
 *   - Returning a decision naming which fulfilmentIndexes are in
 *     scope: `allowListed` / `notInUnionOf`. Typically used when the
 *     gated obligation is indexed. Pass `null` for `gatedParentGroup`
 *     when gate and gated are at the same identity level; pass a group
 *     when the gated obligation is deeper (the engine fans across that
 *     group's fulfilmentIndexes for each matching parent).
 *
 * `anyAllowListed` reduces a group's fulfilmentIndexes to one decision
 * (rather than a per-fulfilmentIndex list) — for the "cph reads ANY
 * commodityCode across commodity lines" case. `branchedGate` is the
 * escape hatch for genuinely non-derivable predicates; must be paired
 * with `predicateMeta` for the reachability prover to synthesise a
 * witness.
 *
 * `moreThanOne` is a combinator rather than a gate: it wraps another
 * helper and stands it down unless that helper admits more than one
 * entry — for the "only ask this of a consignment carrying more than
 * one identified commodity line" case.
 */

export { allowListed } from './allow-listed.js'
export { notInUnionOf } from './not-in-union-of.js'
export { anyAllowListed } from './any-allow-listed.js'
export { branchedGate } from './branched-gate.js'
export { matches } from './matches.js'
export { present } from './present.js'
export { equalsGate } from './equals-gate.js'
export { presentGate } from './present-gate.js'
export { includesGate } from './includes-gate.js'
export { alwaysInScope } from './always-in-scope.js'
export { moreThanOne } from './more-than-one.js'
export { obligationMetadata } from './introspection/obligation-metadata.js'
