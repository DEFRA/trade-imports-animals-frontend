# L1 — Conditionality, gating, reveal and wipe-on-exit — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals`, root `prototypes/standalone/live-animals/` (HEAD b6ac2ed).
All paths below are relative to that root unless prefixed with `prototypes/`.

## Headline

A's conditionality is a **closed, tiny, data-only vocabulary evaluated in one 69-line
interpreter**, driving **one** derived quantity (`inScope`, a set of instance path keys) from
which **scope, wipe, page gating, section gating, hub status and submit-readiness all fall out of
the same computation**. That is genuinely strong, and the wipe half is properly *modelled*, not a
write-path side-effect.

But the *reveal* half is much weaker than the model docs imply. Only **one** of the render surfaces
asks the engine whether a field is in scope (`additional-details/controller.js:61`). Everywhere
else — the in-page conditional reveal, the per-record identifier fields, the conditional
check-your-answers rows — the predicate is **re-applied by hand in the controller or hard-coded in
the template**. So:

- **Page-level and section-level conditional reveal: MODELLED DECLARATIVELY** (derived gates,
  `flow/gates.js`, 5 conditionally-reachable pages, zero authored gates among them).
- **Field-level conditional reveal *within* a page: HANDLED IMPERATIVELY** — 7 hand-written
  re-applications of the gate across 4 controllers + 1 template, 4 of which do not reference the
  obligation at all.
- **Wipe-on-exit: MODELLED DECLARATIVELY** (`wipeOnExit` flag, derived path list, applied by the
  only write surface — pages physically cannot hand-roll a wipe).
- **Negation: MODELLED** (`notInUnionOf`, complement-by-reference — a real capability, and one
  B should be checked against).
- **Cross-frame / nested-collection item conditionality: MODELLED** (`frame: 'enclosing'` /
  `frame: 'anyItem'`), and *proven at depth 2*.
- **Conjunction/disjunction, arithmetic, universal quantification, count comparisons: ABSENT by
  design.** The docs say so out loud: *"anything that needs real branching … belongs in a page
  controller. That is the pressure valve"* (`docs/obligation-model.md:139-143`).

---

## 1. The vocabulary — what a condition can say

`activatedBy` is a **plain data literal over a real JS object reference** to another obligation. Never a
string, never a closure, never an id lookup (`docs/obligation-model.md:100-104`). Exactly **four
operators**, all interpreted in `engine/evaluate/predicate.js` (69 LOC — the whole conditionality
semantics of the system):

```js
// engine/evaluate/predicate.js:12-29
export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) { /* set intersection */ }
  if ('notInUnionOf' in activatedBy) {
    if (!isAnswered(value)) return false
    const union = includesUnion(activatedBy.notInUnionOf)
    return ![].concat(value).some((candidate) => union.includes(candidate))
  }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(`Unknown activation predicate: ...`)
}
```

Crossed with **three frame modes** in `evalPredicate` (`predicate.js:31-69`):

| mode | literal | resolution | live carriers |
|---|---|---|---|
| same-frame / top-level | no `frame` key | sibling-identity inference: `siblings.includes(ref)` → read inside this entry, else read the top-level answer (`predicate.js:64-68`) | 6 |
| enclosing | `frame: 'enclosing'` | walk *strictly outward* (`frames.slice(1)`) to the nearest ancestor frame whose obligation list holds the ref (`predicate.js:38-48`) | 7 |
| anyItem | `frame: 'anyItem'` | existential over a collection's entries (`predicate.js:50-62`) | 2 |

### Live census (all 44 obligations walked; 15 carry `activatedBy`)

| operator | count | carriers |
|---|---|---|
| `includes` | 9 | `numberOfPackages`, 4 typed animal identifiers, `permanentAddress`, `transitedCountries`, `countyParishHoldingCph`, `containsUnweanedAnimals` |
| `equals` | 4 | `regionOfOriginCode`, `purposeInInternalMarket`, `commercialTransporter`, `privateTransporter` |
| `notInUnionOf` | 2 | `animalIdentifierIdentificationDetails`, `animalIdentifierDescription` |
| `present` | 0 | supported, dormant (`docs/obligation-model.md:113-117`) |

**All 15 conditionals carry `wipeOnExit: true`; no unconditional obligation carries it.** (Verified
by grep across `features/*/obligations.js`.) This is not decoration — see §5, the cascade coupling.

