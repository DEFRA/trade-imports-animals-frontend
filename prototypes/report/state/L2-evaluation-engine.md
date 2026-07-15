# L2 — Evaluation engine and semantics — A (live-animals) vs B (flow-layer)

**Verdict: B-better** — narrowly, on the model's evaluation semantics, and *not* a rout.
A holds exactly one thing B structurally cannot have. B holds exactly one thing A
structurally cannot have. They are the two horns of the same trade-off, and the third
option must pick a side or straddle it deliberately.

---

## 0. Three corrections to the Layer-1 reads

I went back to source. Both L1 agents were generous to A on the same three points, and one
was over-cautious about A. Correcting these changes the shape of the comparison.

### 0.1 A's fixpoint loop does NOT give A chained-gate semantics. A and B are broken *identically*.

L1-A frames A's monotone least-fixpoint (`reconcile.js:11-30`) as a real mechanism and
frames B's single-pass pipeline as a defect ("it will bite the first time someone gates a
gate", L1-B F2). **Both sides have exactly the same bug, for exactly the same reason.**

`evalPredicate(activatedBy, answers, frames)` (`predicate.js:31`) does not take `inScope`
and does not read it. Every resolution branch calls `valueAt(answers, ...)` — the **raw
stored value**. And `inScope.add(key)` (`reconcile.js:26`) is the only mutation: scope
**only grows**. So a gater `G` that has itself gone out of scope still holds its stale
value in `answers`, its dependant `D` reads that value, and `D` **enters scope and can
never be removed** by the loop. Iterating to a fixpoint over a monotone-growing set cannot
fix a staleness bug; it can only add more wrong entries.

B's version (`evaluator.js:80-84` runs every `applyTo` over `recognisedFulfilments`;
purge is step 5 at `:94`) is the same defect, stated honestly and without a loop.

Both converge only once the stale value is *physically removed from storage* — A on the
next `commit`'s `destroyWiped`, B on the next `evaluate`'s purge.

`docs/scope-and-wipe.md:33-37` justifies A's loop as handling "activation references [that]
chain — an obligation activated by another obligation that is itself conditional". **That
claim is false.** The loop's only real job is ordering the collection-ancestor containment
gate (`reconcile.js:17-22`) — and `registry.walk` (`registry.js:51-58`) yields parents
before children anyway, so even that converges in one productive pass. The loop is
vestigial, and it is documented as doing something it does not do.

Neither model has a live 2-level chain today (A: verified — `reasonForImport`,
`commoditySelection`, `meansOfTransport`, `transporterType`, `regionOfOriginCodeRequirement`
all carry no `activatedBy`, so live activation depth = 1. B: same, per L1-B). It is latent
on both sides. **This kills the one place A looked structurally superior.**

### 0.2 A's "cycle-freedom by construction" is not an asymmetry — and on the *structural* graph A is worse than B.

L1-A's headline: "cyclic activation is STRUCTURALLY IMPOSSIBLE, not merely detected… the
class of bug does not exist." True — but **equally true of B**. B's `applyTo` receives
`(recognisedFulfilments, preEnumeratedGroupPaths)` (`evaluator.js:288`) — raw storage and a
Map of group instance-paths. It never receives scope decisions either. B's *gate* graph is
cycle-free by exactly the same construction. This is a tie, not an A-win.

Where cycles actually bite is the **structural nesting graph**, and there A is *strictly
worse*:

| | Structural chain walker | Guard |
|---|---|---|
| A | `registry.js:38-41` `walkObligations` recurses on `obligation.item` — no seen-set, no depth bound | **none** — grep for `cycle\|seen\|visited\|depth limit` across `engine/`, `registry.js`, `flow/` returns **zero hits** |
| B | `evaluator.js:188-200` `while (cur) { cur = cur.within }` — no seen-set, no depth bound | `coverage.test.js:108-137` — seen-set + depth-100 bound at test time |

Both hang on a self-referential model. Only B tests for it.

### 0.3 A's `anyItem` is *not* limited to the node's own collection subtree (L1-A over-cautious)

L1-A lists as `[STRUCTURAL]`: "an obligation nested inside collection X cannot run an
`anyItem` predicate over an unrelated root collection Y". **Refuted.** `registry.walk`
(`registry.js:64-67`) builds `frames` as `[innermost, …, outermost]`, and the outermost
frame is always `{framePath: [], siblings: all}` (`registry.js:49`). `anyItem` iterates
*every* frame (`predicate.js:51`) and `continue`s until it finds one whose siblings hold a
collection containing the reference. The root frame is on **every** chain and its siblings
are **every root obligation**. So a depth-2 obligation *can* `anyItem` over an unrelated
root collection. A false limitation; removed from A's ledger.

