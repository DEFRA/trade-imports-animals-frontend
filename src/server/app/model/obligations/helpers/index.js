/**
 * applyTo helper library — pure functions that build applyTo functions.
 *
 * Part of a prototype exploring "consolidate on applyTo + helpers" as
 * an alternative to the gatedBy DSL. Companion to
 * `obligations-all-applyto.js`.
 *
 * Design contract:
 *   - Each helper is a pure function returning an
 *     `applyTo(fulfilments, fulfilmentIndexesByObligationId) → decision`.
 *   - `fulfilments` is the raw storage map.
 *   - `fulfilmentIndexesByObligationId` is a `Map<obligationId, Set<string>>`
 *     giving current fulfilment indexes per obligation (in particular per
 *     group, so a gated obligation can look up its parent-group's
 *     instances without enumerating storage itself).
 *   - Each returned function has a `.metadata` property describing
 *     the gate declaratively. Enables optional static
 *     introspection / cross-language export without giving up the
 *     imperative-JS surface.
 *
 * Obligation schema — additive keys authored on the obligation object
 * itself (not on the applyTo sidecar):
 *   - `dependsOn?: string[]` — ids of obligations whose stored values
 *     the `applyTo` closure reads. Makes the dependency graph explicit
 *     data alongside the opaque closure so a static reachability prover
 *     can invert gates without executing them. A coverage assertion
 *     fails the build for any gated obligation without a complete
 *     (declared or derived) `dependsOn`.
 *
 * All helpers are unit-testable in isolation — see helpers.test.js.
 *
 * Helper taxonomy — which to use when:
 *
 *   Two shapes of gate exist in this manifest, and they take different
 *   helpers. The distinction is NOT about "same frame vs cross frame"
 *   in the identity-level sense — it's about the SHAPE of the stored
 *   value the gate reads.
 *
 *   1. **Top-level unindexed gate** — the gate obligation has no `within`,
 *      OR is otherwise stored as a single stored value in `fulfilments[gate.id]`.
 *      Example: `reasonForImport` (top-level, unindexed). The `applyTo`
 *      returns a SINGLE `{inScope, status, reasons?}` decision.
 *      Use: `equalsGate` / `includesGate` / `presentGate`.
 *
 *   2. **Group-scoped gate** — the gate obligation is `within` a group,
 *      so `fulfilments[gate.id]` is an indexedFulfilments map
 *      (`{lineId1: value, lineId2: value, ...}`). The `applyTo` returns
 *      per-fulfilmentIndex decisions (via `filterAndProject`). Use:
 *      - `allowListed` / `notInUnionOf` with `null` projection when the
 *        gated obligation is at the SAME identity level as the gate
 *        (both `within` the same group). Example: `numberOfPackages`
 *        (`within: commodityLine`) reads `commodityCode` (also
 *        `within: commodityLine`) — same level, so null projection.
 *      - `allowListed` / `notInUnionOf` with `projectionGroup` set when
 *        the gated obligation is DEEPER than the gate. Example:
 *        `passport` (`within: unitRecord`, deeper than commodityLine)
 *        reads `commodityCode` (`within: commodityLine`) via projection
 *        `unitRecord` — the engine walks unitRecord fulfilmentIndexes for
 *        each matching commodity-line.
 *
 *   Rule of thumb: if the gate obligation has a `within`, use the
 *   `allowListed`/`notInUnionOf` family. Otherwise use the unindexed
 *   family (`equalsGate` / `includesGate` / `presentGate` /
 *   `alwaysInScope`). `matches` is a same-frame single-decision
 *   equality gate with same-frame semantics (kept for backwards
 *   compat). `anyAllowListed` reduces a group's fulfilmentIndexes to
 *   one decision (rather than a per-fulfilmentIndex list) — for the
 *   "cph reads ANY commodityCode across commodity lines" case; see
 *   its docstring.
 *
 *   `branchedGate` is the escape hatch for genuinely non-derivable
 *   predicates. It is absent from the manifest today but retained here
 *   for future use — it must be paired with `predicateMeta` for the
 *   reachability prover to synthesise a witness.
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