### What the vocabulary CANNOT say (structural, by design)

`activatedBy` is **one predicate over exactly one referenced obligation**. There is no `allOf`,
`anyOf`, `not`, arithmetic, count comparison, or universal quantifier anywhere in the shape.
Consequences, each verified against `predicate.js`:

- **No AND / OR of two conditions.** "Show X when reason = internalMarket AND means = Road" is
  inexpressible. The only composition available is *chaining* (X gated on Y which is gated on Z),
  which is not conjunction and has its own defect (§5).
- **No universal or negated-existential quantification over a collection.** `frame: 'anyItem'` is
  `∃item. P(item)` (`predicate.js:57-59`, `entries.some(...)`). `∀item. P` and `¬∃item. P` cannot be
  written. Combining `anyItem` with `notInUnionOf` gives `∃item. ¬P` — *not* `¬∃item. P`. So
  "the CPH question disappears only if NO line is a cow" is expressible, but "show X only when
  EVERY line is a horse" is not.
- **No count-based condition.** `maxEntriesFrom` (`engine/evaluate/cardinality.js:20-31`) is the one
  place a number is read from another obligation, and it is a *cap enforced on append*, not a
  predicate. Nothing can say "show X when the collection has ≥ 2 entries".
- **A gate cannot read an answer value directly.** An authored `gate` is `(scope) => boolean` and
  `scope` exposes only `{ inScope, has, answered, readyForCheckYourAnswers }`
  (`engine/read.js:27-35`) — **no `answers`**. So flow-level branching on a value must first be
  routed through an obligation's `activatedBy`.

None of these require a rewrite to add (predicate.js is one file, and the operator set is a closed
switch) — so I mark them **structural=false** — but the *stance* is deliberate and documented, and
the escape hatch is "write it in a controller", which is exactly where A's imperative debt has
accumulated (§4).

---

## 2. Wipe-on-exit — MODELLED, and the strongest single mechanism on this side

`wipeOnExit: true` is a flag on the obligation. `reconcile` derives the wipe set purely
(`engine/evaluate/reconcile.js:32-46`):

```js
const wipedPaths = nodes.filter(({ path, obligation }) =>
  obligation.wipeOnExit && !inScope.has(pathKey(path)) && isAnswered(valueAt(answers, path))
).map(({ path }) => path)
const wiped = wipedPaths
  .filter((path) => !wipedPaths.some((other) => isStrictPathPrefix(other, path)))
  .map(pathKey)
```

Three properties that are *not* cosmetic:

1. **Derivation and application are separated.** `reconcile` names paths and deletes nothing.
   `destroyWiped` (`lib/path.js:59-63`) is the single deletion site, called from exactly three
   places — `commit` (`engine/write.js:14-15`), `removeEntryAt` (`write.js:57-58`) and
   `reconcileEntriesAt` (`write.js:74-75`).
2. **A page physically cannot hand-roll a wipe or fake scope.** The engine facade
   (`engine/index.js`, 10 exports) has **no `setScope` and no per-key delete**, and the records port
   offers only whole-map save (`docs/scope-and-wipe.md:77-89`). I verified the absence: grep for
   `setScope`/`deleteAt` outside `lib/path.js` and `engine/` returns nothing in `features/`.
3. **Wipe is per-instance and at the exact path.** Wipe keys are `pathKey`s
   (`commodityLines[0].animalIdentifiers[1].horseName`), deleted innermost-first and
   highest-index-first by `wipeOrder` (`lib/path.js:47-57`) so no splice shifts another target.
   Subtree roots dedupe descendants away (`isStrictPathPrefix`, `lib/path.js:43-45`) — a *path array*
   prefix test, not a string prefix, so `documents` cannot swallow `documentsExtra` and
   `commodityLines[1]` cannot swallow `commodityLines[10]`.

**Nothing derived is stored** (`docs/scope-and-wipe.md:147-156`): `makeScope` re-runs `reconcile` on
every read (`engine/read.js:28`), so a resumed journey self-heals to the *current* model. Verified —
`read.js` calls `reconcile(answers)` unconditionally.

Proof: 4 browser-level yes-no-yes tests in `prototypes/e2e/live-animals.spec.js` (lines 1879, 1948,
2047, 2203 — commercial transporter, private transporter, transit countries, import purpose), each
asserting the field comes back *blank*, plus per-path wipe tests at every depth in
`engine/evaluate/cross-frame.test.js:64,77,116,147,266` and `store-ops.test.js` (25 cases).

