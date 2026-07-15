# L1 — Evaluation engine and semantics — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals`, root `prototypes/standalone/live-animals/`.
All paths below are relative to that root unless stated.

## Headline

A's evaluator is **tiny, pure, total-except-for-one-throw, and genuinely single-sourced for
SCOPE** — but it is **not** the single evaluator for the application. Three of the four
things a journey needs to know about an obligation are computed by the engine
(`inScope`, `wiped`, `status`), and the fourth — **"should this input render / should this
field be committed"** — is computed by **hand, in controllers, by reaching into the
obligation's `activatedBy` literal and re-implementing the operator**. That is the single
most important finding on this dimension and it is structural, not sloppiness: I show below
why the engine's scope surface *cannot* answer the question the controller is asking.

Size of the whole evaluation core: **644 LOC** across 12 files
(`engine/index.js` 14, `read.js` 44, `write.js` 95, `status.js` 79,
`evaluate/predicate.js` 69, `evaluate/reconcile.js` 48, `evaluate/complete.js` 93,
`evaluate/cardinality.js` 31, `evaluate/collection-view.js` 17, `registry.js` 81,
`lib/path.js` 63, `lib/answered.js` 10). The *pure evaluator* is **258 LOC**
(`evaluate/` only). The **activation interpreter is 69 lines**.

---

## 1. How an obligation is evaluated

### 1.1 The pipeline

`makeScope(answers)` (`engine/read.js:27-35`) is the whole read-side entry point:

```js
export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: readyForCheckYourAnswersFn(answers, inScope)
  }
}
```

`reconcile(answers)` (`engine/evaluate/reconcile.js:6-48`) does three things:

1. **Materialise the instance catalogue.** `[...walk(answers)]` (`registry.js:44-71`)
   yields one node per *existing* obligation instance, each carrying
   `{ path, obligation, collectionAncestorKey, frames }`. `frames` is the innermost-first
   chain of `{ framePath, siblings }` — this is the evaluation context (see §3).
2. **Least-fixpoint over `inScope`.** `while (changed)` loop, `reconcile.js:11-30`. A node
   enters scope iff (a) its nearest collection ancestor is already in scope
   (`collectionAncestorKey`, lines 17-22) and (b) it has no `activatedBy`, or
   `evalPredicate` passes.
3. **Derive `wiped`** — every `wipeOnExit` instance that is out of scope and still holds an
   answered value (lines 32-40), deduplicated so only subtree roots survive
   (`isStrictPathPrefix`, lines 41-45).

Nothing derived is stored. `makeScope` runs `reconcile` **on every request**
(`read.js:43-44` → `get`), and every write path re-derives (`write.js:14,57,74`).
Resume therefore self-heals: a draft loaded a week later derives scope under the *current*
model. This is verifiably true — there is no scope/status field anywhere in the persisted
record.

### 1.2 The predicate interpreter — 69 lines, one file

`engine/evaluate/predicate.js` is the *only* place activation is given meaning
(for the engine — see §5 for who bypasses it). Two functions:

- `applyPredicate(activatedBy, value)` (lines 12-29) — the **operator** layer. Four
  operators, checked by `in` on the literal, in a fixed order:
  `equals` (strict `===`), `includes` (set intersection: `[].concat(value ?? []).some(...)`,
  so it reads "is one of these" for both scalars and multi-selects), `notInUnionOf`
  (answered AND in *none* of the referenced obligations' `includes` lists — the union is
  derived at runtime by `includesUnion`, lines 4-10, so the complement cannot drift from
  the positive gates it negates), and `present`.
- `evalPredicate(activatedBy, answers, frames)` (lines 31-69) — the **resolution** layer.
  Three frame modes crossed with the four operators.

### 1.3 Evaluation order and termination

**Order is irrelevant to the result.** This is the strongest property A's engine has and it
is easy to miss: **predicates read `answers`, never `inScope`**. Look at every branch of
`evalPredicate` — the only state it touches is `answers` (via `valueAt`) and the static
`frames`. Therefore:

- There is **no scope→scope dependency** except the collection-ancestor containment
  (`reconcile.js:17-22`), and that is a **tree**.
- **Cycles are structurally impossible.** Not "handled" — impossible. You cannot write a
  cyclic activation, because activation is a function of answers only, and answers are
  immutable for the duration of a reconcile.
- The fixpoint loop is monotone (`inScope` only grows, `reconcile.js:26`) and bounded by
  the node count, so **termination is guaranteed**. In practice `walk` yields parents before
  children, so it converges in 2 passes (one productive, one to observe `changed === false`).