---

## 1. What each side actually is

| | A — `engine/` | B — `obligations/evaluator.js` |
|---|---|---|
| Pure evaluator LOC | **258** (`engine/evaluate/`, 5 files) | **519** (one file) + 601 runtime primitives (`engine/index.js`) |
| Activation interpreter | `predicate.js` — **69 LOC**, the single place a gate is given meaning | none — a gate *is* a JS closure |
| Gate vocabulary | **closed**: 4 operators (`equals`, `includes`, `notInUnionOf`, `present`) × 3 frame modes. **0 combinators** | **open**: `applyTo(fulfilments, groupPaths) → Decision`, arbitrary JS |
| Gate carriers | 15 `activatedBy` literals | 19 conditional `applyTo` (9 `branchedGate`, 6 `allowListed`, 2 `allowListedByPredicate`, 2 `anyAllowListed`) |
| Evaluation context | `answers` (whole map) + `frames` — an innermost-first chain of `{framePath, siblings}`; resolution by **object identity** | `fulfilments` (whole flat map) + `Map<groupId, string[]>`; **no path/instance argument** — called once for the whole state, returns `records: string[]` |
| Storage shape | **nested tree** (`commodityLines[0].animalIdentifiers[1].passport`) | **flat composite keys** (`{passport: {'line1/unit1': v}}`) |
| Output | `{inScope: Set<pathKey>, wiped: pathKey[]}` — `wiped` **discarded on read** (`read.js:28`) | `{fulfilments: amended, obligations: implications}` — the **purged set is the primary output** |
| Throw sites in evaluator | **1** (`predicate.js:26`, unknown operator; unvalidated at boot) | **0** — and 0 `try`/`catch`; a throwing `applyTo` is a 500 |
| Memoisation | none (3+ full reconciles per POST) | in-call `inScopeCache` (`evaluator.js:305`); `evaluate` itself uncached |
| Evaluator tests | **40** | **228** (61 of them stage-by-stage over 12 exported pipeline functions) |

---

## 2. The shared defect — the single biggest finding

**Both models infer instance existence from stored data, so neither can evaluate a gate for
an instance that does not exist yet. Both worked around it with a hand-rolled, partial,
second gate evaluator in a controller.**

- **A**: `registry.js:60` — `walk` only descends into `valueAt(answers, path) ?? []`. No
  entry ⇒ no node ⇒ no scope. Compounded by `read.js:31` `has: (id) => inScope.has(id)` —
  an exact match on a **path-keyed** Set, so the public API resolves **roots only**; there
  is no `scope.hasAt(path)`.
- **B**: `evaluator.js:244-271` — a group's instances *are* its descendants' storage-key
  prefixes. Hence the seed hack (`lib/state.js:105-114`: write `''` purely to make the
  instance visible).

The workarounds:

| | Sites | Shape |
|---|---|---|
| **A** | **4 files, 5 functions** | Re-implements the operator by hand against the model literal: `animal-identification.controller.js:42-43` (`obligation.activatedBy.includes.includes(commodity)`), `:67-68` (`notInUnionOf`), `consignment-details.controller.js:17-18` (`packagesApply` — **and it drives the commit decision at `:181-183`**), `additional-details/controller.js:13-18`, `cph-number/controller.js:16`. Never calls `applyPredicate`. |
| **B** | **1 file** (+1 same trick in `features/commodity-lines/controller.js`) | Branches on the `.metadata` string tag (`features/units/controller.js:204-218`), covering **2 of 4** gate shapes. A `branchedGate`- or hand-written-gated unit obligation is invisible → the line silently offers no "add animal" affordance. `helpers.js:83-88` — the **entire 6-line diff from the frozen ancestor** — exists solely to feed this call site. |

A leaks in more places; B's leak is more brittle (silent, and it forced a change to the
model layer). **Same root cause. Neither model solves it. This is shopping-list item #1 for
the third option: an explicit instance registry (`instances: {commodityLine: ['line1']}`) or
a hypothetical-frame evaluation API (`scope.wouldBeInScopeAt(path, prospectiveFrame)`).**

---

## 3. The real asymmetry — and it is exactly one each