### Where wipe does NOT run — the two holes

- **`appendEntryAt` deliberately skips reconcile** (`write.js:20-28`). Justified: an append can only
  *add* scope (`docs/scope-and-wipe.md:115-119`). Sound.
- **`updateEntryAt` also skips reconcile** (`write.js:30-46`) — and this is **not** justified
  anywhere. It has a live caller: `consignment-details.controller.js:178` rewrites a
  `commodityLines[i]` entry. Today it is safe *only by accident*: that caller spreads the existing
  entry and touches only `numberOfAnimalsQuantity` / `numberOfPackages`, never the gating
  `commoditySelection`. The moment any controller updates an entry's gating field through
  `updateEntryAt`, stale gated data at depth survives into the submitted notification. `docs/limits.md:54-58`
  claims "no feature controller calls the update path" — **that is stale; consignment-details does.**

---

## 3. Gating — page and section reveal is derived, and there is exactly ONE authored gate

`flow/gates.js` (37 LOC) is the whole gating layer:

```js
// flow/gates.js:21-28
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return prerequisitesMet(pagePrerequisites(page.id), scope) &&
         inScopeReachable(collectsOf(page.id), scope)
}
```

Two derived clauses, no authored strings:

- **In-scope clause** — inverts each page's declared `collects` through the boot-built dispatch
  index (`flow/dispatch.js:26-65`) and asks whether *any* collected obligation is in scope. The model
  never names a page; the page names obligations; boot inverts. `buildDispatch` also
  **coverage-asserts totality** — every non-system obligation at every depth must be collected by
  exactly one page or the server does not start (`dispatch.js:55-63`).
- **Prerequisite clause** — `flow/prerequisites.js:8-26` derives, for any page, the
  `enforcedAt: 'continue'` obligation ids owned by a **strictly earlier** flow step, from flow order
  + the dispatch index + the obligation's own `enforcedAt` fact. There is **no hand-authored
  prerequisite graph**. Only **2 carriers** exist (`countryOfOrigin`, `commoditySelection`) and they
  generate the entire "Cannot start yet" behaviour of the 11-row hub.

**5 pages are conditionally reachable purely from the model**: `importPurposePage`,
`transitCountriesPage`, `transportersSelectPage`, `privateTransporterDetailsPage`, `cphNumberPage`
(each collects exactly one conditional obligation — `flow/flow.js:27-75` + the `collects`
declarations). **1 authored gate exists in the entire flow**: `flow/flow.js:72`,
`gate: (scope) => scope.readyForCheckYourAnswers` on the review section, and it exists only because
`declaration` is always in scope so a derived gate would open review from the start
(`docs/flow-and-gates.md:42-46`). Pinned by `flow/gates.test.js` (12 cases), which asserts the
derived-gate ≡ not-NA equivalence across every enumerable scope state.

**Fail-loud seam:** a derived gate consulted before `buildDispatch()` throws
(`gates.js:5-12`) — because "index not built" and "collects nothing" are otherwise
indistinguishable and would silently gate every page out.

**The honest cost, from A's own docs** (`docs/limits.md:60-64`): a derived gate bakes in
**any-in-scope** semantics. A future page mixing one conditional and one unconditional obligation
gets an always-true gate, and the author must fall back to an authored gate — reintroducing the
hand-typed `inScope.has('...')` string the derivation removed. I confirmed this in
`gates.js:18-20` (`obligationIds.some(...)`).

**A page that collects nothing is always reachable** (`inScopeReachable` returns true for `[]`,
`gates.js:18-19`). Two live pages have `collects: []` —
`animal-identification.controller.js:20` and `consignment-details.controller.js:14` — so the entire
animal-identification surface is gated by prerequisites alone, never by scope. Its hub row's
*status* is a collection facet, but its *gate* is not model-derived.

### Entry guard — imperative, one rule

`flow/entry-guard.js` is a plugin-level `onPreHandler` with a single hard-coded rule (a fresh
journey deep-linking to any post-filter page is bounced to the filter, `entry-guard.js:44-50`), with
a hand-listed exemption array (`entry-guard.js:10-14`). Not modelled, not generic, and not pretending
to be.

---

