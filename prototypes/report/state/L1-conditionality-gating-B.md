# L1 — Conditionality, gating, reveal and wipe-on-exit — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(`prototypes/model-spikes/obligations-v4-model/` is the frozen ancestor — evaluator byte-identical, ignored except for `GAPS.md`, which is live argumentation.)

## Headline

This is Side B's **strongest dimension**. Conditionality is not a feature bolted onto the model; it *is* the model. One mechanism — `applyTo(fulfilments, fulfilmentIdsByObligationId) -> Decision` — drives hide-page, hide-question, hide-section, status-swap and wipe. `flow/flow.js` (667 LOC, 31 pages) declares **zero** visibility rules: `grep -n "visible\|when:\|condition\|hide\|show" flow/flow.js` returns nothing. Pages, subsections and sections become Not Applicable *derivatively*, because every obligation they present went out of scope. That claim is real, and I verified it in code, not just in the 3,010-line `obligations.md`.

Wipe-on-exit is **MODELLED, not a write-path side-effect** — for leaves. It is `purgeStorage` (evaluator.js:333-379), step 5 of a 7-step pure pipeline, and it is a pure function of the manifest. But there are three sharp holes, one of which is a straight doc-vs-code contradiction:

1. **The purge is never persisted.** It is a read-time projection. The session keeps the orphan forever.
2. **The evaluator purges on SCOPE, never on VALUE-LEGALITY.** Narrow an option list under a stored answer and the illegal answer survives, still counted as Fulfilled.
3. **A collection instance exists only as a side-effect of its leaves' storage.** Purge every leaf of an instance and the instance itself evaporates — silently deleting a user's animal record.

---

## 1. The gate mechanism — what is declarative and what is not

### 1.1 `applyTo` is a FUNCTION, deliberately, not a DSL

`GAPS.md:62-86` is the reasoned rejection of a declarative `gatedBy` DSL, which was actually built (commit `c79fbd0`) and then dropped:

> "**Declarative gatedBy DSL** (options F+G) — landed as a prototype and used through step 4 and 5. Same brevity as applyTo + helpers for common cases, plus native introspection. Rejected in favour of applyTo + helpers on the idiomatic-JS, obligation-level-testability and cross-sibling-ergonomics grounds" — GAPS.md:187-192

So on the strict definition — *(a) MODELLED DECLARATIVELY = expressed in data the engine interprets* — the gate **condition** on Side B is **NOT declarative**. It is an arbitrary JS closure. What *is* declarative is the **Decision shape it returns**, and everything downstream of it (purge, records, status, page NA, nav, task-list) is engine-interpreted data. The model is: *imperative condition, declarative consequence*.

Introspection is clawed back selectively via a `.metadata` sidecar on 4 helper factories (`helpers.js:39,65,101,132`). **This clawback is partial, and I can quantify how partial** (see §6).

### 1.2 The 44-obligation gate census (obligations/obligations.js, 843 LOC)

| Gate shape | Count | Sites |
|---|---|---|
| `applyTo: () => ({ inScope: true, status: 'mandatory'\|'optional' })` — unconditional | **19** | :156,167,177,183,207,240,246,252,258,264,274,314,320,326,356,362,373,383,394 |
| `branchedGate(pred, whenTrue, whenFalse)` | **9** obligations (5 distinct gates; 4 accompanying-document fields share one) | :193,216,282,296,337,767,773,779,785 |
| `allowListed(gate, values, projectionGroup?, reasons)` | **6** | :474,636,646,656,666,711 |
| `allowListedByPredicate(gate, predicate, projectionGroup, reasons)` — **negated gate** | **2** | :685,698 |
| `anyAllowListed(gate, values, whenTrue, whenFalse)` — collection→scalar aggregation | **2** | :513,549 |
| No `applyTo` at all — structural groups | **2** | commodityLine :408, unitRecord :567 |
| No `applyTo` — plain `field` inside a group (always in scope for the parent instance) | **4** | commodityCode, commodityType, species, numberOfAnimals |
| **Total** | **44** | |

