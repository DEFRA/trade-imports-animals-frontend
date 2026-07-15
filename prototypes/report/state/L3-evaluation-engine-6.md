# L3 — Adversarial verification — EE-6 (evaluation-engine)

**VERDICT: AMENDED.** The testing-volume and doc-fidelity core survives intact and is
well-evidenced. Two limbs do not survive contact with the source: the **cycle-guard limb is
causally inverted** (B's guard patches a hazard B's own design created; A has no author-facing
edge that can cycle), and **"A's [tests] are neither" is refuted** by A's reachability prover —
a whole-model property proof B structurally cannot write.

---

## 1. What I verified line-by-line (all real)

| Cited | Status |
|---|---|
| B `coverage.test.js:108-137` — seen-set + depth-100 cycle bound | **REAL**, exactly as quoted |
| B `evaluator.js:188-200` — `buildAncestorGroups`, `let cur = o.within; while (cur) { cur = cur.within }` (actual :192-196) | **REAL**, unguarded at runtime |
| B `evaluator.units.test.js` = **61** `it(` sites | **EXACT** |
| B evaluator exported pipeline fns | **13** pure fns + 1 factory (`createObligationEvaluator`). Claim said 12. Essentially exact |
| A `walkObligations` recurses on `obligation.item`, no seen-set/depth bound | **REAL** — but the file is **`registry.js` at the prototype root**, not `engine/registry.js` |
| A `engine/evaluate/*.test.js` ≈ **44** `it(` sites (4+5+8+9+18) | Claim said 40. Directionally exact; the ~4-5× ratio holds either way |
| A `collection-view.js:15` — `entryComplete(obligation, entry)`, **no ctx** | **REAL** |
| A `DESIGN-DELTA.md:124-129` accepts it — "`collectionView` … call with no ctx and are unchanged" | **REAL**, explicitly framed as "backwards compatible" |
| A doc/code contradiction #1: `limits.md:16` + `obligation-model.md:276-281` say `entryComplete` does not resolve enclosing gates | **REAL** — `complete.js:35-41` **does** (`else if (ctx && subObligation.activatedBy.frame) → evalPredicate`) |
| A doc/code contradiction #2: `limits.md:56` "no feature controller calls the update path" | **REAL** — `features/commodities/consignment-details.controller.js:178` calls `state.updateEntryAt` |
| B's docs match its code | **HELD UP UNDER ATTACK.** I spot-checked every line-ref in `obligations.md` against `evaluator.js`: `makeInScopeCheck` :301-325 ✓ (actual 301), `purgeStorage` :333-379 ✓ (actual 333), `enumerateGroupPathsFromStorage` :244-271 ✓ (actual 244), `enumerateGroupFulfilmentIds` :390-421 ✓ (actual 390). I hunted a mismatch and **found none.** |

So the claim's factual spine is sound. Now the two limbs that break.

---

## 2. REFUTED LIMB — the cycle guard is causally inverted

The claim reads "B has the only cycle guard on either side; A has none even though
`walkObligations` recurses unbounded" as *A is under-tested*. The source shows the opposite.

**B's cycle hazard exists because B chose by-reference parent pointers.** B's nesting edge is
`within: commodityLine` — a hand-authored back-reference to a named `const`, written 19+ times
across the manifest (`obligations.js:415, 426, 435, 442, 472, 566, 634, 644, 654, 664, 683, 696, 709` …).
Every nested obligation requires the author to *point at its parent by name*. That is a
mistypable edge, and B's own mutation register records what happens when it goes wrong:

> **Mutation 14 — circular `within` self-loop.** "Change: … mutate `commodityLine.within = commodityLine`.
> **Result: the test suite hangs.** `buildAncestorGroups` walks `while (cur) cur = cur.within` and
> never terminates. `pkill -f vitest` required to abort." — `docs/testing.md:548-556`

The guard at `coverage.test.js:108-137` is the **patch for that**. It is a virtue that B found
it, but it is a hazard B's model design *introduced*.

**A has no author-facing edge that can cycle.** A's nesting is **inline positional containment**:
`grep -rn "item:"` across A's entire `features/` tree returns exactly **three** sites
(`commodities/obligations.js:99, :116`, `documents/obligations.js:24`) — each an inline
`item: [ … ]` array literal. There is no "declare your parent" authoring step anywhere in A's
manifest. A child literal cannot name its parent, because the parent object does not exist yet
when the child array is constructed. **A cycle in A's `item` graph is not producible by any
authoring action** — it requires deliberately mutating a frozen literal after declaration
(`x.item = [x]`), which is vandalism, not a plausible mutation.

And B concedes the symmetric point itself: mutation 8's note (`testing.md:412-415`) records that
a `within` cycle written *in the literal* is already caught by TDZ at module load. So B's guard
defends **only** the post-hoc-mutation case — precisely the case A is equally exposed to and
equally unlikely to meet.

**Net:** "B has the only cycle guard" is *true as a fact* and *backwards as an inference*. It is
not evidence A is under-tested; it is evidence B needed a guard A's containment model does not.
This is the classic conflation the brief warns about — treating a guard A **does not need** as a
gap A **has**.