- **Determinism is total**: no clock, no RNG, no I/O, no `Date`, no async in the evaluator.
  Even the value-domains the gates test against are static — `commodities.cphCommodities()`
  (`services/commodities/index.js:67`) returns a frozen stub constant, evaluated at module
  load, with no `mode.js` switch on that service.

**But the fixpoint loop's stated purpose has no live carrier.** `docs/scope-and-wipe.md:33-37`
justifies it as "activation references can chain — an obligation activated by another
obligation that is itself conditional — which is why a single pass is not enough." I checked
every gating obligation in the live model: `commoditySelection` (`features/commodities/obligations.js:3-7`),
`meansOfTransport` and `transporterType` (`features/transport/obligations.js:5,27`),
`regionOfOriginCodeRequirement` (`features/origin/obligations.js:7-10`). **Not one of them
carries `activatedBy`.** Activation depth in the live model is exactly 1. The loop is
insurance against a chain nobody has written.

### 1.4 Memoisation: none

There is no cache anywhere in the evaluator. `reconcile` re-walks the whole tree on every
call, and a single POST calls it 3+ times (e.g. `consignment-details.controller.js`:
`state.get` at :154 → `updateEntryAt` per line at :178 → `state.get` again at :186; each
`get`/`commit` reconciles). At 44 obligations and single-digit collection sizes this is
free, and the absence of a cache is what makes "nothing derived is stored" honest. It is a
scale limitation, not a correctness one.

---

## 2. Is evaluation total? (No — one throw, and it is not caught at boot)

`applyPredicate` throws on an unrecognised operator:

```js
// engine/evaluate/predicate.js:26-28
throw new Error(
  `Unknown activation predicate: ${JSON.stringify(Object.keys(activatedBy))}`
)
```

**There is no schema validation of `activatedBy` anywhere.** The boot sequence
(`routes.js:19-34`) runs exactly two model guards:

- `assertObligationPurity()` (`obligation-purity.js:19-46`) — a **source-text** scan that
  rejects any import from a `features/*/obligations.js` that is not another `obligations.js`
  or a `services/<name>/index.js`. It validates *imports*, not *shape*.
- `buildDispatch()` (`flow/dispatch.js:26-65`) — validates that ids are path-safe
  (`ID_UNSAFE = /[.[\]]/`, lines 8, 33-38), that no obligation is claimed by two pages
  (46-51), and that every non-`system` obligation at every depth is owned by exactly one
  page (55-63). It never looks at `activatedBy`.

So a typo'd operator (`{ obligation: x, equalz: 'y' }`) **boots clean and throws on the
first page render of the first user**. Everything else in the engine is total: `valueAt`
(`lib/path.js:18-22`) null-guards every hop and yields `undefined`; `isBlank`
(`lib/answered.js:1-8`) treats `undefined`/`null`/`[]`/`{}`/whitespace uniformly as blank;
a `frame: 'enclosing'` reference not found in any enclosing frame returns `false`
(`predicate.js:47`) rather than throwing, and likewise `anyItem` (line 61) — both pinned by
test (`cross-frame.test.js:321-348`). Missing data is never an error; it is "not activated".

Fail-loud is real elsewhere, and well done: the unconfigured `readyForCheckYourAnswers`
default throws (`read.js:7-12`), as does a derived gate consulted before `buildDispatch`
(`flow/gates.js:5-12`) — because an empty dispatch index is indistinguishable from
"collects nothing" and would silently gate every page out.

---

## 3. What the evaluation context is

The context a predicate can see is **`answers` (the whole map) + `frames`** — an
innermost-first list of `{ framePath, siblings }` built by `registry.walk`
(`registry.js:44-71`). `siblings` is the literal `item` array the node was walked from.
Resolution is by **object identity on the obligation reference**, never by string:

| Mode | How it resolves | Code |
|---|---|---|
| *(no `frame`)* | `siblings.includes(ref)` → resolve inside `frames[0].framePath`; else fall back to `answers[ref.id]` (a **root** lookup) | `predicate.js:64-68` |
| `frame: 'enclosing'` | walk `frames.slice(1)` strictly outward to the nearest ancestor frame whose `siblings` hold the ref | `predicate.js:38-48` |
| `frame: 'anyItem'` | find the sibling collection whose `item` holds the ref; predicate holds if **any** stored entry satisfies it | `predicate.js:50-62` |

Three consequences worth naming:

- The **same-frame case needs no marker**. `numberOfPackages` gated on its sibling
  `commoditySelection` is the same literal at depth 0 or depth 2 — resolution is *inferred*
  from sibling identity. That is elegant, and it means a sub-obligation literal is
  copy-pasteable between frames.
