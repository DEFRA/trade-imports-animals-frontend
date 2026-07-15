# L2 — Conditionality, gating, reveal and wipe-on-exit — A vs B

Sources: `state/L1-conditionality-gating-A.md`, `state/L1-conditionality-gating-B.md`, both re-checked against
source. Paths are relative to each side's root:

- **A** = `clone-live-animals/prototypes/standalone/live-animals/` (HEAD b6ac2ed)
- **B** = `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (HEAD d59b432)

Both models happen to carry **exactly 44 obligations**. A has **15** conditional ones; B has **19**.
That makes this dimension unusually comparable — near-identical requirement coverage, two opposite
paradigms.

---

## VERDICT: MIXED — and the split is not where the prior expected it

The standing prior is that B's obligations model is better, possibly in every respect. On this
dimension **the prior is half right and half refuted**, and the refutation is the more useful half.

Decompose the dimension into its four real parts:

| Part | Winner | Structural? |
|---|---|---|
| The **condition** language (what a gate can say, and what tooling can do with it) | **A** | Yes — B's closures are not invertible, not renderable, not portable |
| The **consequence** language (what a gate can *do* when it fires) | **B** | Yes — A derives one quantity (`inScope`); `required` is a static boolean |
| **Reveal** (does the page render the gate, or re-implement it?) | **B** | No — discipline, not expressiveness. But A has already drifted at 5 sites |
| **Wipe** (does destruction reach the store, and can it be bypassed?) | **A** | Yes for B's instance-identity hazard; the persistence hole is a one-liner |

Neither side wins outright. A's advantage is **not** a build-loop artefact — `predicate.js` is 69 LOC and
`gates.js` is 37 LOC; nothing about A's conditionality is "more finished", it is *differently shaped*.
Equally, B's advantage is real and is not merely the 3,000-line write-up: `branchedGate`'s `whenFalse`
branch is a genuine axis A's engine does not have.

### The finding that reframes the whole dimension

**Every one of B's 19 conditional gates is expressible in A's closed 4-operator vocabulary.** I enumerated
them (claim C1). B chose a Turing-complete closure model — `applyTo` receives the entire fulfilments map,
so *no gate is inexpressible* — deliberately rejecting a declarative DSL it had already built
(`GAPS.md:62-86`, `:187-192`). And then, against the real V4 requirement set, **it never once used that
power**. Five `branchedGate` predicates: three are scalar equality, one is set-membership, one is
presence. Six `allowListed`: set-membership. Two `allowListedByPredicate`: negation-by-complement. Two
`anyAllowListed`: existential-over-a-collection. That is A's `equals` / `includes` / `present` /
`notInUnionOf` × `same-frame` / `enclosing` / `anyItem`, exactly, with nothing left over.

Independently, A's own machine-readable spec (`spec/journey-spec.json`, 20+ `activatedBy` blocks) contains
**zero compound conditions** — every digested V4 rule is a single predicate over a single obligation.

So the classic argument for closures — *"a DSL will eventually meet a condition it cannot express"* —
is, on this requirement set, **unpaid-for**. B bought unbounded condition expressiveness and spent
introspection, static analysis and cross-language portability to pay for it (claim C2). That is a bad
trade *for this journey*, and it is the single most surprising thing in the comparison.

**The asymmetry that is real is in the CONSEQUENCE, not the CONDITION.** B's `applyTo` returns
`{ inScope, status, records, reasons }` — four independent axes. A's `activatedBy` produces one boolean
that is then conflated with three separate concerns: *is it visible*, *is it owed*, *is it destroyed*.
B can say "always visible, retained, optional until X, then mandatory" (`regionCode`, `obligations.js:190-198`;
the 4-field accompanying-document block, `:754-786`). **A cannot express that at all** (claim C3) — its
`required` is a static boolean (`docs/obligation-model.md:19`) and its engine's only derived output is
`inScope` (`reconcile.js:47` returns `{ inScope, wiped }`).

Note the two sides actually **disagree about a live V4 rule** because of this. A models
`regionOfOriginCode` as gated + `wipeOnExit: true` (`spec/journey-spec.json:600-604`): hidden and
destroyed on `no`. B models it as always-in-scope, status-swapped, retained, with the comment *"V4 spec:
the field itself is not purged on `no`"* (`obligations.js:186-189`). One of them is wrong about the
requirement — and A's model **could not have represented B's reading even if it wanted to**. That is what a
structural expressiveness gap looks like in the wild.

### Where A is better, and it is not close

**Wipe.** A's is derived (`reconcile.js:32-46` names paths, deletes nothing), applied by a single site
(`lib/path.js:59-63` `destroyWiped`), and — decisively — **persisted**: `commit` writes the post-wipe
answers (`write.js:14-16`). The engine facade exports no `setScope` and no per-key delete, so a page
*physically cannot* hand-roll a wipe or fake scope.

B's purge is equally well-derived (`evaluator.js:333-379`, step 5 of a 7-step pure pipeline) and then
**thrown away**. `readState` is the whole read path:

```js
// lib/state.js:42-44
export function readState(request) {
  return evaluateState(readFulfilments(request))   // evaluates; discards the amended map
}
```

All five `writeFulfilments` call sites (`state.js:76,115,161,201,221`) rebuild from
`{ ...readFulfilments(request) }` — the **raw** session map. I confirmed this by reading every one.
Nothing writes `state.fulfilments` back. So B's wipe is a **read-time projection**: orphans rot in the
`@hapi/yar` session forever, and a gate flipped false-then-true **resurrects the old answer, pre-filled**
(`build-field-descriptors.js:80-82` reads it straight back). `obligations.md:465`, `:2039` and `:658-661`
all promise the opposite. That is a one-line fix and I am not scoring it as structural — but it means
**B has never actually run the wipe it documents**, and the model's `mandatoryWhen`-vs-`appliesWhen`
distinction, its best idea, is currently *unobservable at runtime*.

What **is** structural on B is instance identity (claim C6): a group instance has no storage of its own —
its existence is inferred from descendants' composite-key prefixes, **post-purge**
(`evaluator.js:406-418`). That is why `addUnitRecord` must fake a leaf into existence
(`state.js:196-200`, `seed[compositeKey] = ''`). Change a horse line's commodity code to a pig code and
the seeded `passport` record is purged → no descendant storage → `unitRecord.records = []` → **the user's
animal silently disappears**. A's collections are real arrays in a nested answers tree
(`registry.js:44-71` walks them), so wiping every field of an entry leaves the entry standing. B's fix is
an instance registry — a storage-shape change rewriting evaluator steps 2/5/6 and every `state.js` mutator.

### Where B is better, and A's docs oversell

**Reveal.** B's is derived at *both* ends: the render side filters out-of-scope entries out of the
descriptor list (`build-field-descriptors.js:67`), and the POST side iterates **the same descriptor list**
(`contract.js:224-228`), so an out-of-scope field can be neither shown nor written. `flow/flow.js` (667
LOC, 31 pages) declares **zero** visibility rules.

A derives page and section gates just as cleanly (`flow/gates.js:21-37`, 5 conditionally-reachable pages,
exactly **1** authored gate in the whole flow) — but **inside** a page, exactly **one** render path asks
the engine whether a field is in scope (`features/additional-details/controller.js:61`). The other **seven**
re-implement the predicate by hand, and **five of those never touch the obligation at all**:
`consignment-details.controller.js:17-18` reads the service list directly, bypassing
`numberOfPackages.activatedBy`; `additional-details/controller.js:13-18` hand-rolls an `anyItem`
quantifier; `check-answers/controller.js:111,150` compare raw string literals (`=== 'yes'`,
`=== 'internalMarket'`); `features/origin/template.njk:42` hard-codes the GDS `conditional` markup. A is
safe today **only because the wipe layer destroys what the page wrongly wrote** — reveal is best-effort UI
and the model is the safety net, which is exactly backwards.

I am **not** calling this structural (claim C5's caveat): nothing stops an A controller calling
`scope.has(...)` at all eight sites, and nothing stops `commit` filtering its patch by scope. It is a
discipline failure, not an expressiveness one. But it is a *live, already-realised* drift of five sites,
and it is what B's field-descriptor layer makes impossible by construction. That is a maintainability
verdict with teeth.

### Scoring the model, not the finish — explicitly

A is far more finished. **None of that counts here.** Strip the persistence, the uploader, the E2E suite,
the amend-and-resubmit, and score only the conditionality model:

- A's whole conditionality interpreter is **69 LOC** (`predicate.js`), its gating layer **37 + 31 + 74 LOC**
  (`gates.js`, `prerequisites.js`, `dispatch.js`), and it has **one** authored gate. That is not breadth;
  it is a small, closed, analysable core.
- B's evaluator is **519 LOC / 7 steps** and its gate-helper library **215 LOC**, and it drives more
  consequences per gate. That is not depth-by-accident either; it is a deliberately richer Decision.

The two are genuinely comparable in maturity *on this dimension*. Where A wins, it wins on model shape
(conditions are data). Where B wins, it wins on model shape (consequences are data). The build loop is
irrelevant to both findings.

---

## The shopping list for a third option

**Take from A:** `activatedBy` as a **data literal over a real obligation reference** (4 operators × 3
frame modes, `predicate.js:12-69`); `wipeOnExit` as a modelled flag with derivation separated from
application and **a write surface that has no delete primitive** (`write.js`, `lib/path.js:59-63`);
`notInUnionOf` complement-by-reference (`predicate.js:4-10,20-24`); derived page/section gates from
inverted `collects` plus the boot totality assertion (`flow/dispatch.js:26-65`); the reachability prover
(`analysis/reachability.js`) — which only exists because conditions are data.

**Take from B:** the **Decision shape** `{ inScope, status, records, reasons }` (`evaluator.js:278-293`);
`mandatoryWhen`-vs-`appliesWhen` as a **declared per-obligation wipe/retain policy**
(`obligations.js:190-198` vs `:213-225`); the pre-purge group-path map as `applyTo`'s second argument
(`evaluator.js:71-84`) *or* A's frames chain — not both; **field descriptors** so the model renders its own
gate and the POST path cannot write an out-of-scope field (`build-field-descriptors.js:67` +
`contract.js:224-228`).

**Take from neither:** B's closure conditions (nothing in the requirement set needs them, and they cost
the prover, the data dictionary and the Java port); A's eight hand-written reveal sites; B's
inferred-instance storage; A's `updateEntryAt` (`write.js:30-46` — no reconcile, live caller at
`consignment-details.controller.js:178`).

**The synthesis in one line:** *A's conditions with B's consequences.* `activatedBy` (data) →
`{ inScope, status, wipe, records, reasons }` (data). Both halves stay declarative; the reachability
prover survives; conditional requiredness becomes expressible; and the wipe is persisted by A's closed
write surface.

---

## Docs-vs-code disagreements found on BOTH sides (a reader trusting either write-up is misled)

| Side | Doc claim | Code |
|---|---|---|
| B | `obligations.md:465`, `:2039` — "the orchestrator persists the amended set — it becomes the new source of truth" | It does not. `lib/state.js:42-44` discards it; all 5 writers use the raw map. |
| B | `obligations.md:658-661` — "`appliesWhen` fields disappear on scope exit; their prior values vanish" | They do not. They resurrect, pre-filled, on a false→true flip. |
| A | `docs/scope-and-wipe.md:35-38` — the fixpoint loop exists because chains need >1 pass | Predicates read *values*, not scope (`reconcile.js:22-24`); `walk` emits ancestors first. The second pass adds nothing. |
| A | `docs/limits.md:54-58` — "no feature controller calls the update path" | `consignment-details.controller.js:178` does — and `updateEntryAt` never reconciles. |
| A | `docs/obligation-model.md:85` — "no cross-feature edge" | Two exist (`features/cph-number/obligations.js:1`, `features/additional-details/obligations.js:1`). |

Both sides' *worst* defect in this dimension is one their own documentation denies.
