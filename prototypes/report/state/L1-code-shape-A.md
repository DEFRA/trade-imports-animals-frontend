# L1 — Code shape, complexity and coupling — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

---

## 0. The headline shape

The single most important number in this dimension:

| Layer | LOC | % of source |
|---|---|---|
| **Declarative model** (12 × `features/*/obligations.js`, 44 obligations) | **314** | 3.8% |
| **Pure evaluator** (`engine/evaluate/*`: predicate 69, complete 93, reconcile 48, cardinality 31, collection-view 17) | **258** | 3.1% |
| Registry + status (`registry.js` 81, `engine/status.js` 79) | 160 | 1.9% |
| Rest of engine (journey 104, write 95, read 44, session 51, records 48, index 14, store 12) | 368 | 4.4% |
| **Flow** (10 files) | 460 | 5.5% |
| **Hand-written controllers** (24 files) | **3,630** | 43.6% |
| Nunjucks templates (32 files) | 1,499 | (not JS) |
| Services / stubs / mappers / lib / analysis | ~3,133 | 37.6% |
| **TOTAL SOURCE JS** | **8,323** | 100% |
| Test JS (64 files, 526 cases) | 10,320 | ratio 1.24:1 |
| Docs (22 `.md`) | 4,288 | |

**The model plus its interpreter is 572 LOC — 6.9% of the source. The hand-written per-page imperative code is 3,630 LOC — 43.6%.** That ratio *is* the paradigm, and side A's docs say so honestly (`docs/obligation-model.md:139-143`: "anything that needs real branching belongs in a page controller. That is the pressure valve").

The engine is genuinely small and genuinely readable. It is also genuinely **not where the behaviour lives**.

---

## 1. Coupling: what the engine imports

### 1.1 The engine is `(request, h)`-shaped — hapi is threaded through the model's whole stateful surface

`engine/index.js` (14 LOC) exports 10 functions. **7 of them take `(request, h)` as their first two arguments** — hapi's request object and response toolkit:

```js
// engine/write.js:11
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
```

`get`, `commit`, `appendEntry(At)`, `updateEntry(At)`, `removeEntry(At)`, `reconcileEntriesAt`, `submitJourney` — all `(request, h)`. Only `makeScope`, `collectionView`, `collectionCapAt` are plain functions over `answers`.

The consequence is precise: **you cannot read or write journey state without a hapi request.** `engine/journey.js:37` stashes a memo on `request.app[JOURNEY_MEMO]`; `engine/journey.js:46` calls `session.setActiveJourney(h, …)` which writes a cookie through the response toolkit. The store is not a store you call — it is a request-scoped read-through cache keyed on a hapi object.

Tests pay for this: `engine/test-support.js` (68 LOC) exists solely to fabricate `journeyRequest()` / `recordingH()` fakes, and **20 test files import it or `engine/store.js`** to get around the request-shaped API.

### 1.2 …but the *evaluator* is pure, and that is A's best asset

The five files in `engine/evaluate/` (258 LOC) import **zero** hapi, zero flow, zero services. Their entire import surface is `registry`, `lib/path.js`, `lib/answered.js`. They are pure functions of `(answers)`.

Two production entry points prove it runs headless with no server:
- `dump.js` (89 LOC, `npm run dump:live-animals`) — prints derived scope, wipe set, section statuses from a JSON fixture.
- `analysis/reachability.js` (215 LOC) — enumerates scope states and proves every obligation is reachable, run as a test.

**So: model evaluation is a pure library; model *persistence* is welded to hapi.** The seam is clean and it is in the right place. Lifting `engine/evaluate/` into a third option is cheap.

### 1.3 Layering violation: the engine knows the web mount path

```js
// engine/journey.js:1
import { BASE } from '../config.js'
```

`BASE` is the HTTP mount path (`config.js`), used at `journey.js:13` to set `path: BASE` on the cookie. The engine imports the web shell's identity. Small, but it is a real inversion — the engine is one `import` away from being web-free at the cookie layer.

### 1.4 Five pieces of module-level mutable global state

| Global | File:line | Set by |
|---|---|---|
| `registry.all` (frozen at import) | `registry.js:15` | module load |
| `pageOfObligationMap`, `collectsByPageMap`, `slugByPageMap`, `dispatchBuilt` | `flow/dispatch.js:3-6` (`let`) | `buildDispatch()` at boot |
| `records` impl | `engine/persistence/records.js:8` (`let impl`) | `configureRecords()` at boot |
| `session` impl | `engine/persistence/session.js:11` (`let impl`) | `configureSession()` at boot |
| `readyForCheckYourAnswersFn` | `engine/read.js:7` (`let`) | `configureReadyForCheckYourAnswers()` at boot |