(One genuine B win survives here that the claim buries: `coverage.test.js:139-170` also asserts
**duplicate-id and duplicate-name** integrity. A's `registry.js:30` builds
`new Map(all.map(o => [o.id, o]))` — a duplicate id silently overwrites, and **A has no test for
it**. That is a real, un-inverted structural-integrity gap in A.)

---

## 3. REFUTED LIMB — "A's [tests] are neither" ignores A's reachability prover

The claim reduces A to "40 evaluator tests". A also ships `analysis/reachability.js` (215 LOC)
plus `analysis/reachability.test.js`, which is not a unit test but a **whole-model property
proof**:

- `enumerateScopeStates()` enumerates the model's **finite scope space (24 states)** —
  `reachability.test.js:21-23`
- `proveReachability()` synthesises a **witness journey per obligation instance**, runs the
  **real `reconcile`**, and asserts **no owed obligation is ever unreachable** — `:25-27`
- `orphanedRootIds` asserts the self-emptying set is empty — `:41-45`
- It witnesses obligations **at depth inside collection items**
  (`commodityLines[0].numberOfPackages`) and proves they actually land in scope, not as a null
  witness — `:47-59`
- **It has explicit teeth tests**: drop a page from dispatch and assert the prover *fires* with
  `reason: 'owning-page-unreachable-in-scope'` — `:29-39, :61-75`. That is mutation-testing
  discipline, applied to the prover itself.

B has **no equivalent, and per L2 §3 structurally cannot build one**: 9 of B's 19 conditional
obligations are `branchedGate` closures whose predicate is *deliberately omitted* from the
metadata sidecar, so the gate graph is not invertible and no witness can be synthesised.

So test **count** favours B ~4-5×; test **power** is *split*:
- **B wins** on stage granularity (61 pure-function unit tests with no world to construct),
  empirical adequacy evidence (the mutation register), and structural integrity
  (cycles, duplicate ids/names — A has none of these).
- **A wins** on whole-model reachability proof — an asymmetric capability B cannot replicate.

"Materially better tested" is defensible on volume and granularity. "A's are neither" is not.

---

## 4. Two precision errors

- **"228 cases"** is not statically verifiable. Static count of B's `obligations/` test sites:
  `evaluator.test.js` 72, `evaluator.units.test.js` 61, `helpers.test.js` 24, `coverage.test.js` 8,
  `whitelists.test.js` 7 = **172**, plus 4 `it.each` expansion sites. 228 is plausible as a
  *runner* total, but it spans helpers/coverage/whitelists, not just the evaluator.
- **"mutations 1-11"** understates B. `docs/testing.md:5,10` — **"sixteen realistic mutations"**
  across three rounds, 4 gaps found, 3 closed, and **mutation 16 is a still-open deferred gap**
  ("subtle presentation-copy change — **gap — deferred**", `:593`). The claim credits B with less
  than it has *and* omits that B's own register carries a live open gap.

---

## 5. Amended claim (the strongest version that is true)

B's evaluator is materially better **unit**-tested and its docs match its code; A's docs do not.
B: ~172+ obligations test cases, **61 of them stage-by-stage over 13 exported pure pipeline
functions** (no world to construct), a **16-mutation register across 3 rounds** (4 gaps found, 3
closed, 1 still open), and structural-integrity tests A lacks entirely — **duplicate-id/name
guards** (A's `registry.js:30` silently overwrites on duplicate id, untested) and a cycle guard.
Every `obligations.md` line-ref I checked resolves correctly against `evaluator.js`. A carries
**three live doc/code contradictions** on the engine's most delicate semantics — `limits.md:16` +
`obligation-model.md:277-281` say `entryComplete` cannot resolve enclosing gates when
`complete.js:35-41` does; `limits.md:54-56` says no feature controller calls the update path when
`consignment-details.controller.js:178` does; plus `scope-and-wipe.md:33-37` (EE-1) — and runs
**three completeness resolvers that can disagree about the same entry** (`collectionView` calls
`entryComplete` with no ctx, `collection-view.js:15`), an inconsistency accepted at
`DESIGN-DELTA.md:124-129`.

**But two corrections to the original framing.** (1) The **cycle guard is not an A-deficiency**:
B's `within` back-reference is a hand-authored parent pointer (19+ sites) whose self-loop *hung
B's entire suite* (`testing.md:548-556`, mutation 14) and the guard is the patch for it; A's
nesting is inline positional containment (three `item: [` literal sites, no parent-naming step
anywhere), so a cycle is not producible by any authoring action. B needed the guard; A does not.
(2) **A is not untested at the model level**: `analysis/reachability.test.js` enumerates the
finite scope space (24 states), synthesises a witness journey per obligation instance, runs the
real `reconcile`, proves no owed obligation is unreachable, and carries teeth tests that break
dispatch and confirm the prover fires — an asymmetric verification capability **B structurally
cannot replicate**, because `branchedGate` omits its predicate from metadata.

Shopping list: take **B's stage-by-stage exported pipeline + mutation register + duplicate-id/name
guards**, take **A's reachability prover**, take **A's containment nesting** (which removes the
cycle hazard rather than guarding it), and **fix A's three doc contradictions and its
ctx-less `collectionView` call**.
