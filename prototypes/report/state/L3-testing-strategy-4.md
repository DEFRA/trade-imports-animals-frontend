# L3 — testing-strategy, claim T4 (adversarial verification)

**CLAIM:** "A owns the only universal-property test on either side: a 215-LOC prover over the REAL
registry that enumerates the model's 24-state scope space, proves no obligation is unreachable and no
root is orphaned, and — uniquely — proves its own teeth by injecting a mutated page set and asserting
it bites. **B has no property test of any kind.**"

**VERDICT: AMENDED** — the artefact is real and genuinely distinctive, but the two "only"/"none"
clauses that carry the claim's weight are **false**, and the description of what the prover proves is
overstated on two axes.

---

## 1. The cited lines are real (verified)

All of A's evidence checks out literally:

| Cited | Verified |
|---|---|
| `analysis/reachability.js` = 215 LOC | ✔ file is exactly 215 lines |
| `:1-6` imports the **real** registry | ✔ `import { registry, walkObligations } from '../registry.js'`, plus real `pageOfObligation`, real `reconcile`, real `simulateJourney` |
| test `:22` `toHaveLength(24)` | ✔ verbatim |
| test `:26` `expect(proveReachability()).toEqual([])` | ✔ verbatim |
| test `:42` `expect([...orphanedRootIds]).toEqual([])` | ✔ verbatim |
| test `:61-75` teeth-at-depth | ✔ `pagesFor = (answers) => simulateJourney(answers).filter(id => id !== 'commodities')`; asserts `deadEnds` contains `commodityLines[0].numberOfPackages` and `packages.pageId === 'commodities'` |

Also real and *not* claimed: a **second** teeth test at `reachability.test.js:29-39` (`pagesFor = () =>
['origin','commodities']`, asserts every problem is `owning-page-unreachable-in-scope`). And
`beforeAll` at `:16-19` wires the **real** page set (`buildDispatch(dispatchPages)`), so the prover
runs against production flow config, not a fixture. `simulate.js:5-15` is likewise model-derived — it
walks the real `sections` applying the real section/page scope gates.

So the artefact exists, is wired to the real model, and does bite. That much survives.

---

## 2. REFUTED: "B has no property test of any kind"

This is the counter-example hunt, and it lands. B has **at least six** universal-property tests
quantifying over the real manifest. I read them; they are not incidental.

**`obligations/coverage.test.js`** — four distinct universals over `obligations` (the real manifest):

- `:81-86` — ∀ obligation: has a `domain` entry **or** is on `KNOWN_UNWIRED`. Totality gate.
- `:88-105` — two-way anti-rot on the allow-list: ∀ exempted name, still unwired; ∀ exempted name,
  still a real obligation. (A drift guard on the guard.)
- **`:108-137` — ∀ obligation: the `within` chain terminates.** Walks each chain with a seen-set and a
  depth-100 bound. This is a genuine graph-theoretic property (acyclicity) proved exhaustively over
  the real model, with the failure mode written out in-file: *"Without this, a self-loop or a cycle in
  the manifest hangs the whole evaluator."* **A has no equivalent** — nothing on A's side proves
  `activatedBy`/`item` nesting is acyclic.
- `:139-169` — ∀ obligation: `id` unique, `name` unique.

**`obligations/whitelists.test.js:231-238`** — ∀ whitelist: set-equality against a hard-coded
`EXPECTED` (7 of 7 covered).

**`features/commodity-lines/controller.test.js:66-80`** — ∀ depth-1 leaf in the real manifest: has a
per-line page. (Obligation→page totality, scoped to `within: commodityLine` — the same *class* of
property as A's dispatch assert, narrower in reach.)

**`i18n-coverage.test.js:133, 149, 165, 181, 195`** — ∀ key derived by walking the real
`flow.sections` / `presentation.js` / `domain` / `format-domain-errors`: resolves in `locales/en.json`.

Neither side has property-**based** testing in the QuickCheck sense — `grep -rln "fast-check|jsverify|
fc.assert|forAll"` over both `prototypes/` trees returns **zero source hits** on either side. B's
`obligations.md:742-744` explicitly notes property-based testing "is feasible (generate random
fulfilment combinations…)" and does not do it. So on *randomised* property testing the score is 0–0,
not 1–0.