**Conditional obligations = 19 of 44** (9 + 6 + 2 + 2).

### 1.3 The two conditional semantics are FIRST-CLASS AND DISTINCT

This is the single best idea in the dimension, and it is one Side A's `DESIGN-DELTA` vocabulary does not obviously carry: **`mandatoryWhen` vs `appliesWhen` are the same mechanism with a different `whenFalse` branch**, and the difference *is* the wipe policy.

```js
// RETAIN-VALUE (mandatoryWhen) — obligations.js:190-198. Both branches inScope.
export const regionCode = {
  applyTo: branchedGate(
    (fulfilments) => fulfilments[regionCodeRequirement.id] === 'yes',
    { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
    { inScope: true, status: 'optional' }          // <-- value survives the flip
  )
}

// PURGE-ON-FLIP (appliesWhen) — obligations.js:213-225.
export const purposeInInternalMarket = {
  applyTo: branchedGate(
    (fulfilments) => fulfilments[reasonForImport.id] === 'internal-market',
    { inScope: true, status: 'mandatory', reasons: [purposeInInternalMarketReason] },
    { inScope: false }                             // <-- purgeStorage drops the value
  )
}
```

`obligations.md:655-661` states the authoring rule plainly: *"Use `appliesWhen` when the field is meaningless without the trigger condition. Use `mandatoryWhen` when the field is meaningful regardless of the trigger, but only required when the trigger holds."* The doc is honest and the code matches. Both are pinned by tests: `evaluator.test.js:243` (retain), :302 (purge), :1141 (`does not purge a stored value when the gate is off (extended form whenFalse keeps inScope: true)`).

**The wipe policy is therefore per-obligation, declared, and readable in one place.** That is a genuinely good property.

---

## 2. Wipe-on-exit — MODELLED (leaves), IMPERATIVE (instances), NOT PERSISTED (all)

### 2.1 The purge is a pure function, step 5 of 7

`evaluator.js:44-129` is the whole pipeline: drop-unknown → **pre-purge enumerate group paths** → run every `applyTo` → effective inScope (own AND every ancestor, `makeInScopeCheck`:301-325) → **purge** → post-purge enumerate → build implications.

```js
// evaluator.js:342-366 — purgeStorage
for (const [obligationId, fulfilment] of Object.entries(recognisedFulfilments)) {
  const obligation = obligationsById.get(obligationId)
  if (!isInScope(obligation)) continue            // whole entry dropped
  ...
  if (category === 'derived-leaf') {
    // applyTo returns the leaf fulfilmentIds it currently authorises;
    // keep only stored records whose fulfilmentId is in that set.
    const fulfilmentIds = new Set(
      obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
    )
    ...
  }
}
```

Two distinct wipe granularities, both engine-interpreted:
- **Whole-obligation wipe** — `inScope: false` ⇒ the entire entry disappears (`continue` at :346).
- **Per-record wipe** — an indexed leaf keeps ONLY the records in `applyTo`'s returned `records` array. This is **item-level conditionality inside a collection**, and it is exact: `evaluator.test.js:797-811` stores `passport` for both a bees-line unit and a cattle-line unit, and asserts only the cattle one survives.

Ancestor conjunction is modelled too (`makeInScopeCheck`:315-320 recurses up the `within` chain), so out-of-scoping a group cascades to every descendant leaf without any per-leaf declaration.

**Verdict: wipe of leaf answers is MODELLED DECLARATIVELY.** It is not a side-effect of a write path — no controller calls a wipe function; `evaluate()` computes it.

### 2.2 …but the purged map is thrown away. This is a doc-vs-code contradiction.

`obligations.md:465-467` and again :2037-2040:

> "Returns the amended set as part of its output. **The orchestrator persists the amended set — it becomes the new source of truth.**"

