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
 *   1. **Top-level scalar gate** — the gate obligation has no `within`,
 *      OR is otherwise stored as a plain scalar in `fulfilments[gate.id]`.
 *      Example: `reasonForImport` (top-level, scalar). The `applyTo`
 *      returns a SINGLE `{inScope, status, reasons?}` decision.
 *      Use: `equalsGate` / `includesGate` / `presentGate`.
 *
 *   2. **Group-scoped gate** — the gate obligation is `within` a group,
 *      so `fulfilments[gate.id]` is a records-map (`{lineId1: value,
 *      lineId2: value, ...}`). The `applyTo` returns PER-RECORD
 *      decisions (via `filterAndProject`). Use:
 *      - `allowListed` / `notInUnionOf` with `null` projection when the
 *        gated obligation is at the SAME identity level as the gate
 *        (both `within` the same group). Example: `numberOfPackages`
 *        (`within: commodityLine`) reads `commodityCode` (also
 *        `within: commodityLine`) — same level, so null projection.
 *      - `allowListed` / `notInUnionOf` with `projectionGroup` set when
 *        the gated obligation is DEEPER than the gate. Example:
 *        `passport` (`within: unitRecord`, deeper than commodityLine)
 *        reads `commodityCode` (`within: commodityLine`) via projection
 *        `unitRecord` — the engine walks unit-records for each matching
 *        commodity-line.
 *
 *   Rule of thumb: if the gate obligation has a `within`, use the
 *   `allowListed`/`notInUnionOf` family. Otherwise use the scalar
 *   family (`equalsGate` / `includesGate` / `presentGate` /
 *   `alwaysInScope`). `matches` is a same-frame scalar equality gate
 *   with same-frame semantics (kept for backwards compat).
 *   `anyAllowListed` is a scalar aggregation over a group's records
 *   (returns a single decision, not per-record) — for the "cph reads
 *   ANY commodityCode across commodity lines" case; see its docstring.
 *
 *   `branchedGate` is the escape hatch for genuinely non-derivable
 *   predicates. It is absent from the manifest today but retained here
 *   for future use — it must be paired with `predicateMeta` for the
 *   reachability prover to synthesise a witness.
 */

export { allowListed } from './projection/allow-listed.js'
export { notInUnionOf } from './projection/not-in-union-of.js'
export { anyAllowListed } from './scalar/any-allow-listed.js'
export { branchedGate } from './scalar/branched-gate.js'
export { matches } from './scalar/matches.js'
export { present } from './scalar/present.js'
export { equalsGate } from './scalar/equals-gate.js'
export { presentGate } from './scalar/present-gate.js'
export { includesGate } from './scalar/includes-gate.js'
export { alwaysInScope } from './scalar/always-in-scope.js'
export { obligationMetadata } from './introspection/obligation-metadata.js'
