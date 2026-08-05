/**
 * reachability.js — graph-level + value-level dependency-reachability prover.
 *
 * ---------------------------------------------------------------------------
 * The "conservative closure treatment" invariant
 * ---------------------------------------------------------------------------
 *
 * The manifest's gates are JS closures — the closure body is opaque; the
 * metadata declares WHICH obligations a closure reads (`dependsOn`), not
 * WHAT VALUES would satisfy the predicate. `synthesiseWitness()` inspects
 * the structured helper sidecar (`allowListed`, `anyAllowListed`,
 * `matches`, and `branchedGate` when annotated with a `predicateMeta`
 * operator description) and returns a concrete `{ obligationId, value }`
 * that would open the gate. A tightened prover (`proveWithWitnesses`)
 * runs the actual `applyTo` closure against the synthesised witness,
 * confirming the gate really does fire — no vacuously-green graph-only
 * pass. A coverage assertion pins that every "structured" helper carries
 * a witness synthesiser here.
 *
 * At the GRAPH level, `dependsOn` alone recovers the recovery-relevant
 * structure. Under the conservative rule:
 *
 *   "an obligation is reachable IFF every id in its `dependsOn` list is
 *    reachable, seeded from the always-in-scope set (obligations with
 *    `dependsOn: []`)."
 *
 * `proveReachability` implements exactly this. `proveWithWitnesses`
 * sits on top: same graph, but each gate whose helper carries a
 * recoverable predicate must ALSO be provable value-side (witness
 * synthesis + closure re-run).
 *
 * ---------------------------------------------------------------------------
 * Self-loop treatment
 * ---------------------------------------------------------------------------
 *
 * A pure self-loop (`dependsOn === [own-id]`) has NO external prereq —
 * nothing beyond the obligation itself constrains whether the gate
 * fires. We treat such self-loops as seeds (equivalent to `dependsOn:
 * []` at the graph level). The manifest's one legitimate self-loop is
 * `accompanyingDocumentType`, whose gate closure reads its own stored
 * value; the branchedGate is total-over-branches (both `whenTrue` and
 * `whenFalse` have `inScope: true`), so value-level analysis in commit
 * 2 will confirm the gate is always-in-scope regardless of the read
 * value. At the graph level, it suffices to recognise the loop as
 * "self-only reads → no external prereq → seed".
 *
 * ---------------------------------------------------------------------------
 * Dangling ids
 * ---------------------------------------------------------------------------
 *
 * The manifest coverage assertion should already prevent them, but the
 * prover is defensive: any `dependsOn` id that doesn't resolve to a
 * record in the input manifest is reported as an error (with the
 * offending obligation id) rather than crashing. The obligation
 * carrying the dangling id is neither reachable nor unreachable; it is
 * `errors[]` only.
 */

export { proveReachability } from './graph/prove.js'
export {
  WITNESS_KIND,
  STRUCTURED_HELPER_TYPES,
  OPAQUE_HELPER_TYPES
} from './witness/kinds.js'
export { synthesiseWitness } from './witness/synthesise.js'
export { proveWithWitnesses } from './fidelity/prove.js'