The orchestrator does not. `lib/state.js:42-44` is the entire read path:

```js
export function readState(request) {
  return evaluateState(readFulfilments(request))   // evaluates; discards the amended map
}
```

`grep -rn "writeFulfilments" EUDPA-249-flow-layer/` returns **5 call sites, all in lib/state.js** (:76, :115, :161, :201, :221) — `writeAnswer`, `addCommodityLine`, `deleteCommodityLine`, `addUnitRecord`, `deleteUnitRecord`. Every one of them builds its map from `{ ...readFulfilments(request) }` — the **raw, unpurged** session map. Nothing anywhere writes `state.fulfilments` back.

Consequences, traced through the code (not executed — I was not permitted to run the suite):
- Orphaned answers accumulate in the `@hapi/yar` session indefinitely. They are invisible because every read re-purges, so no UI defect is observable in the happy path — which is exactly why no test catches it.
- **Flip a gate false, then true again, and the old answer comes back.** `reasonForImport = internal-market` → answer purpose → change to `transit` (purpose purged from the projection, still in the session) → change back to `internal-market` → `purposeInInternalMarket` is in scope again, storage was never deleted, `buildFieldDescriptors` (`build-field-descriptors.js:80-82`) reads `readValue(entry, state)` and pre-fills the old answer, and the task list reads Fulfilled without the user re-confirming anything.
- `obligations.md:658-661` explicitly promises the opposite: *"`appliesWhen` fields disappear on scope exit; **their prior values vanish**."* In the model they vanish. In the running app they do not.

Whether resurrect-on-return is *desirable* is a real design question (it may be kind UX). The finding is that **it is undesigned** — the doc says one thing, the code does another, and no test pins either. Cheap to fix: one line (`writeFulfilments(request, state.fulfilments)` inside `readState`, or on the POST path). **structural = false.**

### 2.3 Collection-instance deletion IS a hand-coded write path

Delete a commodity line and the cascade is imperative string-prefix surgery, not a model operation:

```js
// lib/state.js:139-157 — deleteCommodityLine
const prefix = `${lineId}${PATH_DELIMITER}`
for (const oblId of Object.keys(fulfilments)) {
  ...
  for (const key of Object.keys(stored)) {
    if (key.startsWith(prefix)) { delete next[key]; changed = true }   // depth-2 cascade
  }
}
```

Plus a caller-supplied `lineLeafObligations` array (:120) and a separate `deleteUnitRecord` (:206-222) with its own `unitLeafObligations` array. Those arrays are derived from the flow at import time (`features/units/controller.js:42` `UNIT_LEAF_OBLIGATIONS = UNIT_PAGES.map(p => p.obligation)`), which stops them drifting — good discipline — but the **cascade itself is hand-written per depth**. A depth-3 group needs a third delete function and a third leaf-list derivation. `RECOMMENDATION.md:180-188` owns this: Add-another is explicitly *not* a flow primitive.

**Verdict: instance deletion is HANDLED IMPERATIVELY.** Contrast with leaf wipe, which is modelled. The asymmetry is the tell.

### 2.4 A gate flip can silently annihilate a collection instance

A group instance has **no record of its own**. Its existence is *inferred* from its descendants' composite-key prefixes, post-purge:

```js
// evaluator.js:406-418 — enumerateGroupFulfilmentIds (step 6)
const prefixLen = obligationAncestorGroups.get(o.id).length + 1
for (const desc of obligationDescendants.get(o.id)) {
  const descendantFulfilment = amendedFulfilments[desc.id]   // POST-purge
  if (!isKeyedRecord(descendantFulfilment)) continue
  for (const key of Object.keys(descendantFulfilment)) { ...ids.add(prefix) }
}
```

This is why `addUnitRecord` has to fake a leaf into existence (`lib/state.js:196-200`): `seed[compositeKey] = ''` on a "seedObligation" the controller picks by asking the gate metadata *"would this line's commodity code admit you?"* (`features/units/controller.js:186-217`).