Boot order is load-bearing. To A's credit **every one of these fails loud** rather than silently: the unconfigured defaults throw (`read.js:8`, `records.js:5`, `session.js:8`), and `gates.js:5-12` has an explicit guard because an unbuilt index is indistinguishable from "collects nothing" and would silently gate every page out. That is good engineering around a design that shouldn't have needed it.

But the cost is structural: **there is no `createEngine(model)`.** `registry` is a module singleton imported directly by `engine/status.js:1`, `evaluate/complete.js:1`, `evaluate/cardinality.js:3`, `evaluate/collection-view.js:2`, plus `walk`/`walkObligations` in `read.js:3`, `reconcile.js:1`, `dispatch.js:1`, `prerequisites.js:1`, `entry-guard.js:4` — **9 production import sites**. You cannot instantiate the engine against a second model in one process. `reconcile()` has a test-only `forest` escape hatch (`reconcile.js:6`), but `satisfied`, `statusOf`, `collectionCapAt` and `collectionView` reach into the global with no seam.

---

## 2. Purity of the obligation model — the doc claims more than the code delivers

### 2.1 The model is NOT inert data. It calls a service at module load.

`docs/obligation-model.md:4` says features declare obligations "in a pure" model file. The purity guard itself tells a different story:

```js
// obligation-purity.js:13-14
export const isReferenceServiceImport = (specifier) =>
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)
```

The guard **explicitly whitelists reference-data service imports**, and the model uses that licence at load time:

```js
// features/commodities/obligations.js:1, 33
import * as commodities from '../../services/commodities/index.js'
...
activatedBy: enclosingCommodity(commodities.passportCommodities()),
```

`passportCommodities()` is *invoked* while the module is being evaluated. The `includes` lists inside `activatedBy` are the return value of a function call at import time. Same at `obligations.js:39, 45, 51, 83`, `cph-number/obligations.js:10`, `additional-details/obligations.js:12`.

Today `services/commodities/index.js` re-exports frozen constants from `stub.js` (no network, no `mode.js` switch — note the inventory over-claims here: commodities does **not** go through `services/mode.js`). So it is safe *today*. But the model's shape now permits a reference-data call in the import graph of the obligation tree, and the guard sanctions it.

### 2.2 The model is identity-based, therefore **not serialisable**. This is structural.

Predicate resolution is done by **JS object reference equality**:

```js
// engine/evaluate/predicate.js:41
if (siblings.includes(referencedObligation)) {
```

`Array.prototype.includes` on objects is SameValueZero — reference identity. Same at `predicate.js:52` (`candidate.item?.includes(referencedObligation)`), `predicate.js:65`, and `complete.js:26`. `activatedBy.obligation` holds a **live pointer** to another obligation object; `notInUnionOf` holds an **array of live pointers** (`commodities/obligations.js:55-60, 70`).

Consequences that no amount of build-loop effort can remove:

- **`JSON.stringify(registry.all)` → `JSON.parse` produces a model that silently mis-evaluates.** The parsed copy has structurally-equal but referentially-distinct objects, so every `siblings.includes(ref)` returns `false` and every conditional obligation falls out of scope. The model round-trips through JSON only as a *lossy* artefact.
- The model **cannot be shipped to a client**, cached as JSON, content-hashed, diffed as data, or authored by a non-programmer in a data file.
- The spec (`spec/journey-spec.json`, 2,014 lines) is therefore **upstream documentation, not the runtime model**. There is no loader. Nothing reads it at boot. The JS is hand-written to match it.

This is the sharpest asymmetric limitation on side A and it is **structural**: it is a direct consequence of choosing pointers over ids. (Converting to id-based lookup is a bounded rewrite — see §6 — but it is a rewrite, not a feature.)

`docs/obligation-model.md:91-95` defends the choice ("real references buy… navigable — editors jump straight from the reference to the definition"). That benefit is real. The cost is not stated anywhere in the docs.

---

## 3. The biggest layering leak: **conditionality is expressed twice**

This is the finding that most undermines the "declarative model" claim.

`cph-number/obligations.js:4-13` declares, declaratively:

```js
export const countyParishHoldingCph = {
  id: 'countyParishHoldingCph',
  required: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'anyItem',
    includes: commodities.cphCommodities()
  },
  wipeOnExit: true
}
```

The engine already evaluates this — `scope.has('countyParishHoldingCph')`. And yet, 30 lines away, the controller **re-implements the same rule by hand**:

```js
// features/cph-number/controller.js:12-17
export const cphApplies = (answers) =>
  [].concat(answers.commodityLines ?? [])
    .some((line) =>
      commodities.cphCommodities().includes(line?.commoditySelection)
    )
```

That is `frame: 'anyItem'` + `includes`, hand-rolled. And it is **exported so other features can import it**.

The full census of imperative restatements of declarative model rules:

| Imperative restatement | file:line | Restates the declarative | Imported by |
|---|---|---|---|
| `cphApplies` | `cph-number/controller.js:12` | `countyParishHoldingCph.activatedBy` (`cph-number/obligations.js:7-11`) | `check-answers/controller.js:19`, `addresses/controller.js:4` |
| `unweanedApplies` | `additional-details/controller.js:13` | `containsUnweanedAnimals.activatedBy` (`additional-details/obligations.js:9-13`) | `check-answers/controller.js:17` |
| `packagesApply` | `consignment-details.controller.js:17` | `numberOfPackages.activatedBy` (`commodities/obligations.js:13-16`) | `check-answers/controller.js:10` |
| `typeApplies` | `animal-identification.controller.js:42` | reaches into `obligation.activatedBy.includes` directly | — |
| `fallbackApplies` | `animal-identification.controller.js:67` | reaches into `obligation.activatedBy.notInUnionOf` directly | — |
| `permanentAddressApplies` | `animal-identification.controller.js:131` | `permanentAddress.activatedBy.includes` directly | — |

**11 call sites. Zero tests pin any of them against the engine's scope.** `grep -rn "cphApplies\|unweanedApplies\|packagesApply"` across the whole prototypes tree returns only production call sites — no test asserts `cphApplies(answers) === scope.has('countyParishHoldingCph')`.

Two live copies of every conditional rule, no equivalence test. Change `cphCommodities()` and the two copies stay in sync only by luck (they both call the same service — which is why it works today). Change the *frame* or the *operator* in the model and the controller silently keeps the old semantics.

`animal-identification.controller.js:3` also **bypasses the 10-export facade entirely** to reach an engine internal:

```js
import { includesUnion } from '../../engine/evaluate/predicate.js'
```

### 3.1 Why this happens (it is not laziness)

The engine's scope is **instance-keyed** — `scope.has(id)` answers "is this obligation in scope *somewhere*". The render layer needs "which fields apply for *this* commodity, *before* the entry exists". The engine has no API for that. So each controller hand-rolls it. **The model can decide what is owed; it cannot tell a page what to draw.** That is the structural gap the imperative restatements fill.

### 3.2 `check-answers/controller.js` is where the vertical-slice story collapses

495 LOC, 22 imports, including **four imports of other features' controllers** (`controller.js:10, 15, 17, 19`). Every row is hand-composed (`row()` at :47, `partyRow()` at :81, `importDetailsCard()` at :98…), every conditional row is spread-gated on an imported hand-written predicate (`:136`, `:253`, `:376`). It even hand-rolls HTML escaping (`:38-45`).

The docs are honest about this — "there is no free CYA row" — but the coupling cost is worth stating plainly: **CYA must import, and stay in sync with, every other feature's conditionality.** It is the one file that knows everything.

---

## 4. Cyclomatic hotspots

Branch-token density (`if`/`else`/`?.`/`&&`/`||`/`case`/`=>`), highest first:

| File | LOC | Branch tokens | Note |
|---|---|---|---|
| `services/persistence/records/notification-mapper.js` | 507 | **97** | Two mappers (A skeleton-exact, B lossless). Densest file in the repo. Not model code. |
| `features/commodities/animal-identification.controller.js` | **566** | 51 | Largest file. Per-record typed/fallback field gating, counter-driven form, cap state. |
| `features/check-answers/controller.js` | 495 | 44 | See §3.2. |
| `features/documents/controller.js` | 358 | 43 | Collection loop + cdp-uploader initiate/redirect/poll/attach. |
| **`engine/evaluate/complete.js`** | **93** | **24** | **The engine's own hotspot — highest density in the model layer.** |
| `engine/evaluate/predicate.js` | 69 | 14 | The activation interpreter. Clean. |
| `features/hub/controller.js` | 208 | 15 | Presentation mapping. |

