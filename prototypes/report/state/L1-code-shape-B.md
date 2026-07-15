# L1 — Code shape, complexity and coupling — SIDE B (`flow-layer`)

Clone: `/Users/samfarrington/git/defra/trade-imports-animals-workspace/workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Roots: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (live), `prototypes/model-spikes/obligations-v4-model/` (frozen ancestor)

All paths below are relative to `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` unless prefixed `model-spikes/`.

---

## 0. Headline

Side B's **model layer is genuinely clean, pure and injectable**. Its **browser layer is not** — and the boundary between them, which the spike's own documentation calls "the contract seam … the sole browser→model path, enforced by convention + grep + tests", **does not hold in the code**. The enforcing grep has a false negative for the exact directory that violates it, and no test enforces it at all. That is the single most important code-shape finding on this side: the three-layer separation-of-concerns argument is prosecuted rigorously in the *model* and only aspirationally in the *app*.

Second headline: the model is 51% of live source (4,039 / 7,897 LOC) and carries 4,561 LOC of tests against it. That ratio is the real asset here.

---

## 1. LOC by module (live spike only; the ancestor is dead — see §7)

### Model layer — 4,039 LOC source

| File | LOC | Layer | Role |
|---|---|---|---|
| `domain/index.js` | 1194 | 1.25 | Value-legality. 4 entry factories + 40-entry `domain` Map |
| `obligations/obligations.js` | 843 | 1 | 44-obligation manifest + 7 commodity whitelists |
| `flow/flow.js` | 667 | 2 | 6 sections / 16 subsections / 31 pages. Pure data |
| `engine/index.js` | 601 | — | 14 exported pure fns + `STATUSES` |
| `obligations/evaluator.js` | 519 | 1 | `createObligationEvaluator` — 7-step pipeline |
| `obligations/helpers.js` | 215 | 1 | 6 gate factories (4 used, 2 dead — §7) |

### Seam — 338 LOC

| File | LOC |
|---|---|
| `contract.js` | 338 |

### Browser layer — 3,159 LOC source

| File | LOC | Notes |
|---|---|---|
| `lib/presentation.js` | 433 | id-keyed message-key registry |
| `lib/field-widgets.js` | 343 | 7-rule ordered widget dispatch |
| `features/check-your-answers/controller.js` | 351 | **worst function in the codebase** (§3) |
| `features/units/controller.js` | 308 | bespoke depth-2 Add-another |
| `lib/state.js` | 232 | the entire persistence story |
| `features/commodity-lines/controller.js` | 227 | bespoke depth-1 Add-another |
| `routes.js` | 210 | Hapi plugin, route generation |
| `lib/unit-page-controller.js` | 179 | 3rd of 3 near-identical factories |
| `lib/format-domain-errors.js` | 158 | |
| `lib/line-page-controller.js` | 141 | 2nd of 3 |
| `features/hub/controller.js` | 141 | task list |
| `lib/page-controller.js` | 111 | 1st of 3 |
| `lib/build-field-descriptors.js` | 110 | |
| `lib/i18n.js` | 82 | **disk-bound at module load** (§4) |
| `lib/chrome.js` | 51 | |
| `lib/is-blank-value.js` | 39 | |
| `features/start`, `features/reset` | 26 + 17 | |

### Tooling / sketches — 361 LOC

`dump.js` 138 · `controller-sketch.js` 125 · `data-dictionary-sketch.js` 98

### Totals

| | LOC | Share of live source |
|---|---|---|
| Model (obligations + domain + flow + engine) | **4,039** | 51% |
| Contract seam | 338 | 4% |
| Browser layer (routes + lib + features) | **3,159** | 40% |
| Tooling/sketches | 361 | 5% |
| **Live source JS total** | **7,897** | 100% |
| Live test JS (incl. e2e harness) | 9,953 | ratio 1.26 : 1 |
| Live docs (.md) | 7,188 | ratio 0.91 : 1 |
| Templates (.njk), 8 files | 299 | — |

**Test LOC split — the model is where the tests are:**

| Test file | LOC | Cases | Target |
|---|---|---|---|
| `engine/index.test.js` | 1166 | 69 | engine, **synthetic** obligations |
| `obligations/evaluator.test.js` | 1159 | 72 | evaluator × real V4 |
| `routes.test.js` | 1011 | 42 | HTTP via `server.inject` |
| `domain/index.test.js` | 804 | 56 | domain |
| `obligations/evaluator.units.test.js` | 760 | — | depth-2 |
| `obligations/{helpers,whitelists,coverage}.test.js` | 244+238+190 | — | Layer 1 |
| Model tests subtotal | **4,561** | | 58% of live source-facing test LOC targets the model |

---

## 2. Coupling — what imports what

Verified by `grep -rn "from '"` across every source file. The dependency graph is:

```
obligations/helpers.js      → (nothing)
obligations/obligations.js  → helpers.js
obligations/evaluator.js    → obligations.js   [default arg only — injectable]
domain/index.js             → obligations.js
flow/flow.js                → obligations.js
engine/index.js             → lib/is-blank-value.js, domain/index.js   ← ⚠ see 2.2
contract.js                 → obligations, evaluator, flow, domain, engine,
                              lib/{build-field-descriptors, format-domain-errors,
                                   is-blank-value, i18n}               ← ⚠ see 4