### A-only: the gate set is *statically analysable*, so A can prove reachability. B cannot.

A's `activatedBy` is a **data literal over a closed 4-operator vocabulary**. A tool can
enumerate the gate graph, **invert** a gate (read `.includes` / `.equals` to synthesise a
witness value that opens it), and prove properties over the model. `analysis/reachability.js`
(215 LOC, **run as a test on every run**) does exactly this: it scaffolds a witness journey
per obligation instance, reconciles it with the *real* `reconcile` (`:174`), and asserts
every instance lands in scope and no root is orphaned.

B structurally cannot build this:
- `branchedGate`'s metadata is `{type, whenTrue, whenFalse}` (`helpers.js:135-139`) — it
  **deliberately omits the predicate**. **9 of B's 19 conditional obligations** are
  `branchedGate`-scoped. Black box.
- `branchedGate`'s predicate takes the **whole fulfilments map** — there is no finite domain
  to brute-force over even if you exposed it.
- `GAPS.md:83-86` enshrines the opacity: *"Custom one-off applyTos just omit metadata."*
- `allowListedByPredicate` exposes `predicate` (`helpers.js:88`) so you can **test** a
  candidate value but not **enumerate** the admitting set.

An arbitrary JS closure over the whole state is not invertible. This is the direct,
unavoidable price of B's (reasoned, `GAPS.md:62-86`) rejection of a DSL.

**Crucially: this is a MODEL win for A, not a build-loop artefact.** B did not fail to write
a prover because nobody pointed a loop at it; B *cannot* write one.

### B-only: multi-condition / arithmetic gate logic, expressible *inside the model*.

`applyPredicate` (`predicate.js:12-29`) is four `if ('X' in activatedBy)` checks,
**first-match-wins, immediate return**. `activatedBy` carries **exactly one** obligation
reference (`predicate.js:36`). There is no `all`/`any`/`not`, no array of predicates, no
nesting, no arithmetic. **"In scope iff (`reasonForImport == 'internalMarket'` AND
`countryOfOrigin` is present) OR `numberOfAnimals > 50`" is inexpressible in A's model.**

A's own docs own this and name the escape hatch: *"Anything that needs real branching —
arithmetic, multi-condition logic, external state — belongs in a page controller. That is
the pressure valve"* (`docs/obligation-model.md:139-143`).

**And the pressure valve is corrosive.** A gate pushed into a controller is invisible to
`reconcile` — so `inScope`, `wiped`, `statusOf`, `flow/prerequisites` **and
`analysis/reachability.js`** all give the wrong answer for that obligation. A's prover then
proves reachability over a model that no longer describes the app. B expresses the same rule
as a closure and it **stays inside the model**, so purge, status and implications all see it.

This has **not yet bitten A** — the 4 controller gate duplicates exist because of the
hypothetical-instance blindness (§2), not because of the operator ceiling. It is a
forward-looking risk, not a current defect. But for a regulatory import-notification journey
with a 109-finding Figma gap-register, "no AND" is a ceiling you will hit.

**That is the whole trade: A = closed data vocabulary → analysable but inexpressive.
B = open closure vocabulary → arbitrarily expressive but un-analysable.**

---

## 4. Everything else — where each is better, and what it costs

### B is better, and A could adopt it