### The engine's worst function: `entryComplete` (`complete.js:5-56`, 51 LOC)

Four parameters (two optional: `ctx`, `includesMember`), mutual recursion with `collectionComplete`, and — critically — it **re-implements a subset of `evalPredicate`'s frame resolution inline**:

```js
// complete.js:26-41
if (siblings.includes(referencedObligation)) {
  if (!applyPredicate(subObligation.activatedBy, entry?.[referencedObligation.id])) {
    return true
  }
} else if (ctx && subObligation.activatedBy.frame) {
  if (!evalPredicate(subObligation.activatedBy, ctx.answers, ctx.frames)) {
    return true
  }
}
```

Compare `predicate.js:64-68`, which does the same sibling-identity test and the same `applyPredicate` call. The docs call the property that these two agree the **"resolver-unity invariant"** — but it is maintained **by duplication, not by sharing**. Two code paths implement one rule. `DESIGN-DELTA #5` exists precisely because the two drifted at depth 2 and had to be re-threaded.

Note also the `groupOwned`/`groupSatisfied` logic (`complete.js:11-22`) — three interacting boolean derivations to express "at least one of this sibling group is answered, but only if the facet filter owns a member of the group". That is the most conceptually dense 12 lines on side A.

### A third interpreter of `activatedBy`

`analysis/reachability.js:36-45` has `gateValue(activatedBy)` — a **fourth-operator-aware switch that is not `applyPredicate`**:

```js
const gateValue = (activatedBy) => {
  if ('equals' in activatedBy) return activatedBy.equals
  if ('includes' in activatedBy) return [].concat(activatedBy.includes)[0]
  if ('notInUnionOf' in activatedBy) { ... }
  if ('present' in activatedBy) return activatedBy.present ? 'x' : ''
```

**Adding a 5th activation operator means editing 3 places**: `predicate.js:12-28` (`applyPredicate`, which throws on unknown — good), `reachability.js:36-45` (which silently returns `undefined` — bad), and any controller reading `activatedBy` directly. Only the first fails loud.

---

## 5. Dead code

| Dead thing | Evidence | Cost |
|---|---|---|
| **`system` flag** | **0 carriers.** `grep "system:"` over `features/` returns nothing. 5 read sites guard a condition that is always false: `dispatch.js:58`, `entry-guard.js:34`, `kit.js:29`, `reachability.js:163`, `contract.test.js:51`. | `system` is *the escape hatch* for the boot coverage assert — the one safety valve that lets an obligation be uncollected. It has never been exercised. |
| **`renderOnly` flag** | **0 carriers.** 1 read site (`contract.test.js:51`). | Same. |
| **`updateEntry`** (`write.js:83-84`) | Exported through the public facade (`engine/index.js:6`). **Zero callers** anywhere — features use `updateEntryAt` (`consignment-details.controller.js:178`). | Dead export on a 10-export API. |
| **`engine/store.js`** (12 LOC) | **20 importers — every one is a `*.test.js` or `test-support.js`.** Zero production imports. | A test seam shipped inside the engine directory, masquerading as engine API. |

That is 2 of the 11 model vocabulary keys (18%) with no carrier, and 1 of the 10 facade exports (10%) with no caller.

---

## 6. Doc-vs-code disagreements (the docs are stale by ~2 milestones)

The brief says to read `docs/limits.md` "before crediting A with anything". **`limits.md` is materially wrong in four places — and it is wrong in *both* directions.**

| `limits.md` claim | Reality | Verdict |
|---|---|---|
| `:56` — "no feature controller calls the update path — in the browser, collections change through add and remove only" | `consignment-details.controller.js:178` calls `state.updateEntryAt(request, h, ['commodityLines'], index, {…})` | **FALSE — understates A** |
| `:20-31` — "Depth-2 nesting … has no live carrier. The surviving `commodityLines` is depth-1." | `animalIdentifiers` (`commodities/obligations.js:96`) is a collection nested inside `commodityLines.item` (`:121`). **Live depth-2 carrier.** | **FALSE — understates A** |
| `:16` — "`complete.js#entryComplete` does not yet resolve enclosing gates (a required enclosing-gated field would be treated as owed even off-gate)" | `complete.js:35-41` resolves them: `else if (ctx && subObligation.activatedBy.frame) { if (!evalPredicate(...)) return true }` | **FALSE — understates A** |
| `:74` — "'Add a field' … honestly means **three** edits" | `docs/add-a-field.md:16` — "Adding a field touches **five** places." | **Docs contradict each other; the code agrees with `add-a-field.md` (obligations.js, controller schema, controller commit, template, hand-composed CYA row).** |