Trace the failure (pipeline-read, not executed):
1. Line 1, `commodityCode = '0101'` (horse). User clicks Add animal. `pickSeedObligationForLine` walks mandatory-first: `permanentAddress` is gated to `['01061900']` only, so it falls through to the optional bucket and seeds `passport` (`PASSPORT_COMMODITIES = ['0101','0102','01061900']`, obligations.js:601-605). Storage: `fulfilments[passport.id]['line1/unit1'] = ''`.
2. User changes line 1's `commodityCode` to `'0103'` (pig). `'0103'` is **not** in `PASSPORT_COMMODITIES`, so `passport.applyTo` no longer authorises `line1/unit1`; `purgeStorage`'s derived-leaf branch drops the record; `fulfilments[passport.id]` becomes empty and is dropped entirely (:364).
3. `line1/unit1` now has **no surviving descendant storage**. Step 6 enumerates `unitRecord.records = []`.
4. `expandPresents` (`engine/index.js:258-270`) reads `state.obligations[unitRecord.id].records` — empty — so every per-unit page collapses to NA, and `features/units/controller.js` lists zero units.

The animal is gone. Not "hidden" — gone from the projection, and (because of §2.2) still rotting in the session as a `''` under a purged obligation id, ready to resurrect if the user flips the code back to `0101`. `tattoo` and `earTag` *are* in scope for `0103` and their `applyTo` records (computed from the **pre-purge** enumeration, evaluator.js:71-84) still list `line1/unit1` — but with no storage under them the instance cannot be reconstituted.

**structural = true.** Fixing it means giving group instances first-class storage (an instance registry keyed by group id), which changes the storage shape and rewrites evaluator steps 2, 5 and 6 plus every `lib/state.js` mutator. That is a model change, not a bug fix. No test covers this path (`grep "flip" routes.test.js` → the only flip tests are the regionCode status swap).

---

## 3. Reveal — page, section, question, option

All four ride one mechanism. This is the spike's central claim and it **holds**.

| Reveal target | Mechanism | Declarative? | Evidence |
|---|---|---|---|
| **Page** | derived: no in-scope presented entries ⇒ NA | YES | `classifyEntries`:387 `if (inScope.length === 0 && groupErrorCount === 0) return STATUSES.NOT_APPLICABLE`; `pageStatus`:442-447 |
| **Question (field on a page)** | out-of-scope entries filtered out of the descriptor list | YES | `build-field-descriptors.js:67` `if (!entryInScope(entry, state)) continue` |
| **Subsection / Section** | `containerStatus` **re-derives** over the subtree's in-scope entries (not a roll-up of child statuses) | YES | `engine/index.js:469-474`; hub locks the link: `features/hub/controller.js:113` `if (href && (isLinesManage \|\| status !== STATUSES.NOT_APPLICABLE)) item.href = href` |
| **Navigation skip** | NA and Fulfilled pages are skipped | YES | `firstUnfulfilledPage`:128-139 returns only NS/IP pages |
| **Option (value within a field)** | `domain` layer `computedEnum` closure | PARTIAL — a closure, not data | `domain/index.js:148-157`; only **2** computedEnums exist: `purposeInInternalMarketDomain`:374 and `speciesDomain`:492 |
| **Per-instance option** | `ctx.path` threaded into the closure | YES (works) | `speciesDomain`:492-502 `const code = ctx?.path ? codeMap[ctx.path] : undefined` — species options depend on *that line's* commodity code |

Two things to note on options.

**(a) `optionsFor` is called without the ids map from the browser layer.** `build-field-descriptors.js:73` passes `undefined` for `ids`:

```js
optionsFor(entry.obligation, state.fulfilments, undefined, domain, { path: entry.path })
```