**"B has no property test of any kind" is simply false.** It is the single most damaging sentence in
the claim, because it is the one a reader would act on.

---

## 3. AMENDED: "enumerates the model's 24-state scope space"

The 24-state space is **hand-authored, not derived from the model**. `reachability.js:8-20`:

```js
export const enumerateScopeStates = () =>
  ['no', 'yes'].flatMap((regionOfOriginCodeRequirement) =>
    ['', 'internalMarket'].flatMap((reasonForImport) =>
      ['', 'Road Vehicle'].flatMap((meansOfTransport) =>
        ['', 'Commercial', 'Private'].map((transporterType) => ({ ... }))
```

It reads **nothing** from `registry`. It is a 2×2×2×3 cartesian product over four hardcoded obligation
ids with hardcoded literal values — a hand-maintained mirror of A's four *root-level* gates
(`origin/obligations.js:15`, `import-purpose/obligations.js:6`, `transport/obligations.js:20,32,42`).
Add a fifth root gate and this function does not grow. (It does at least **fail closed**: an
obligation the seed cannot reach reports `no-witness-puts-in-scope`, so the test goes red and forces a
human to extend the list. Credit where due — but that is a tripwire, not derivation.)

The *item-level* gates (the twelve `enclosingCommodity` / `frame: 'anyItem'` /
`enclosingCommodityNotInUnionOf` gates in `features/commodities/`, `cph-number/`,
`additional-details/`) **are** genuinely model-read, via `gateValue()` (`:36-47`) and `scaffoldFor()`
(`:49-91`). So the prover is half-derived, half-fixture — and the claim credits the whole thing as
derived.

Consequently `reachability.test.js:22` — `expect(enumerateScopeStates()).toHaveLength(24)` — is a
**tautology over a literal**. 2×2×2×3 = 24. It pins nothing about the model; it is a non-vacuity guard
at best. Citing it as evidence of "enumerates the model's scope space" is the weakest line in the
evidence set.

Note this also **refutes L2 §8's** claim that "A's gates are inert data … so `enumerateScopeStates()`
reads the trigger values straight off the model." It does not. The retrofit-cost comparison in L2 §8
(A cheap / B ~300 LOC because `applyTo` is a closure) is therefore softer than stated: A's root-gate
enumeration is *also* hand-written, so B would be hand-writing something A already hand-wrote.

---

## 4. AMENDED: "proves no obligation is unreachable"

What `proveReachability` (`:184-215`) actually proves is **∀ obligation ∃ state**, not ∀ state:

- `buildWitnesses` (`:159-182`) loops the 24 candidates and **`break`s on the first** state that puts
  `targetKey` in scope (`:174-177`).
- `proveReachability` then checks the owning page's presence in `pagesFor(answers)` **for that one
  witness only** (`:204`).

So the theorem is: *every obligation is reachable in at least one state* — i.e. no obligation is
**always** unreachable. A dead end that exists only in some *other* in-scope state is invisible.

It is weaker still in practice. `withoutBlanks` (`:93-94`) drops `''` entries, so a state's blanks
fall through to the fixed `submitReadySeed` — a **63-line canned answer set** (`:95-157`) that already
answers the whole journey. State[0] is therefore ≈ the seed, and for the great majority of obligations
the loop matches on the first iteration. For most of the model, `proveReachability` collapses to *one
simulated journey over one canned answer set*. The 24 states only do work for the handful of
obligations the seed does not reach (`regionOfOriginCodeRequirement: 'yes'`, `meansOfTransport: 'Road
Vehicle'`, `transporterType: 'Private'`).