## 4. Reveal *within* a page — the imperative debt

This is where A is weakest and where the docs oversell. `inScope` is consulted by exactly **one**
render path in the whole app:

```js
// features/additional-details/controller.js:61,67
scope.has('containsUnweanedAnimals')
```

Every other conditional reveal re-implements the predicate by hand. Full census (grep for
`scope.has|activatedBy|includesUnion|conditional` under `features/` and `*.njk`):

| # | site | what it does | reads the model? |
|---|---|---|---|
| 1 | `commodities/animal-identification.controller.js:42-43` `typeApplies` | `obligation.activatedBy.includes.includes(commodity)` | yes — but re-implements the `includes` operator and the *enclosing* frame walk by hand |
| 2 | `animal-identification.controller.js:67-68` `fallbackApplies` | `!includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)` | yes — hand-negates |
| 3 | `animal-identification.controller.js:131-132` `permanentAddressApplies` | `permanentAddress.activatedBy.includes.includes(commodity)` | yes |
| 4 | `commodities/consignment-details.controller.js:17-18` `packagesApply` | `commodities.packageCountCommodities().includes(...)` | **no** — goes straight to the service list, bypassing `numberOfPackages.activatedBy` entirely |
| 5 | `additional-details/controller.js:13-18` `unweanedApplies` | hand-rolled `∃line. list.includes(line.commoditySelection)` | **no** — a hand-written `anyItem` quantifier |
| 6 | `check-answers/controller.js:111` | `answers.regionOfOriginCodeRequirement === 'yes'` | **no** — a raw literal duplicate of the `equals` gate |
| 7 | `check-answers/controller.js:150` | `answers.reasonForImport === 'internalMarket'` | **no** — ditto |
| 8 | `features/origin/template.njk:42` | `govukRadios(... conditional: { html: regionCodeHtml })` | **no** — the in-page reveal is hard-coded GDS markup |