- The default fallback is **root, not "nearest enclosing"** (`predicate.js:67`,
  `answers[referencedObligation.id]`). If you want the enclosing frame you must opt in with
  `frame: 'enclosing'`. Silent-wrong is impossible only because a root lookup of an
  item-scoped id yields `undefined` → not activated.
- `anyItem` **only searches the frames on the node's own chain** (`predicate.js:51`). A root
  obligation's chain is `[{framePath: [], siblings: registry.all}]`, so it can see any root
  collection. But an obligation *inside* collection X cannot `anyItem` over an unrelated
  root collection Y unless Y is a sibling in some frame on its chain. Not a live problem;
  a real edge.

---

## 4. Is evaluation single-sourced? Scope: yes. Completeness: **no — three resolvers**

The docs call this the **"resolver-unity invariant"** (`docs/obligation-model.md:243-256`):
scope and completeness must resolve a reference identically, or the engine puts something in
scope that completeness does not count as owed. Reality:

**Resolver 1 — `evalPredicate`** (`predicate.js`). Full frame chain. Used by `reconcile`.

**Resolver 2 — `entryComplete`** (`complete.js:5-56`). Has a *partial* re-implementation of
the resolution rule, plus an **opt-in** `ctx` that delegates back to `evalPredicate`:

```js
// complete.js:26-41
if (siblings.includes(referencedObligation)) {
  if (!applyPredicate(subObligation.activatedBy, entry?.[referencedObligation.id])) return true
} else if (ctx && subObligation.activatedBy.frame) {
  if (!evalPredicate(subObligation.activatedBy, ctx.answers, ctx.frames)) return true
}
```