So a `computedEnum` whose option list needs to know *"which instances of group X currently exist"* cannot get that at render time — only `fulfilments` and its own `path`. Nothing today needs it. **structural = false** (thread `state.obligations` through and it's closed), but it is a live seam gap.

**(b) There is no option-level *purge*.** See §4.

---

## 4. The hole: value-legality staleness. Scope-wipe exists; legality-wipe does not.

The evaluator **never consults the domain layer**. `evaluator.js` imports exactly one thing — `./obligations.js`. `domain/index.js` (Layer 1.25, value-legality) is only reached from two places: `contract.validatePagePayload` (POST only, contract.js:284-290) and `isValueFulfilled`/`isComplete` for address structural-completeness (engine/index.js:318-324).

Concretely:
- `species` is a plain `field` within `commodityLine` (no `applyTo`), and its legal options are a `computedEnum` over the line's `commodityCode` (domain/index.js:492-502).
- User picks `commodityCode = '0102'` (cattle), selects `species = ['cattle','bison']`.
- User changes the line's `commodityCode` to `'0101'` (horse). Legal species are now `['horse']`.
- `species` remains **in scope** (it has no gate), so `purgeStorage` keeps `{ line1: ['cattle','bison'] }` untouched.
- Nothing re-validates stored values on read. `hasFulfilment` (engine/index.js:326-343) only asks `!isBlankValue`. The task list shows the subsection **Fulfilled**. CYA prints "Cattle, Bison" on a horse line. The illegal value is only ever caught if the user happens to re-POST that page.

`obligations.md` half-owns this. §Staleness (:2159-2176) and §What's still open K (:2759-2774) discuss staleness — but frame it as *TTL / freshness of an answer over time*, never as *"the option list moved under a stored answer"*, which is the case actually live in this manifest. That gap is not in the deferred register.

**MODELLED? No. IMPERATIVE? No. This is ABSENT.** `structural = false` — but not cheap: closing it means either (i) the evaluator importing `domain` and running `validate()` over stored values during `evaluate()`, which inverts the deliberate D1 layering (`RECOMMENDATION.md` D1: domain is keyed by obligation id precisely so the two layers stay independent), or (ii) a re-validate sweep bolted into `contract.evaluateState`. Either is a design decision, not a build-loop chore.

---

## 5. Cross-frame and cross-collection conditionality — B's real asymmetric strength

**Can a condition depend on another collection's contents? YES, in both directions, and both are first-class in the pipeline.**

**(a) Collection → scalar (aggregation up).** `anyAllowListed` (helpers.js:101-120) reads across the *whole per-line map* and returns a scalar decision:

```js
// obligations.js:510-519 — a notification-level field gated on the CONTENTS of the lines collection
export const cph = {
  applyTo: anyAllowListed(
    commodityCode, CPH_REQUIRED_COMMODITIES,     // 17 codes
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false }
  )
}
```

Add one poultry line anywhere and a notification-level CPH question appears; delete it and the CPH answer is **purged** (`evaluator.test.js:666`). `containsUnweanedAnimals` (:546-555) does the same over a different 5-code list. This is exactly "a condition depending on another collection's contents", and it costs one line of manifest.

**(b) Parent-instance → child-instance (projection down).** This is the machinery gap `GAPS.md` Gap 1 was written to close, and it is the cleverest part of the evaluator. `applyTo` receives a **second argument** — `fulfilmentIdsByObligationId`, a `Map<groupId, instancePath[]>` enumerated **pre-purge** from raw storage (evaluator.js:71-84, `enumerateGroupPathsFromStorage`). `allowListed` uses it to project a depth-1 gate onto depth-2 instance paths:

```js
// helpers.js:204-209 — filterAndProject
const projectionPaths = fulfilmentIdsByObligationId?.get(projectionGroup.id) ?? []
const records = projectionPaths.filter((path) => passingKeys.includes(pathPrefix(path)))
return { inScope: records.length > 0, records }
```

```js
// obligations.js:631-639 — a per-UNIT field gated by its parent LINE's commodity code
export const passport = {
  within: unitRecord, status: 'optional',
  applyTo: allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, [passportReason])
}
```

The obligation author never touches storage layout or enumeration. **Nested-collection item-level conditionality works, per item, with mixed in/out within one collection** (`evaluator.test.js:797-811`).

**(c) Cross-sibling all-or-nothing.** Four notification-level fields share one `branchedGate` whose predicate reads a sibling (obligations.js:751-762). The condition is deliberately `documentTypePresent`, not "any of the four" — audit finding #15, and pinned by three route tests (`routes.test.js:739`, :769, :833).

**Expressiveness ceiling:** because `applyTo` is a closure receiving the *entire* fulfilments map, **any** condition over **any** obligation's storage is expressible — negation, union, intersection, counting, cross-collection joins. There is no gate B structurally cannot express. The limits are elsewhere: it is **sync** (no lookup/API-backed gate), it cannot see the **domain** layer (no gate on value-legality), it cannot see the **flow** layer (no gate on "has the user visited page X"), and the second argument carries **only group instance-paths**, nothing else.

### Negated gating (the `notInUnionOf` question from Side A's DESIGN-DELTA #7-#15)

B has it, and it is trivial — because there is no DSL to extend:

```js
// obligations.js:674-678 — "not in the union of four whitelists"
const noSpecificIdentifier = (code) =>
  !PASSPORT_COMMODITIES.includes(code) &&
  !TATTOO_COMMODITIES.includes(code) &&
  !EAR_TAG_COMMODITIES.includes(code) &&
  !HORSE_NAME_COMMODITIES.includes(code)

export const identificationDetails = {
  within: unitRecord, status: 'optional',
  applyTo: allowListedByPredicate(commodityCode, noSpecificIdentifier, unitRecord, [identificationDetailsReason])
}
```

A DSL needs a `notInUnionOf` operator added to the interpreter, tested, documented. B needs `!` and `&&`. **That is a genuine, structural expressiveness advantage of the closure model** — and the cost is stated in the next section.

---

## 6. The cost of the closure model, quantified

`allowListedByPredicate` exposes the predicate on the metadata so the browser layer can ask *"would this value be admitted?"* without evaluator state (helpers.js:83-88 — the **only** 6-line delta from the frozen EUDPA-277 ancestor). But exposing a *function* is not introspection: `data-dictionary-sketch.js:31-36` can **call** it, never **render** it.

Machine-readable **condition** coverage across the 44 obligations:

| | Count | Is the CONDITION machine-readable? |
|---|---|---|
| `allowListed` | 6 | **YES** — `metadata.values` is the array |
| `anyAllowListed` | 2 | **YES** — `metadata.values` is the array |
| `allowListedByPredicate` | 2 | **NO** — `metadata.predicate` is a live JS function; callable, not renderable, not serialisable |
| `branchedGate` | 9 | **NO** — `metadata` carries only `{type, whenTrue, whenFalse}` (helpers.js:135-139). **The predicate is not in the metadata at all.** You can see the two outcomes; you cannot see the condition. |
| bare `() => ({inScope: true, ...})` | 19 | **NO** — no `.metadata` ⇒ `scopeShape()` returns `{ kind: 'custom-applyTo' }` (data-dictionary-sketch.js:34), even though these are trivially always-in-scope |

**8 of 44 obligations (18%) expose a machine-readable gate condition.** The 9 `branchedGate` obligations — which include every purge-on-flip case in the manifest (`purposeInInternalMarket`, `commercialTransporter`, `privateTransporter`, `transitedCountries`) — are opaque to any tool, any cross-language port, any stakeholder-facing data dictionary. `obligations.md:556-557` concedes the general point (*"Custom applyTo closures with no metadata remain language-specific and would need a hand-port"*) but does not concede that `branchedGate`, a *helper*, is in the same boat.

Cheap partial fix (**structural = false**): add `predicate` to `branchedGate`'s metadata and give the 19 unconditional obligations an `alwaysInScope(status)` helper — takes the readable count from 8/44 to 17/44 and makes the dictionary honest. It still cannot *render* a closure. Only a DSL can.

---

## 7. Entry guard — ABSENT

Routes are generated unconditionally for every page in the flow (`routes.js:150-205`); there is no pre-handler, no scope check, no redirect. `grep "guard\|redirect" routes.js` → one comment about auth. A direct `GET /prototype/eudpa-249/pages/purpose-in-internal-market` when `reasonForImport = transit`:
- `buildFieldDescriptors` filters every entry out (:67) → the page renders with **zero fields** and a working "Save and continue" button.
- `validatePagePayload` iterates the same empty descriptor list (contract.js:228) → `values = {}` → `writeAnswer` writes nothing. **Safe, but not guarded.** No 404, no redirect to the task list.

Nothing in `routes.test.js` (40 cases) tests this. `structural = false` — a pre-handler calling `statusOfPage(page, state) === 'not-applicable'` closes it in about ten lines, and the primitive already exists.

---

## 8. Test coverage of this dimension

| File | Cases | Relevance |
|---|---|---|
| `obligations/evaluator.test.js` | 72 | The gate/purge suite. **~12 explicitly named `purges…`** (:302, :346, :354, :402, :574, :582, :666, :789, :797, :930, :1002) plus the negative :1141 (`does not purge … extended form whenFalse keeps inScope: true`). Runs against the **real** 44-obligation manifest. |
| `engine/index.test.js` | 63 | Status/NA/nav primitives on **synthetic** obligations — no V4 coupling. This is what makes NA-derivation independently testable. |
| `routes.test.js` | 40 | HTTP-level: option filtering, `mandatoryToProceed` vs effective-optional (:270, :305), the all-or-nothing block (:739/:769/:833). |
| `obligations/helpers.test.js` | 24 | The 4 gate factories in isolation. |

Coverage of *scope* gating is genuinely strong. Coverage of *the three holes* is zero: no test flips a gate false-then-true; no test changes a commodityCode after seeding a unit; no test narrows an option list under a stored value; no test hits an out-of-scope page URL.

---

## 9. Retrofit shopping list

**Worth stealing from B (into A, or into a third option):**
1. **The `{ inScope, status, records, reasons }` Decision shape.** One return type gives you hide-page, hide-field, status-swap, per-record wipe and a *reason code* for why. ~50 LOC of evaluator to interpret.
2. **`mandatoryWhen` vs `appliesWhen` as an explicit authoring choice** — i.e. *the wipe policy is a property of the obligation, declared at the gate*, not a global engine rule. Cost: near zero. Value: high.
3. **The pre-purge `fulfilmentIdsByObligationId` second argument** (evaluator.js:71-84). This is the thing that makes cross-identity-level gates (parent-line code gating child-unit fields) authorable in one line without the obligation touching storage layout. ~35 LOC.
4. **`anyAllowListed`** — collection→scalar aggregation gating, 20 LOC (helpers.js:101-120).
5. **`obligations/coverage.test.js`** (190 LOC) — orthogonal to this dimension but the cheapest thing on B.

**Do NOT take from B without fixing:**
- Persist the amended map, or explicitly design and test resurrect-on-return (§2.2).
- Give group instances first-class storage before adopting the "instance = union of descendant key prefixes" trick (§2.4) — otherwise a commodity-code change deletes animals.
- Decide what happens when an option list narrows under a stored answer (§4).

**What B would have to give up to take A's approach (a declarative gate DSL):** the `noSpecificIdentifier` negation, the cross-sibling all-or-nothing closure, and obligation-level testability without an interpreter — all three are named in `GAPS.md:62-86` as the reasons the DSL was killed. Any third option that reaches for declarative gates must answer those three by name.