| | B | A | Retrofit into A |
|---|---|---|---|
| **Single-sourced evaluation** | 1 evaluator + 1 leak | 1 scope evaluator + **3 completeness resolvers** (`evalPredicate` / `entryComplete` / `collectionView` calling `entryComplete` with **no ctx**, `collection-view.js:15`) that **can disagree about the same entry** — accepted in `DESIGN-DELTA.md:126-127`, currently latent because no consumer reads `.complete` for `commodityLines` | Thread the ctx `collectionView` already has the `basePath` for. Cheap. |
| **Scope-clean output by construction** | `evaluate` returns `{fulfilments: amended}` (`:123-126`); every controller reads through `readState` (`lib/state.js:42-44`). **No consumer can see an out-of-scope value.** | `makeScope` **discards `wiped`** (`read.js:28`). Wipe is applied on only **3 of 5** write ops (`write.js:14, :57, :74` — **not** `appendEntryAt`, **not** `updateEntryAt`, which is live at `consignment-details.controller.js:178`). `engine/persistence/records.js` has **zero** scope references. Nothing ties `activatedBy` to `wipeOnExit`. | Return `wiped` from `makeScope`, or filter at the mapper. Cheap, and **A should do it**. |
| **Test rigour** | 228 cases; **every pipeline stage is an exported pure function** → 61 unit tests with no world to construct; a **mutation register** (`docs/testing.md`, mutations 1-11) | 40 cases (good ones — synthetic forests via `reconcile`'s test-only `forest` seam) | Export A's stages; steal `coverage.test.js` (whitelist gate + cycle detection + id/name uniqueness). An afternoon. |
| **Doc/code fidelity** | `obligations.md` matches the code exactly, including line refs (L1-B audited) | **3 contradictions**: `obligation-model.md:277-281` + `limits.md:16` both say `entryComplete` cannot resolve enclosing gates (it has since inc-035, `complete.js:35-41`); `limits.md:54-56` says "no feature controller calls the update path" (`consignment-details.controller.js:178` does) | Fix the docs. |
| **Model-version tolerance** | `dropUnknownFulfilments` (`evaluator.js:227-235`), 9 LOC | An `answers` key with no obligation yields **no node**, so it is never in scope *and never wiped*. It survives forever and reaches `records.js` unfiltered. | ~9 LOC prune pass. Not structural. |

### A is better, and B could adopt most of it

| | A | B | Honest discount |
|---|---|---|---|
| **`notInUnionOf` — complement-by-reference** | The negative gate names the **positive gate obligations**; the engine derives their `includes`-union at eval time (`predicate.js:4-10, :20-24`). Add a 5th typed identifier and the complement updates itself. 7 lines of engine. | `noSpecificIdentifier` (`obligations.js:674-678`) **hand-restates the four whitelist constants**. Add a 5th typed identifier and the free-text fallback *also* opens on those lines. **The drift bug is live and one requirement away.** | **Not an asymmetry.** B can express it in ~3 lines off `allowListed`'s `.metadata.values`. A real maintainability win; a shopping-list item, not a structural one. |
| **Engine-owned, unforgeable write surface** | `engine/index.js` — a 10-export facade with **no `setScope`, no delete**. `destroyWiped` sorts paths with `wipeOrder` so no delete shifts another's target (`lib/path.js:47-63`). A page **physically cannot** forge a wipe. | The evaluator is **read-only**. Every mutation is in `lib/state.js`, which hand-`delete`s keys (`:55`, `:59`). | **Partly a build-loop artefact.** B is a model spike; it never needed a write engine. Score it as architecture the third option should keep, *not* as evidence B's model is worse. |
| **Declarative cardinality** | `maxEntriesFrom` — cap a nested collection from a **sibling count field in the frame that holds the collection** (`cardinality.js:20-31`), enforced in exactly one place (`write.js:23-24`, `appendEntryAt` returns `null` at the cap) | **Nothing.** `numberOfAnimals` is a plain field; grep finds no cap primitive anywhere in the manifest. | B *could* declare it — but has no engine write surface to enforce it in, so it would land in a controller. Not structural. |
| **Frame-chain context** | Resolution by **object identity** on an innermost-first frame chain. Same-frame needs no marker — a sub-obligation literal is **copy-pasteable between depths**. `frame:'enclosing'` walks arbitrarily far outward (`predicate.js:38-48`). | `applyTo` gets **no path argument** and is called once for the whole state. Cross-level gating works via `filterAndProject`'s `projectionGroup` — but `pathPrefix` (`helpers.js:212-215`) splits at the **first** slash only, so the *helper* only projects from a **depth-1** gate. | A hand-written `applyTo` can do arbitrary prefix arithmetic. A helper limit, not a model limit. **A's frame model is the better abstraction for per-instance conditionality; B's whole-state model is the better abstraction for aggregation.** |
| **Derived prerequisites** | `enforcedAt:'continue'` + flow order + dispatch index → the whole prerequisite graph in **31 LOC** (`flow/prerequisites.js`). Exactly **one** authored gate in the entire flow. | No prerequisite concept (page NA is emergent from scope). | Different dimension (flow), but it is evaluation-derived and it is elegant. |

### Where both are equally broken

- **Chained gates** (§0.1) — identical defect, both latent.
- **Structural cycles** (§0.2) — both hang; only B tests for it.
- **Hypothetical instances** (§2) — identical blindness, both leaked into a controller.
- **Per-record mandate variation** — *neither* can express "mandatory on line 1, optional on
  line 2". A: `required` is **static on the literal** (`status.js:23-24`
  `Boolean(obligation?.required || obligation?.requiredAtLeastOne)`). B: `Decision.records`
  is `string[]`, and the decision's `status` is **silently discarded for every indexed
  obligation** (`evaluator.js:478, :490, :505` use `obligation.status`; only `single` at
  `:453-455` returns `own` wholesale). B's is one line from *half*-fixed; both need a model
  change for the full thing.