So the *engine* has one predicate interpreter, but the *application* has (counting the engine's own
`complete.js` as a second) **three model-aware interpreters and five model-blind duplicates**. Sites
4–7 will silently drift if the obligation's gate value or list changes — nothing in the test suite
ties them to the obligation. This is a direct consequence of the paradigm ("pages own presentation,
the model carries no widget/type"), and it is the single biggest thing a third option should fix:
**A has no field-widget derivation, so no page can render a gate.**

Note the shape of the mechanism that *does* work: on the origin page, the reveal is client-side
GDS `conditional` markup, the stale value **is still posted** (the hidden input stays in the DOM),
`commit` writes it, and `reconcile` **destroys it on the same write** (`write.js:11-18`). The wipe
layer is what makes the imperative reveal safe. That is a genuinely nice division — but it means the
reveal is best-effort UI and the *model* is the safety net, not the other way round.

Hub-row hiding is also imperative: `flow/task-rows.js:39` hand-sets `conditional: true` on the
transit-countries row and `features/hub/controller.js:156` hides the row when its status is
Not-applicable. No other conditional row (e.g. the importReason row, which contains the conditional
purpose page) carries the marker.

---

## 5. Chained conditionality — the real defect

`reconcile` computes `inScope` to a **fixpoint** (`reconcile.js:11-30`) and the docs claim this exists
because *"activation references can chain — an obligation activated by another obligation that is
itself conditional — which is why a single pass is not enough"* (`docs/scope-and-wipe.md:35-38`).

Reading the code, that claim does not hold up:

- Predicates read **answer VALUES, not scope** (`reconcile.js:22-24` → `evalPredicate(…, answers, frames)`).
  The only scope-dependent condition in the loop is `collectionAncestorKey` (`reconcile.js:17-20`),
  and `registry.walk` yields a collection before its item instances (`registry.js:56-68`), so the
  ancestor is always already in scope when a child is visited. **The loop never adds anything on its
  second pass.** It is defensive machinery, not chaining support.
- Because activation is value-mediated, a chain only cascades **if every intermediate carries
  `wipeOnExit`**. Omit it on an intermediate and its stale value keeps the grandchild in scope
  forever. (All 15 live conditionals do carry it — so the coupling is invisible today, and an author
  adding the 16th has nothing to warn them.)
- Worse: **the wipe of a two-level chain does not converge in one write.** `commit` reconciles once
  against the *pre-wipe* answers (`write.js:14-16`). With `A → B → C`, flipping `A` off puts `B` out
  of scope but `C` still passes (it reads `B`'s not-yet-deleted value), so only `B` is wiped. `C`'s
  answer survives in the store until the *next* commit — and `makeScope` on read does not wipe
  (`read.js:27-35`). A journey submitted immediately after that write would carry `C`.

**No live two-level chain exists** — every one of the 15 activators (`commoditySelection`,
`reasonForImport`, `meansOfTransport`, `transporterType`, `regionOfOriginCodeRequirement`) is itself
unconditional. So this is latent, not a live bug, and there is no test for it. The fix is small
(loop reconcile→destroy to a fixpoint), so **structural=false** — but it is a real hole in a
mechanism the docs advertise.

---

## 6. What A does that is genuinely hard to do otherwise

Three capabilities to test B against:

1. **`notInUnionOf` — complement-by-reference** (`predicate.js:20-24`, `includesUnion` at
   `predicate.js:4-10`). The negative gate names the *positive obligations* it negates, and the
   engine derives the union at runtime. Adding a commodity to the ear-tag list automatically removes
   it from the free-text fallback's scope — **the complement cannot drift**. DESIGN-DELTA #7
   (`DESIGN-DELTA.md:236-275`) records this as the fix for a real over-show defect (c-028). A model
   whose negation is written as a *duplicate list* has no such guarantee. This is A's best single
   idea in this dimension.

2. **Item-relative gating with no marker, at depth 2, with one resolver rule.**
   `numberOfPackages` (`features/commodities/obligations.js:12-18`) carries a bare
   `{ obligation: commoditySelection, includes: [...] }`; nothing says "item-relative". Resolution is
   inferred from **sibling identity** — `siblings.includes(referencedObligation)` (`predicate.js:65`) —
   and the *identical* criterion is used by the completeness resolver (`complete.js:26`). That is the
   **resolver-unity invariant**: what reconcile puts in scope is exactly what completeness counts as
   owed. DESIGN-DELTA #5 (`DESIGN-DELTA.md:107-141`) threads an opt-in `ctx` (`complete.js:5-9,35-41`)
   so the invariant survives at depth 2 for `permanentAddress`, the first **required** enclosing-gated
   field. Pinned by `engine/evaluate/enclosing-complete.test.js` (9 cases).

3. **A dead-end prover over the conditionality graph.** `analysis/reachability.js` scaffolds a
   witness answers-map per obligation instance — seeding an `anyItem` gate with one triggering
   collection entry (`reachability.js:62-69`), an `enclosing` gate on the nearest ancestor frame that
   holds the reference (`reachability.js:70-77`), and a `notInUnionOf` gate with a value *synthesised
   outside the derived union* (`reachability.js:39-44`) — then asserts every obligation lands in scope
   and its owning page is reachable (`proveReachability`, `reachability.js:184-215`). This runs as a
   test on every run. **Caveat, and it is a real one:** the top-level state space is a **hand-written
   cartesian** over 4 named axes (`enumerateScopeStates`, `reachability.js:8-20`, 2×2×2×3 = 24 states)
   — it is *not* derived from the model. Add a 5th top-level `equals` gate and you must hand-edit the
   prover. So the prover is semi-automatic, and `enumerateScopeStates` is a 6th place to touch.

---

## 7. Docs vs code — disagreements found

| claim | reality |
|---|---|
| `docs/obligation-model.md:85` "Live-animals currently has no cross-feature edge" | **False.** `features/cph-number/obligations.js:1` and `features/additional-details/obligations.js:1` both `import { commoditySelection } from '../commodities/obligations.js'`. Two cross-feature activation edges exist. |
| `docs/limits.md:20-31` "Depth-2 … has no live carrier" / "no live item-conditional field gates completeness" | **Stale.** `animalIdentifiers` nested inside `commodityLines.item` is a live depth-2 collection (`features/commodities/obligations.js:96-124`), and `permanentAddress` is `required: true` + enclosing-gated, so it *does* feed `entryComplete`. (Equals-gated *item*-conditionality is still genuinely carrier-free — every `equals` gate is top-level.) |
| `docs/limits.md:54-58` "no feature controller calls the update path" | **False.** `features/commodities/consignment-details.controller.js:178` calls `state.updateEntryAt`. This matters because `updateEntryAt` does not reconcile (§2). |
| `docs/scope-and-wipe.md:35-38` the fixpoint loop exists because chains need >1 pass | **Overstated.** Predicates read values, not scope; `walk` emits ancestors first; the loop's second pass adds nothing. Chains cascade through `wipeOnExit`, and take two writes to converge (§5). |
| `docs/obligation-model.md:279-283` "`entryComplete` … has no enclosing context in its signature" | **Stale in the model doc, corrected in DESIGN-DELTA #5.** `complete.js:5-9` now takes `ctx`. The two docs contradict each other. |

---

## 8. Retrofit cost — what it costs to take these mechanisms

- **Take `notInUnionOf` alone:** ~10 LOC (`includesUnion` + one branch in the predicate switch) plus
  the requirement that the positive gates be *object references*, not strings. **If B's obligations
  reference each other by id/string, complement-by-reference cannot be lifted as-is** — it needs a
  registry lookup and loses the fail-loud-on-misspelling property.
- **Take the frame vocabulary:** requires the walker to yield an **innermost-first frames chain**
  (`registry.js:44-71`) — a change to whatever B's tree walk is — plus the *same* chain threaded into
  the completeness resolver, or the resolver-unity invariant breaks silently at depth (that is
  literally what DESIGN-DELTA #5 was fixing).
- **Take derived gates:** requires page-side `collects` declarations + a boot inversion + a totality
  assertion. Cheap (74 LOC, `flow/dispatch.js`), but it *imposes* one-obligation-one-page
  (`dispatch.js:44-52` throws on a second owner) and derives ownership-at-depth from the nearest
  collection ancestor (`dispatch.js:15-24`) — you cannot route one field at depth to a different
  page.
- **Take wipe-on-exit:** cheap and high-value (~30 LOC across `reconcile.js` + `lib/path.js`), but it
  is only *safe* because the write surface has no delete primitive. Lifting the flag without lifting
  the closed write surface gives you the flag and not the guarantee.
- **Adding one new conditional field to A today touches 5–6 places:** `obligations.js`, the
  controller's validation schema, the controller's commit, the template, a hand-composed CYA row
  (`docs/add-a-field.md:16`), and — if it is a new top-level gate — `analysis/reachability.js:8-20`.

---

## 9. Test coverage of this dimension

| file | cases | what it pins |
|---|---|---|
| `engine/evaluate/cross-frame.test.js` | 18 | enclosing / anyItem / notInUnionOf; per-instance scope with no sibling leak; exact-path wipe; depth-2 two-frames-out; unanswered-gate inactivity; default-branch backwards-compat |
| `store-ops.test.js` | 25 | append/update/remove at path, batch reconcile, cardinality cap, depth-2 field-level wipe |
| `flow/gates.test.js` | 12 | derived gate ≡ not-NA across every enumerable scope state; fail-loud before boot; the single authored gate |
| `engine/evaluate/enclosing-complete.test.js` | 9 | resolver unity at depth (required enclosing-gated field not owed off-gate) |
| `engine/evaluate/sibling-at-least-one.test.js` | 8 | `requiredOneOf` group mandate |
| `engine/evaluate/reconcile.test.js` | 4 | branch activation + yes-no-yes wipe (transporter, region code) |
| `item-conditional.test.js` | 4 | sibling-identity resolution; per-instance wipe of a stale package count |
| `nested.test.js` | 2 | nested-collection completeness (synthetic) |
| `prototypes/e2e/live-animals.spec.js` | 4 relevant | browser-level yes-no-yes wipe: transporter ×2, transit countries, import purpose |
| `analysis/reachability.js` (run as a test) | — | no dead ends, no orphaned roots, recomputed every run |

**~82 unit cases + 4 E2E** directly on conditionality/gating/wipe, out of 526 unit cases total.

---

## Verdict for the shopping list

**Take from A:** `wipeOnExit` as a *modelled* flag with derivation/application separated and a write
surface that has no delete primitive; `notInUnionOf` complement-by-reference; the frames chain +
resolver-unity invariant; derived page gates from inverted `collects` with a boot totality assertion;
the reachability prover.

**Do not take from A:** the render side. A cannot render its own gate — there is no `type`, no widget
derivation, and consequently 8 hand-written reveal sites of which 5 do not reference the model. If B
has field-widget derivation from the obligation, that is the thing A structurally lacks, and it is
the half of this dimension A never built.