Three of four staleness bugs *understate* A's capability — `limits.md` was written mid-build and never re-swept. Anyone using it as the honest-limits reference will under-credit A on depth-2 and enclosing-frame completeness, both of which are real and tested (`engine/evaluate/enclosing-complete.test.js`, 151 LOC; `cross-frame.test.js`, 348 LOC).

The disagreement itself is the finding: **A's docs (4,288 LOC, 22 files) are large enough to rot, and have rotted.** Doc volume is not doc reliability.

---

## 7. Which side would I rather onboard onto?

Answering only for A, on code-shape grounds:

**The good.** The engine is the best-shaped thing in the codebase. 258 LOC of pure evaluator; four operators in one 69-LOC file; a five-status roll-up in 79 LOC; a boot-time totality proof in 74 LOC (`dispatch.js:55-63`) that crashes if any obligation is collected by no page. You can read the entire model layer — data *and* interpreter — in under an hour, and `dump.js` lets you interrogate it with no server. `contract.test.js` (328 LOC) drives every real POST handler and asserts the committed obligation-id set equals the page's declared `collects` — it names the file you forgot to wire. That is a genuinely strong safety net.

**The bad.** The engine is 7% of the code. The other 93% is 3,630 LOC of hand-written controllers whose conditionality is a *second, untested copy* of the model's. Onboarding is honestly "read the page you are changing" (`limits.md:76`) — which means the declarative model is not the thing you read to know what happens. To change one conditional field you must find and update: the obligation, the controller's schema, the controller's commit, the template, the CYA row, **and** any `*Applies` restatement that other features import.

**The verdict.** A is pleasant to onboard onto *page by page* and misleading to onboard onto *model first*. The model tells you what is owed; it does not tell you what renders. If you believe the model is the source of truth, A will lie to you at exactly the points where it matters most (`cphApplies` vs `countyParishHoldingCph.activatedBy`).

---

## 8. Retrofit cost — what a third option should take, and what it costs

| Take from A | Cost | Blocker |
|---|---|---|
| **`engine/evaluate/` (258 LOC pure evaluator)** | **Low.** Already hapi-free, flow-free, service-free. | 3 of 5 files import the `registry` singleton (`complete.js:1`, `cardinality.js:3`, `collection-view.js:2`). Parameterise → ~30-line change. |
| **`flow/dispatch.js` boot coverage assert (74 LOC)** | **Low.** Highest value-per-line in the repo. Inverts page-side `collects` and crashes at boot if any non-system obligation at any depth is uncollected. | Needs the `system` escape hatch to actually be used, or drop the flag. |
| **`contract.test.js` handler↔`collects` equivalence net (328 LOC)** | **Low-medium.** Pattern transfers; the test itself is A-specific. | Requires pages to declare `collects` — i.e. requires the page-owned-spine seam. |
| `enforcedAt: 'continue'` → derived prerequisite graph (`flow/prerequisites.js`, 31 LOC) | **Low.** Elegant: 2 obligations derive the whole flow prerequisite graph, replacing a hand-authored one. | Derived gates bake in any-in-scope semantics (`gates.js:17-19`) — a section mixing conditional and unconditional obligations gets an always-true gate. `limits.md:60-64` is right about this one. |
| **Identity-based obligation references** | **Do not take.** | Structural: kills serialisation (§2.2). If the third option is data-shaped, `siblings.includes(ref)` must become an id lookup — a bounded rewrite of `predicate.js` (69 LOC) + `complete.js` (93 LOC) resolution paths, ~160 LOC, semantics preserved. |
| The page-owned spine itself | **Very high.** Cannot be retrofitted onto a generic-renderer model without discarding all 3,630 LOC of controllers and 1,499 LOC of templates. | It is an either/or with a config-driven renderer, not a mix-in. |

**The single cheapest high-value lift is `dispatch.js`'s coverage assert** (74 LOC, no dependency on A's identity model, catches a whole class of "you forgot to wire the field" bugs at boot).

**The single most important thing NOT to carry over is the duplicated conditionality** (§3). Whatever model the third option picks, it needs an API that answers *"which fields apply to this entry, given this partially-filled context"* — because A's absence of that API is precisely what forced 11 hand-written restatements of rules the model already declared.