"215-LOC prover" is also flattering: ~63 of those lines are the seed fixture and ~13 are the hardcoded
state list. The proving machinery is ~110 LOC.

---

## 5. AMENDED: "uniquely proves its own teeth"

True as stated for *in-code mutation injection* — A is the only side that hands a mutated dependency
(`pagesFor`) to its own prover and asserts a specific failure (`:29-39`, `:61-75`). I found nothing
equivalent in B.

But "uniquely" oversells the **instinct**, which B has in three places and A does not have at all:

- `whitelists.test.js:162-174` — an explicit anti-tautology note and the set-equality that follows:
  *"Positive-case tests above iterate the imported list; if only that were tested, widening the list
  would just add passing cases."* That is a teeth argument, written down, then implemented.
- `i18n-coverage.test.js` — **five** paired non-vacuity guards ("collects at least one key (guards
  against a silent walk regression)") sitting directly above each ∀-key assertion, precisely to stop
  the universal passing vacuously. Same defect class A's `toHaveLength(24)` guards against.
- `docs/testing.md` — the 16-mutation register, which is teeth-proving run manually across the whole
  suite and treats "0 tests failed" as a defect. **A has never run one.**

A owns the only *injected-mutation* teeth test. It does not own the only teeth *mechanism*, and on the
systematic version of the practice B is ahead.

---

## 6. What survives — and it is worth having

Strip the false and the overstated and there is still a real, defensible asymmetry, and it is
**not** the one the claim states:

Every one of B's universals is **static and structural** — properties of the manifest *as a graph*
(acyclic, unique, totally wired, totally keyed). Not one of them evaluates scope over a *state space*
or asks whether a reachable page ever actually asks for the field. A's prover is the only test on
either side that composes **scope evaluation × flow simulation** and reasons about *dynamic
reachability through the journey*, and the only one that injects a mutation to prove itself.

That is a real capability gap and it is a shopping-list item — but note it is a gap in **what was
built**, not in **what B can express**. B's `flow.js` sections are data, its `applyTo` gates are
closures over exported constants (`coverage.test.js:187` calls `po.applyTo()` directly), and its
`domain` carries enum option lists. B can enumerate candidate states and call `applyTo` to build the
same prover. It is more expensive than A's (the gate's *input domain* is not readable by inspection),
but it is **not structurally blocked**. Claim T4 as written implies a structural asymmetry; there
isn't one — there is a build-state asymmetry, which is exactly the trap the brief warns about.

---

## Searches run

- `find … -name "*.test.js"` over B's `prototypes/` → 26 files (23 live + 3 frozen-ancestor).
- `grep -rln "fast-check|jsverify|property-based|forAll|fc\.assert"` over **both** clones' `prototypes/`
  → no source/test hits on either side (3 doc/JSON hits in A's dead `obligations-standalone-spike`).
- `grep -rln "for (const o of obligations)|obligations.filter|obligations.every|obligations.map"`
  over B's tests → led to `coverage.test.js`, `whitelists.test.js`, `controller.test.js`.
- `grep -rn "flatMap|cartesian|permut|combinations|for (const state"` over B → **no state-space
  enumeration anywhere** in B's code (only `obligations.md:742-744` saying it would be feasible).
- `grep -rn "mutat|teeth|tautolog"` over B's gate tests → `whitelists.test.js:3,164,167`.
- `grep -rn "activatedBy"` over A's `features/**/obligations.js` → 16 gates; 4 root-level (the ones
  `enumerateScopeStates` hardcodes), 12 item-level (the ones `scaffoldFor` derives).
- Read in full: A `analysis/reachability.js`, `analysis/reachability.test.js`, `analysis/simulate.js:5-15`;
  B `obligations/coverage.test.js`, `obligations/whitelists.test.js:150-238`,
  `features/commodity-lines/controller.test.js:50-81`, `i18n-coverage.test.js` (test names),
  `obligations.md:725-754`.