lib/state.js                → contract.js
lib/*-page-controller.js    → contract.js, lib/state.js, obligations.js
features/*/controller.js    → contract.js + obligations + domain + flow + engine ← ⚠ see 2.1
routes.js                   → contract.js, obligations.js, controllers
```

**Zero `@hapi/*` imports anywhere in the spike.** Controllers duck-type `request` / `h`. `lib/state.js` touches `request.yar` optionally (`request.yar?.get(...)`, state.js:27). The model layer has *no* framework dependency of any kind. That is real and it is good.

### 2.1 The contract seam is claimed, documented — and leaks (DOC vs CODE)

The claim, verbatim from `contract.js:1-11`:

> "Contract — the seam between the logical model … and the browser layer (controllers + templates). **Controllers and templates only call functions on this module.**"

`RECOMMENDATION.md:347` and `obligations.md:1888` and `NEXT.md:121` all cite the same enforcement mechanism:

```
grep -rn "from '../engine\|from '../domain\|from '../flow" features/ lib/ | grep -v contract
```

**That grep is broken.** Files under `features/<name>/controller.js` are *two* directories deep, so they import via `from '../../domain/index.js'` — which does not contain the literal substring `from '../domain`. I ran the documented grep verbatim: it returns **2 hits, both in `lib/`, and zero in `features/`**. Meanwhile `grep -rn "from '../../{engine,domain,flow,obligations}"` over `features/` returns **9 real violations**:

| File:line | Bypasses seam to import |
|---|---|
| `features/check-your-answers/controller.js:26` | `obligations/obligations.js` |
| `features/check-your-answers/controller.js:27` | `domain/index.js` |
| `features/commodity-lines/controller.js:20` | `obligations/obligations.js` |
| `features/commodity-lines/controller.js:21` | `flow/flow.js` |
| `features/commodity-lines/controller.js:22` | `domain/index.js` |
| `features/units/controller.js:21` | `obligations/obligations.js` |
| `features/units/controller.js:22` | `flow/flow.js` |
| `features/units/controller.js:23` | `domain/index.js` |
| `features/hub/controller.js:15-16` | `engine/index.js`, `obligations/obligations.js` |

Plus `routes.js:15` (`obligations.js`) and all three page-controller factories (`lib/{page,line-page,unit-page}-controller.js` each import `obligations.js` directly).

And there is **no test** enforcing the seam — I grepped `contract.test.js` and `integration.test.js` for any import-boundary assertion and found none.

**Verdict: PARTIAL, not the claimed absolute.** 4 of 4 non-trivial feature controllers reach around `contract.js` into all three model layers. The seam is a convention with a broken enforcement mechanism, not an architecture. **This is cheap to fix** (widen the grep to `from '\.\./\.\.?/(engine|domain|flow)` and add it as a test) — but it must be fixed *before* anyone claims the seam as a reason to prefer B, because the seam as shipped is not load-bearing.

### 2.2 The engine hard-imports the concrete domain — and it defeats its own injection

`engine/index.js:27`:

```js
import { domain } from '../domain/index.js'
```

But `optionsFor` and `validate` **take `domain` as a parameter**, which *shadows the import*:

```js
export function optionsFor(obligation, fulfilments, ids, domain, ctx = {}) {   // :41
export function validate(obligation, value, fulfilments, domain, ctx = {}) {   // :61
```

So the module-level import is used by exactly one function — `isValueFulfilled` (`engine/index.js:318-324`):

```js
function isValueFulfilled(oblId, value) {
  const entry = domain.get(oblId)                       // ← the SINGLETON, not the param
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}
```

`isValueFulfilled` is called by `hasFulfilment` → `classifyEntries` → `pageStatus` / `containerStatus` / `journeyState`. **Every status primitive is therefore hard-wired to the concrete V4 domain map and cannot be given a different one.**

`docs/testing.md` and `RECOMMENDATION.md` (D3) claim the engine primitives are independently testable on synthetic fixtures "with no V4 coupling". `engine/index.test.js:34` does build a local synthetic `domain` Map and pass it as the 4th arg — which works only for `optionsFor`/`validate`. The 69 status/navigation tests in that file pass **by accident of id non-collision**: their synthetic obligation ids aren't in the real V4 domain, so `domain.get(oblId)` returns `undefined` and the address branch never fires. Address-completeness semantics in status derivation are, as shipped, **untestable in isolation and un-injectable**.

Severity: moderate, **not structural**. Fix = thread `domain` into `pageStatus`/`containerStatus` (or hide it behind an injected `isValueFulfilled` callback). ~20 LOC. But it means the "pure library, no coupling" story needs a caveat, and anyone lifting `engine/` into a third option must do this first or they inherit a hidden singleton.

### 2.3 The model was modified to serve the browser layer — with a comment saying so

`obligations/helpers.js` differs from its frozen ancestor `model-spikes/obligations-v4-model/helpers.js` by exactly **6 lines** (verified: `diff` output is 6 lines, `:83-88`). Five are comment; one is code (`predicate,`). The comment:

```js
// Expose the predicate so callers can ask "would this value be
// admitted?" without executing the whole applyTo closure (which
// requires evaluator state). Used by browser-side helpers like
// features/units/pickSeedObligationForLine to decide whether a
// fresh line's commodity code opens this obligation.
predicate,
```

A **Layer-1 file naming a Layer-3 consumer in its own source**. The single code change the fork made to the model, relative to its ancestor, was made *for* the web layer. That is a small but very clean piece of evidence about which direction the pressure actually flows.

### 2.4 Can the model be used without the web layer?

**Yes — verified, with a Node caveat.** `dump.js` (138 LOC) is a working headless CLI: `node dump.js <fixture>` prints the whole logical state as JSON, and `dump.test.js` snapshot-pins it. It imports `contract.js` and nothing web-shaped.

The caveat: `contract.js:40` imports `t` from `lib/i18n.js`, which does `readFileSync` at module scope (`i18n.js:24-27`):

```js
const dirname = path.dirname(fileURLToPath(import.meta.url))
const en = JSON.parse(readFileSync(path.join(dirname, '..', 'locales', 'en.json'), 'utf-8'))
```

So `contract.js` is **Node-only and disk-bound** — it cannot be loaded in a browser, an edge runtime, or any context without the locales file on disk. And `contract.validatePagePayload` returns **already-translated English strings** (`contract.js:280`: `message: key ? t(key) : t('errors.defaultRequired')`), not message keys. The seam therefore emits presentation, not model output. That kills isomorphic client-side validation, and it is the reason there is no client JS.

Structural? **No.** Return the key, resolve in the controller. ~10 LOC. But it is a design mistake sitting *in the seam*, which is exactly where you least want one.

---

## 3. Complexity hotspots

**The model is low-complexity. The browser layer is where the branches live.**

Branch-token density (`if (` / `? ` / `&&` / `||` / `for (` / `.filter(` / `.some(` occurrences):

| File | Branch tokens | LOC | Density |
|---|---|---|---|
| `engine/index.js` | 96 | 601 | 0.16 |
| `obligations/evaluator.js` | 62 | 519 | 0.12 |
| `lib/field-widgets.js` | 61 | 343 | 0.18 |
| `features/check-your-answers/controller.js` | 44 | 351 | 0.13 |
| `contract.js` | 43 | 338 | 0.13 |
| `domain/index.js` | 36 | 1194 | 0.03 |
| `flow/flow.js` | **9** | 667 | **0.01** ← pure data, as advertised |
| `obligations/obligations.js` | **6** | 843 | **0.01** ← pure data + closures |

`flow.js` and `obligations.js` really are data. That is a genuine, verified property and it is the thing worth stealing.

### The worst functions, in order

1. **`cyaController.get.handler`** — `features/check-your-answers/controller.js:201-350`, **~150 lines, one function, nesting depth 4** (`for` obligations → `if (Array.isArray(impl.records))` → `for` records → `if (isBlankValue)` → `if (mandatory && address && !isComplete)`). It has **no unit test** (there is no `features/check-your-answers/controller.test.js`); it is only exercised through `e2e-walk.test.js` end-to-end. Inside it: a hardcoded page name that bypasses the model's own change-link machinery —

   ```js
   href: `${BASE}/lines/${lineId}/units/${unitId}/permanent-address`,   // :175
   ```

   with the comment "Only used for permanentAddress today". And a hardcoded depth branch: `const isUnitScoped = obligation.within?.id === unitRecord.id` (`:227`).

2. **`register()`** — `routes.js:56-208`, ~150 lines. Flat and repetitive rather than deeply nested, but it contains the **identity branch that hard-codes depth**: `if (page.presentsForEach.forEachOf === unitRecord)` (`routes.js:154`). A depth-3 group needs another `else if` here.

3. **The `address` widget rule** — `lib/field-widgets.js:181-268`, an 88-line `build()` inside the dispatch array, with a nested `.map()` over sub-fields containing a further 3-way branch.

4. **`addressBlock`'s predicate** — `domain/index.js:217-268`, 52 lines, a `for` over sub-fields with three independent rule checks each pushing distinct error codes.

5. **`classifyEntries`** — `engine/index.js:386-410`, 25 lines. The most semantically dense function in the model (the whole 5-way status alphabet lives here) but structurally trivial: 5 branches, no nesting. This is what a well-factored core looks like.

**No function in `engine/`, `evaluator.js`, `domain/` factories, `flow.js` or `contract.js` exceeds ~50 lines.** The model is not where the complexity is.

---

## 4. Layering violations — enumerated

| # | Violation | Evidence | Structural? |
|---|---|---|---|
| L1 | 9 direct model imports from `features/`, bypassing `contract.js` | §2.1 table | No — grep + test |
| L2 | `engine/` imports the concrete `domain` singleton, defeating its own `domain` parameter | `engine/index.js:27` + `:318-324` | No — ~20 LOC |
| L3 | `contract.js` (the model seam) imports `lib/i18n.js` and returns **translated strings**, making the seam Node-only, disk-bound and non-isomorphic | `contract.js:40`, `:280`; `i18n.js:24-27` | No — return keys |
| L4 | Layer 1 (`helpers.js`) modified for, and documenting, a Layer 3 consumer | `helpers.js:83-88` | No |
| L5 | Task list bypasses the status engine for 3 of 16 subsections | `features/hub/controller.js:80-90` hardcodes `'commodity-lines-manage'`, `'commodity-lines-details'`, `'per-unit-records'` as string literals; `:98-105` swaps `statusOfContainer` for a bespoke `linesManageStatus(state)` (`:60-69`) | No, but it is an admission the model can't express "has the user added ≥1 line yet" |
| L6 | Widget dispatch keyed on `obligation.name`, not `id` | `lib/field-widgets.js:56-62` `OBLIGATION_MULTI = new Set(['transitedCountries','species','animalsCertifiedFor'])`, consulted at `:83`, `:116`, `:151` | No, but see below |
| L7 | `entryInScope` duplicated verbatim | `engine/index.js:303-309` and `lib/build-field-descriptors.js:20-26` | No |

**On L6 specifically:** `obligations.md` is emphatic that `id` is identity and `name` is renameable. The **only** place that promise is broken is `field-widgets.js`. Rename `species` → the widget silently degrades from a checkbox group to a select (>5 options) and the stored array shape stops matching. `coverage.test.js`'s `KNOWN_UNWIRED` is also name-keyed, but that's a test and it self-guards (`coverage.test.js:99-105` asserts every `KNOWN_UNWIRED` name corresponds to a real obligation). The production one does not.

---

## 5. Duplication

**Three parallel page-controller factories.** `lib/page-controller.js` (111), `lib/line-page-controller.js` (141), `lib/unit-page-controller.js` (179) = **431 LOC**. They are the same GET/POST shape at three identity depths.

`diff -y --suppress-common-lines line-page-controller.js unit-page-controller.js` → **81 differing lines**; roughly 98 of the unit controller's 179 lines are byte-identical to the line controller's. The deltas are entirely (a) `lineId` vs `${lineId}/${unitId}` composite-key threading, (b) an extra `unitExists` guard, (c) `nextAfterForLine` vs `nextAfterForUnit`.

The same triplication runs through the whole stack:

| Concern | Depth 0 | Depth 1 | Depth 2 | Depth 3 would need |
|---|---|---|---|---|
| Page controller | `page-controller.js` | `line-page-controller.js` | `unit-page-controller.js` | a 4th factory |
| Next-page nav | `contract.nextAfter` :115 | `nextAfterForLine` :135 | `nextAfterForUnit` :152 | a 4th `nextAfterFor*` |
| Engine walk | `firstUnfulfilledPage` :128 | `firstUnfulfilledPageForLine` :149 | `firstUnfulfilledPageForUnit` :182 | a 4th engine primitive |
| Route shape | `/pages/{p}` | `/lines/{id}/{p}` | `/lines/{id}/units/{uid}/{p}` | another `routes.js:154` identity branch |
| Add-another UX | — | `features/commodity-lines/` (227) | `features/units/` (308) | a 3rd bespoke feature dir |

**This is the sharpest structural finding on Side B.** The *model* is depth-generic — `within` chains to arbitrary depth, `PATH_DELIMITER`-joined composite keys of arbitrary length (`evaluator.js:40-42`, `enumerateGroupFulfilmentIds` slices `prefixLen = ancestors.length + 1` at `:406-417`, entirely depth-agnostic). The **browser layer is depth-hardcoded at 5 places per level**. Adding depth-3 costs roughly 300–400 LOC of new-but-not-novel code plus a new bespoke Add-another feature directory.

One depth assumption **does** reach into the model: `helpers.js:212-215`

```js
function pathPrefix(path) {
  const slash = path.indexOf('/')
  return slash === -1 ? path : path.slice(0, slash)
}
```

`filterAndProject` uses this to match a gate's passing keys against a projection group's instance paths (`:206-208`). It takes the **first** segment only — so a gate can only ever project from a depth-1 ancestor. A depth-3 obligation gated by a depth-2 ancestor's value would silently fail to match. **This one is structural-ish**: it is a 3-line fix (compare `segments.slice(0, gateDepth)`) but nobody has thought about what the gate's identity level *is*, and `model-spikes/GAPS.md` "Gap 1 (identity-space mismatch)" is precisely this problem, acknowledged and unsolved.

---

## 6. Purity

| Module | Pure? | Evidence |
|---|---|---|
| `obligations/helpers.js` | Yes | zero imports; every export returns a closure |
| `obligations/obligations.js` | Yes (data) | 6 branch tokens in 843 LOC; only quirk is a lazy getter to dodge a circular ref — `unitRecord.requires.get anyOf()` at `:582-591`, needed because `passport` et al. are declared *after* `unitRecord` in the same file |
| `obligations/evaluator.js` | **Yes — exemplary** | `createObligationEvaluator({obligations})` — manifest injected (`:44-46`); `evaluate(fulfilments)` is a pure sync fn; all 8 pipeline stages exported individually "for isolation-testing" (`:131-134`) |
| `domain/index.js` | Yes | pure factories; `predicate`s take `(value, ctx)` and return error arrays |
| `flow/flow.js` | Yes | pure data + 4 walkers. Verified: **declares no visibility rules whatsoever** — read `:87-130`, every node is `{page, presents: [{obligation, mandatoryToProceed?, errors?}]}`. The central claim of the spike survives contact with the source. |
| `engine/index.js` | **Almost** | 14 pure fns, but see L2 — the domain singleton |
| `contract.js` | Impure at module scope | constructs the evaluator once at load (`:42-44`); pulls disk-bound i18n |
| `lib/state.js` | No — by design | the yar boundary. Optional-chained (`request.yar?.set`) so it degrades rather than throws |

**The evaluator is the best-shaped file on this side.** Manifest-injectable, no globals, every internal stage exported and unit-tested (`evaluator.units.test.js`, 760 LOC). If a third option lifts exactly one file from B, it is this one.

---

## 7. Dead code

**7,087 LOC (21% of Side B) is a frozen ancestor.** `prototypes/model-spikes/obligations-v4-model/` is the pre-fork EUDPA-277 spike. I verified by `diff`:

- `model-spikes/.../evaluator.js` vs `obligations/evaluator.js` → **empty diff, byte-identical** (519 LOC duplicated verbatim)
- `model-spikes/.../helpers.js` vs `obligations/helpers.js` → **6 lines**
- `model-spikes/.../obligations.js` is 698 LOC vs the fork's 843 — the older manifest
- `model-spikes/.../obligations.md` is 2,940 LOC vs the fork's 3,010 — the older doc

Two nearly-identical 3,000-line canonical model docs and two identical evaluators sitting side by side in one branch. `model-spikes/GAPS.md` (219 LOC) is the one piece with unique value — it is the *only* place the reasoned rejection of a declarative `gatedBy` DSL is written down (`GAPS.md:62-86`). Everything else in that directory is a rot hazard: any future evaluator fix has two homes and one of them will silently not get it.

**Dead exports in the live spike** (verified zero call sites outside their own test files):

| Export | File:line | Note |
|---|---|---|
| `matches()` | `helpers.js:147` | **2 of 6 gate factories are unused.** `obligations.js:43-48` imports only `allowListed`, `allowListedByPredicate`, `anyAllowListed`, `branchedGate`. Both are tested (`helpers.test.js:204-242`) |
| `present()` | `helpers.js:165` | as above |
| `findControllerForRoute()` | `page-controller.js:107` | zero call sites, not even a test |
| `pageRouteName()` | `page-controller.js:103` | **its own JSDoc lies**: "used by the plugin registrar" — `routes.js` does not import it |
| `findLinePage()` | `line-page-controller.js:137` | zero call sites |
| `findUnitPage()` | `unit-page-controller.js:174` | **JSDoc lies**: "used by the router to build unit-scoped routes" — `routes.js:154` branches on `page.presentsForEach.forEachOf === unitRecord` inline instead |

`controller-sketch.js` (125) and `data-dictionary-sketch.js` (98) are explicitly labelled historical/exploratory in `RECOMMENDATION.md:249-254`, are not imported by the app, but *are* tested (`sketches.test.js`, 156 LOC). Honest, self-declared, low harm.

---

## 8. The model-pollution smell in `state.js`

Group instances are **derived from descendant leaf storage** — there is no first-class instance record. `evaluator.js:390-421` enumerates a group's instances by scanning descendants' composite-key prefixes. That is elegant right up until you need to *create an empty instance*, at which point you have to write a fake value:

`lib/state.js:110-114`:

```js
const seed = {
  ...(fulfilments[seedObligation.id] ?? {}),
  [id]: ''                                  // ← a blank value on a REAL obligation
}
fulfilments[seedObligation.id] = seed
```

And because the seed obligation must be one whose `applyTo` actually admits this line's commodity code, `features/units/controller.js:186-222` (`pickSeedObligationForLine`) has to **imperatively introspect the metadata sidecar** — and it handles only **2 of the 4 gate shapes**:

```js
if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return obligation
if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return obligation
```

A unit-scoped obligation gated by `branchedGate` or `anyAllowListed` would fall through and "Add an animal" would **silently do nothing** (`:277-283` bounces back without minting). The comment at `:181-185` describes the chicken-and-egg honestly ("at add-time no unit exists yet, so `impl.inScope` is false for the very obligation we want to seed").

This is **structural**: it falls directly out of "instances are inferred from leaf storage prefixes". A first-class `instances: {commodityLine: ['line1']}` register in the fulfilments map would dissolve it — but that is a model change, not a patch.

---

## 9. Which side would I rather onboard onto?

I only read B, so this is a verdict on B in absolute terms, not a comparison.

**Onboarding onto B's model: excellent.** Read `flow/flow.js` (667 LOC of pure data) and you know the whole journey. Read `obligations/obligations.js` (843 LOC, 6 branch tokens) and you know every rule. Read `engine/index.js` (601 LOC, 14 named pure functions, none over 50 lines) and you know how status and navigation are derived. Three files, ~2,100 LOC, no framework, no magic. `obligations.md` (3,010 lines) is genuinely the reference — and, uniquely in my experience of spike docs, **it is mostly true**: I checked its central claims (flow declares no visibility rules; the engine is standalone functions not an orchestrator; container status is re-derived not rolled up at `engine/index.js:469-474`) and they all held.

**Onboarding onto B's browser layer: mediocre.** The seam you are told to program against is leaky and unenforced. There are three copies of the page controller. The two biggest controllers (CYA 351, units 308) have no unit tests. The task list has hardcoded subsection-id string literals. Six dead exports, two with lying JSDoc.

**The single cheapest thing to steal, regardless of who wins:** `obligations/coverage.test.js` (190 LOC, 8 cases). It asserts (a) every obligation is either wired to a domain entry or on an explicit `KNOWN_UNWIRED` allow-list *with a written reason* (`:80-97`), (b) no `within`-chain cycles, with a depth bound and a seen-set, because a cycle would hang `buildAncestorGroups`'s `while (cur)` loop forever (`:108-137`), (c) id and name uniqueness (`:139-170`). It is the anti-add-and-forget gate and it costs almost nothing to port to any model.

**Retrofit cost of taking B's model into a third option:**

| Work | Cost |
|---|---|
| Lift `obligations/{obligations,evaluator,helpers}.js` + `domain/` + `flow/` + `engine/` | ~4,000 LOC, moves clean (zero framework deps) |
| Fix L2 (thread `domain` through `pageStatus`/`containerStatus`) | ~20 LOC |
| Fix L3 (return message keys from `contract`, resolve in controllers) | ~10 LOC + touch 6 call sites |
| Fix L6 (`OBLIGATION_MULTI` → key on id, or better: a `multi: true` flag on the domain entry) | ~15 LOC |
| Fix L1 (widen the seam grep, add it as a test, then actually fix the 9 violations) | ~1 day |
| Delete `model-spikes/` (keep `GAPS.md`) | free, and removes 7,087 LOC of rot risk |
| Collapse the 3 page-controllers into 1 depth-generic factory | the real work — and the prerequisite for depth-3 |
| Everything the browser layer doesn't do (persist, submit, upload, auth, amend, Welsh, client JS) | not costed here — see the other dimensions |

The model is worth taking. The app around it is worth rewriting.