- **Boot-time validation of the gate literal** — A: none (a typo'd operator boots clean and
  throws at `predicate.js:26` on the first user's first render). B: none (a throwing
  `applyTo` is a 500). Both need it.

### A semantic divergence the third option must *choose*, not inherit

- **A**: gate closes → value **destroyed** on the next write (`destroyWiped`), for
  `wipeOnExit` carriers. Flip the gate back → **blank**. Deliberate, documented
  (`docs/scope-and-wipe.md`).
- **B**: gate closes → value **hidden from every consumer**, but the purge is **never
  persisted** — all 5 `writeFulfilments` call sites spread the **raw** session
  (`lib/state.js:51`). Flip the gate back → the old value **resurrects**. Emergent,
  undocumented.

Both are defensible. B's is safer against accidental loss; A's is safer against submitting a
passport number the user entered under a commodity code they later changed and changed back.
**Neither side chose this consciously on B's part. The third option must make it a per-obligation
declaration.**

---

## 5. Verdict

**B-better**, scored on the four criteria in the brief:

1. **More expressive** — **B, structurally.** A has a hard ceiling (4 operators, no
   combinator) and its escape hatch *expels the rule from the model*, silently corrupting
   scope/wipe/status/prereqs/reachability for that obligation. B has no ceiling and rules
   stay inside the model.
2. **More maintainable** — **B.** One evaluator + one leak vs one scope evaluator + three
   completeness resolvers (two of which can disagree) + four controller gate duplicates.
   228 tests vs 40, with every pipeline stage independently testable. Docs that match the
   code vs three doc/code contradictions on the engine's most delicate semantics.
3. **Fewer places to touch** — **B.** A conditional field in B: one `applyTo` helper in the
   manifest (two if it is unit-scoped and needs seed-picker support). In A: the obligation
   literal, plus a hand-rolled render gate in the controller if it lives in a collection,
   plus a hand-rolled commit gate if it is conditionally written (`consignment-details.controller.js:181-183`).
4. **Survives the real requirement set** — **B.** The live-animals rule set will need "A and
   B" and it will need arithmetic. A cannot say either.

**A is not the weak side.** It wins **static analysability outright and structurally** — the
reachability prover is a genuine, unusual asset that B *cannot* replicate, and it is a model
property, not a build-loop artefact. It also has the better *write-side* architecture
(unforgeable wipe, engine-enforced cardinality) and the better per-instance *context*
abstraction (frame chains, object identity, copy-pasteable literals) — though the write-side
win must be discounted, because B is a model spike that never needed a write engine.

**And A's headline claims do not survive contact with the source.** The fixpoint does not do
what its docs say. Cycle-freedom is not an asymmetry (B has it too, and A is worse on the
graph where cycles actually hang). `notInUnionOf` is a maintainability win, not a structural
one.

**The shopping list for the third option:**
- B's open `applyTo` vocabulary — **but with a mandatory, complete `.metadata` sidecar**, so
  A's reachability prover survives. This is the one genuine conflict, and it is resolvable:
  require every gate to declare its inputs and its admitting set, even when its body is a
  closure. That buys expressiveness *and* analysability.
- **An explicit instance registry** — closes the hypothetical-instance blindness that leaked
  into a controller on **both** sides. Highest-value single item.
- Fix chained gates **once**: evaluate predicates against **scope-aware** values (treat an
  out-of-scope gater's value as blank) and iterate to a fixpoint over a *shrinking* set.
  Note this deliberately trades away cycle-freedom-by-construction — so add a real cycle
  guard (B's `coverage.test.js:108-137`, promoted to a boot assertion).
- A's engine-owned write facade, `wipeOnExit`, `maxEntriesFrom`, `notInUnionOf` (as a
  derived-union helper over B's metadata), and `enforcedAt:'continue'` prerequisites.
- B's single 5-way classifier reused at every level, container status **re-derived not
  rolled up**, the `hasFulfilment`/`hasAnyInput` split, `dropUnknownFulfilments`, and the
  stage-by-stage exported pipeline with its 228 tests and mutation register.
- Make purge-vs-destroy a **per-obligation declaration**, not an emergent accident.
