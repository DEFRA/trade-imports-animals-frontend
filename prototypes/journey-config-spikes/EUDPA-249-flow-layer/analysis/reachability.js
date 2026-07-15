/**
 * reachability.js — graph-level dependency-reachability prover.
 *
 * Ported from A's `analysis/reachability.js` (the standalone spike),
 * adapted to B's dependency model. This is Phase 3 commit 1 of the
 * EUDPA-288 blend plan (BRIEF §Migration #3, REPORT §5.1 — "closures
 * must be an exception with a build-time guard").
 *
 * ---------------------------------------------------------------------------
 * Divergence from A — the "conservative closure treatment" invariant
 * ---------------------------------------------------------------------------
 *
 * A's prover works because A's gates are CLOSED-VOCABULARY DATA: four
 * operators (`equals`, `includes`, `notInUnionOf`, `present`), each
 * pattern-matched in A's `predicate.js`. A's `gateValue()` can therefore
 * INVERT a gate to synthesise a witness — "what value would make this
 * gate fire?" — and A's `proveReachability` walks page-graphs proving
 * every obligation has a witness that puts its page in scope.
 *
 * B's gates are JS closures. Even after Phase 2's `dependsOn` sweep the
 * closure body is opaque; the metadata declares WHICH obligations a
 * closure reads (`dependsOn`), not WHAT VALUES would satisfy the
 * predicate. So witness synthesis at the VALUE level is deferred to
 * commit 2 (for the structured helpers `branchedGate` / `allowListed` /
 * `anyAllowListed` / `matches` — which do carry recoverable metadata)
 * and commit 3 (coverage gate — every helper carries a synth). See
 * `../DESIGN-DELTA.md`.
 *
 * At the GRAPH level, however, `dependsOn` alone recovers the recovery-
 * relevant structure. Under the conservative rule:
 *
 *   "an obligation is reachable IFF every id in its `dependsOn` list is
 *    reachable, seeded from the always-in-scope set (obligations with
 *    `dependsOn: []`)."
 *
 * This is precisely what A's prover collapses to for gates whose
 * predicates it can't invert. Our prover starts here; commit 2 tightens
 * it by adding value-level witness synthesis on top of the same graph.
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
 * Phase 2's coverage assertion should already prevent them, but the
 * prover is defensive: any `dependsOn` id that doesn't resolve to a
 * record in the input manifest is reported as an error (with the
 * offending obligation id) rather than crashing. The obligation
 * carrying the dangling id is neither reachable nor unreachable; it is
 * `errors[]` only.
 */

/**
 * proveReachability — run the graph-level prover over a list of
 * `{ id, dependsOn }` records. Deliverable, in the shape A's prover
 * returns for its own three-outcome enumeration:
 *
 *   {
 *     reachable:   string[],  // ids that trace to a seed
 *     unreachable: string[],  // ids whose deps never terminate at a seed
 *     errors:      { obligationId, reason }[]  // structural defects
 *   }
 *
 * Called from `analysis/reachability.test.js` and (eventually) from
 * commit 3's coverage gate that walks `obligations` +
 * `obligationMetadata` to build the record list.
 *
 * @param {Array<{id: string, dependsOn: string[] | undefined}>} records
 * @returns {{ reachable: string[], unreachable: string[], errors: Array<{obligationId: string, reason: string}> }}
 */
export function proveReachability(records) {
  const byId = new Map(records.map((r) => [r.id, r]))
  const errors = []

  // First pass — surface structural anomalies (dangling ids, missing
  // dependsOn arrays). Anomalous obligations are excluded from the
  // reachable/unreachable classification and reported only in errors.
  const structurallyBad = new Set()
  for (const rec of records) {
    if (!Array.isArray(rec.dependsOn)) {
      errors.push({
        obligationId: rec.id,
        reason:
          'missing dependsOn array (Phase 2 coverage assertion should have caught this)'
      })
      structurallyBad.add(rec.id)
      continue
    }
    for (const depId of rec.dependsOn) {
      if (depId === rec.id) continue // self-loop is not a dangling id
      if (!byId.has(depId)) {
        errors.push({
          obligationId: rec.id,
          reason: `dependsOn references unknown obligation id '${depId}'`
        })
        structurallyBad.add(rec.id)
        break // one error per obligation is enough
      }
    }
  }

  // Reachability closure — fixed-point iteration. An obligation is
  // reachable if either:
  //   (a) it has an empty dependsOn (an always-in-scope seed), OR
  //   (b) its dependsOn is a pure self-loop `[own-id]` — no external
  //       prerequisite, so it acts as a seed (see docstring); OR
  //   (c) every non-self dep is already reachable.
  //
  // Iterate until no new nodes are marked. Structurally-bad nodes are
  // never marked reachable — they're excluded from the classification.
  const reachable = new Set()
  const isSeed = (rec) => {
    if (rec.dependsOn.length === 0) return true
    // pure self-loop — all deps are the obligation's own id
    if (rec.dependsOn.every((depId) => depId === rec.id)) return true
    return false
  }

  let changed = true
  while (changed) {
    changed = false
    for (const rec of records) {
      if (reachable.has(rec.id)) continue
      if (structurallyBad.has(rec.id)) continue
      if (isSeed(rec)) {
        reachable.add(rec.id)
        changed = true
        continue
      }
      // Non-self deps must ALL be reachable. Self-deps are ignored
      // (the self-loop-as-seed rule above handles the pure case; here
      // a mixed dep list — some external, some self — still needs the
      // external prereqs satisfied, and the self-ref is a no-op).
      const externalDeps = rec.dependsOn.filter((depId) => depId !== rec.id)
      if (externalDeps.every((depId) => reachable.has(depId))) {
        reachable.add(rec.id)
        changed = true
      }
    }
  }

  const unreachable = records
    .filter((rec) => !reachable.has(rec.id) && !structurallyBad.has(rec.id))
    .map((rec) => rec.id)

  return {
    reachable: [...reachable],
    unreachable,
    errors
  }
}