With `ctx`, unity holds. **Without `ctx`, an enclosing-gated required field is treated as
owed off-gate** (falls through to line 54's `!subObligation.required || isAnswered(...)`).
DESIGN-DELTA #5 (`DESIGN-DELTA.md:107-141`) documents this as a deliberate
backwards-compat choice.

**Resolver 3 — `collectionView`** (`collection-view.js:15) calls `entryComplete` **with no
ctx**:

```js
complete: obligation ? entryComplete(obligation, entry) : true
```

So `collectionView(answers, ['commodityLines'])[i].complete` and
`statusOf([{collection:'commodityLines', only:['animalIdentifiers']}], ...)`
(`status.js:44-57`, which *does* seed ctx) **can disagree about the same entry**: a horse
line's identifier record is FULFILLED by `statusOf` (permanentAddress is off-gate for
horses) but `complete: false` from `collectionView` (permanentAddress is `required: true`,
`features/commodities/obligations.js:80-85`, and without ctx the enclosing gate is invisible).
DESIGN-DELTA.md:126-127 explicitly accepts this ("`collectionView` … call with no ctx and
are unchanged"). **It is currently latent** — I traced all four `collectionView` consumers
(`hub/controller.js:182`, `check-answers/controller.js:215-217`,
`animal-identification.controller.js:386,417`, `documents/controller.js:111,303`) and none
of them reads the `.complete` field for `commodityLines`. It is a loaded gun, not a firing
one.

**Documentation disagrees with the code here, twice.** `docs/obligation-model.md:277-281`
and `docs/limits.md:16` both still say `entryComplete` "does not yet resolve enclosing gates"
and that a future increment "must thread frame context into `entryComplete`". The code
(`complete.js:35-41`) and DESIGN-DELTA #5 say it was done in inc-035. Two of the three
canonical model docs are stale on the single most delicate semantic in the engine.

---

## 5. THE BIG ONE — rendering and commit decisions bypass the engine entirely

The engine derives scope for *stored instances*. But a page rendering the entry form for a
record that **does not exist yet** has no instance, therefore no node, therefore no scope —
`walk` only descends into entries that are present in `answers`
(`registry.js:60-68`: `const entries = valueAt(answers, path) ?? []`). And `scope.has(id)`
(`read.js:31`) is an **exact match against a path-key Set**, so it can only ever answer for
*root* obligations; there is no public API of the form `scope.hasAt(path)`.

So the controllers re-interpret the model literal by hand:

```js
// features/commodities/animal-identification.controller.js:42-43
const typeApplies = (obligation, commodity) =>
  obligation.activatedBy.includes.includes(commodity)

// features/commodities/animal-identification.controller.js:67-68
const fallbackApplies = (obligation, commodity) =>
  !includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)
```

That is a **second, hand-rolled predicate interpreter**, living in a controller, reaching
through `obligation.activatedBy` and hard-coding the operator name. It reads the same *data*
(so the value-domain cannot drift) but it assumes the *operator*: change
`animalIdentifierPassport` from `includes:` to `equals:` and `typeApplies` silently
evaluates `undefined.includes(...)` → TypeError, or worse returns a wrong answer. The engine's
own `applyPredicate` is never called.

Three more sites duplicate a gate imperatively:

| Site | Duplicates | Model literal |
|---|---|---|
| `features/commodities/consignment-details.controller.js:17-18` `packagesApply()` | `numberOfPackages`'s `includes` gate | `features/commodities/obligations.js:11-18` |
| `features/additional-details/controller.js:13-18` `unweanedApplies()` | `containsUnweanedAnimals`'s `anyItem` gate | `features/additional-details/obligations.js:12` |
| `features/cph-number/controller.js:16` | `countyParishHoldingCph`'s `anyItem` gate | `features/cph-number/obligations.js:7-11` |

And the *commit* decision too — `consignment-details.controller.js:181-183` decides **which
field to write** by re-running the gate by hand:

```js
...(packagesApply(entry.commoditySelection) ? { numberOfPackages: values[packagesField(index)] } : {})
```

**Classification:** activation is **MODELLED DECLARATIVELY** for scope/wipe/status, and
**HANDLED IMPERATIVELY** for rendering and for per-field commit inside collections. The
declarative model is authoritative for *what the journey owes*; it is advisory for *what the
page shows*. The docs are honest that this is the design — "anything that needs real
branching belongs in a page controller. That is the pressure valve"
(`docs/obligation-model.md:139-143`) — but the pressure valve is being used for
straightforward conditional rendering, which is the thing a config engine exists to do.

Where the engine *can* answer (a root obligation, an existing instance), controllers do use
it properly: `scope.has('containsUnweanedAnimals')` at
`features/additional-details/controller.js:61,67` drives both render and validation-field
selection. So the bypass is not laziness — it maps exactly onto the boundary of what
`scope.has(id)` can express.

---

## 6. Write-side semantics (where evaluation is applied)

`engine/write.js` is the only side-effecting surface, and it applies evaluation
**asymmetrically**:

| Op | Reconciles + wipes? | Line |
|---|---|---|
| `commit` | **yes** | `write.js:14-15` |
| `removeEntryAt` | **yes** | `write.js:57-58` |
| `reconcileEntriesAt` | **yes** | `write.js:74-75` |
| `appendEntryAt` | **no** (justified: an append can only *add* scope) | `write.js:20-28`, `docs/scope-and-wipe.md:115-119` |
| `updateEntryAt` | **NO — and not justified** | `write.js:30-46` |

`updateEntryAt` replaces a whole collection entry and never reconciles. An update *can*
remove scope (change an entry's gating field and its dependants strand). It is live —
`consignment-details.controller.js:178` calls it in a loop — and it is safe today only
because that page never edits `commoditySelection` (the gating field); removal goes through
`reconcileEntriesAt` (`:195`) which does reconcile. `docs/limits.md:54-56` claims "no feature
controller calls the update path", which is **stale** (a third doc/code disagreement).

Two further semantic holes, both currently masked by convention rather than enforcement:

- **Scope is not enforced on write.** `commit` blindly merges the patch
  (`write.js:13`: `const answers = { ...journey.answers, ...patch }`) and then wipes. The
  *only* correction is `wipeOnExit`. An out-of-scope obligation **without** `wipeOnExit`
  written by a page persists forever and will be picked up by the notification mapper.
- **A stale gater keeps its dependants in scope**, because predicates read raw answers and
  ignore whether the *referenced* answer is itself in scope. Masked because all 15
  conditional obligations carry `wipeOnExit` and no gating obligation is itself conditional
  (§1.3). **Nothing enforces either invariant** — I grepped: no boot assertion, no test,
  ties `activatedBy` to `wipeOnExit`.
- **Wipe cascades are single-pass.** `commit` runs one `reconcile`, then `destroyWiped`
  (`write.js:14-15`). If destroying A's answer would take B out of scope, B is not
  re-derived in that call; it is caught on the *next* reconcile. Harmless today (no chains
  exist), latent the moment one is authored.

---

## 7. Status evaluation

`engine/status.js:59-79` — a five-value roll-up (`NA`/`OPTIONAL`/`NOT_STARTED`/
`IN_PROGRESS`/`FULFILLED`) over "status parts". A part is an obligation id **or** a
**collection facet** `{collection, only|except}` (`status.js:11-21`) — which is what lets
*one* stored collection (`commodityLines`) drive *two* hub task rows without moving data
(`flow/task-rows.js:29,36`). That is a genuinely nice piece of derivation: the facet filter
is threaded all the way down into `collectionComplete`'s `includesMember` parameter
(`status.js:52-56` → `complete.js:12-21`), so a facet's completeness only counts the members
it names, and `requiredOneOf` only fires when the facet actually owns a group member
(`complete.js:13-17`).

Its own hard edge: `statusOf` filters parts by `inScope.has(partKey(part))`
(`status.js:60`), and `partKey` for a plain part is the bare id — a **root-only** lookup
again. Task-row and section parts come from page `collects`, which only ever name roots
(`kit.collectsFrom`, `shared/kit.js:27-30`, maps a feature's root obligation array). So the
whole status/gate layer is root-keyed, and the path-keyed richness of `inScope` is used only
by `wiped` and by direct `inScope.has('commodityLines[0]…')` lookups in tests. **In-scope
reachability for two of the 18 dispatch pages is trivially true** because their `collects`
is literally `[]` (`consignment-details.controller.js:14`,
`animal-identification.controller.js:20`) and `inScopeReachable` returns `true` for an empty
list (`flow/gates.js:18-20`).

---

## 8. Test coverage of the evaluator

| File | Cases |
|---|---|
| `engine/evaluate/cross-frame.test.js` | 18 |
| `engine/evaluate/enclosing-complete.test.js` | 9 |
| `engine/status.test.js` | 6 |
| `engine/evaluate/reconcile.test.js` | 4 |
| `engine/read.test.js` | 3 |
| **Total, evaluator-specific** | **40** |

Plus `analysis/reachability.js` (215 LOC), a **dead-end prover** run as a test on every run:
it enumerates scope states, scaffolds witness journeys (seeding `anyItem` and `enclosing`
gates on the nearest ancestor frame that holds the reference), and asserts every obligation
instance is reachable and no root is orphaned. That is a real, unusual asset — it is a
property over the *model*, not the code, and it re-proves itself whenever the model changes.

The cross-frame tests are excellent and honest — they use **synthetic** forests injected via
`reconcile`'s test-only `forest` seam (`reconcile.js:6`), so they pin engine semantics
independent of the live domain, including the negative cases (unresolvable `enclosing`
reference → not activated, `cross-frame.test.js:321-347`) and the backwards-compat default
branch (`:157-178`).

---

## 9. Honest scorecard

**What A's evaluator genuinely does well** (and what B would have to match):

1. **Cycle-freedom by construction**, not by cycle detection. Predicates read answers, not
   scope. No SCC pass, no visited-set, no depth limit — the class of bug does not exist.
2. **Instance-level scope with per-instance wipe at depth 2**, resolved by *object identity*
   on frame chains, with no ids/strings/UUIDs in the relationship. `commodityLines[1].animalIdentifiers[0].permanentAddress`
   leaves scope and is destroyed at exactly that path, with zero leak to `commodityLines[0]`
   (`cross-frame.test.js:64-94`).
3. **`notInUnionOf` — complement-by-reference.** The negative gate names the *positive gate
   obligations* and the engine derives their union at evaluation time
   (`predicate.js:4-10,20-24`). The complement provably cannot drift from the gates it
   negates. I have not seen this in a config engine before; it is a genuinely good idea and
   it is 7 lines.
4. **Wipe is unforgeable.** There is no `setScope`, no `delete(key)`, no per-key persistence
   op anywhere in the stack. A page *physically cannot* hand-roll a wipe.
5. **Derived-not-declared prerequisites.** `enforcedAt: 'continue'` + flow order + the
   dispatch index derive the entire prerequisite graph (`flow/prerequisites.js`, 31 LOC).
   There is exactly **one** authored gate in the whole flow.

**What it cannot do** — see the structured limitations. The two that matter most:
the evaluator **cannot be asked about a not-yet-created instance** (so conditional rendering
of a new collection entry is necessarily imperative), and the **scope surface is root-keyed
(`scope.has(id)`) while the scope set is path-keyed** — so nothing outside the engine can
query per-instance scope through a supported API.

**Retrofit cost of taking A's evaluator into a third option:** the pure evaluator is
**258 LOC with a single external dependency (`registry.walk`)** and no framework coupling —
`evaluate/` imports nothing from `flow/`, `features/`, `services/` or Hapi. It is genuinely
liftable. What is *not* liftable cheaply is the **page-owned spine** it presumes: the engine
has no notion of a field type, widget, label or validator, so anything that consumes it must
bring its own presentation layer. Lifting `predicate.js` + `reconcile.js` (117 LOC) into a
richer model is a weekend. Lifting the *paradigm* is a rewrite of the presentation half.
