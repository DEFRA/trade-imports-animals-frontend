# L1 — Evaluation engine and semantics — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(`prototypes/model-spikes/obligations-v4-model/evaluator.js` is byte-identical to the fork — ignored.)

All paths below are relative to the flow-layer root unless stated.

---

## 1. Summary

Side B has **two evaluators, cleanly separated, and one leak**.

1. **The ObligationEvaluator** (`obligations/evaluator.js`, 519 LOC) — one closure-constructed object with a single method `evaluate(fulfilments)`. It answers exactly one question: *given raw storage, what is in scope, and what storage survives?* It is a fixed 7-step pipeline, pure, sync, total (never throws by itself), memoised within a call, and re-run from scratch on every request.
2. **The runtime primitives** (`engine/index.js`, 601 LOC, 15 standalone exported pure functions — no orchestrator object, decision D3). These take the *already-evaluated* state and answer navigation / status / options / validation questions. They never call the ObligationEvaluator.
3. **The leak**: `features/units/controller.js:186-214` re-implements gate evaluation by hand off the `.metadata` sidecar, because the ObligationEvaluator structurally cannot answer *"would obligation X be in scope for an instance that does not exist yet?"*. That is a genuine second, imperative, partial evaluator (it handles 2 of the 4 gate shapes).

The model layer is 100% pure: zero `async`, zero `await`, zero I/O, zero `Date.now()`, zero `Math.random()`, zero `process.env` anywhere in `obligations/`, `engine/`, `domain/` (grep). The only `new Date` in the three dirs is a deterministic calendar round-trip in `domain/index.js:315`. There is **not a single `try`/`catch` and not a single `throw` in the entire model + browser layer** (the only `throw` in the spike is `dump.js:47`, a CLI arg guard).

---

## 2. Mechanisms

### 2.1 The 7-step pipeline (`obligations/evaluator.js:60-127`)

`createObligationEvaluator({obligations})` does construction-phase work **once** — five derived index structures built from the manifest, all pure functions of it and all exported for isolation-testing:

| Structure | Fn | Line |
|---|---|---|
| `obligationsById` | `buildObligationsById` | :136 |
| `obligationChildren` (from `within` back-refs) | `buildObligationChildren` | :141 |
| `obligationsByCategory` (5-way) | `classifyObligations` | :166 |
| `obligationAncestorGroups` (root→parent chain) | `buildAncestorGroups` | :188 |
| `obligationDescendants` (transitive) | `buildDescendants` | :203 |

Then `evaluate(fulfilments)` runs, in fixed order, per call:

1. **Drop unknown ids** — `dropUnknownFulfilments` (:227). Tolerate-and-amend: storage keyed to an obligation no longer in the manifest is silently discarded.
2. **Pre-purge enumeration** — `enumerateGroupPathsFromStorage` (:244). For every `group`-category obligation, scan **all descendants' storage keys**, split on `/`, and take the first `ancestorGroups.length + 1` segments. That set *is* the group's instance list.
3. **Run every `applyTo`** — `runApplicabilityDecisions` (:278): `o.applyTo(recognisedFulfilments, preEnumeratedGroupPaths)`.
4. **Effective in-scope** — `makeInScopeCheck` (:301). Own decision AND every ancestor group's decision, recursively, memoised in a `Map` in the closure.
5. **Purge storage** — `purgeStorage` (:333).
6. **Post-purge re-enumeration** — `enumerateGroupFulfilmentIds` (:390), same algorithm as step 2 but over amended storage and filtered by `isInScope`.
7. **Build implications** — `buildImplications` / `buildImplication` (:427, :439).

Returns `{ fulfilments: amended, obligations: implicationsByObligation }`. That is the *only* output; every downstream primitive consumes this shape.

Steps 2 and 6 are the same enumeration run twice — deliberately, so `applyTo` sees pre-purge paths (step 2) while implications reflect post-purge reality (step 6).

### 2.2 Category dispatch — the engine's real branch table (`evaluator.js:166-185`)

Five categories, assigned once at construction, and they drive both purge and implication-building:

```js
if (o.indexedBy) { … 'derived-leaf' : 'user-leaf' }
else if (o.applyTo && o.within) → 'derived-leaf'
else if (o.status !== undefined && !o.applyTo) → 'field'
else if (obligationChildren.has(o.id)) → 'group'
else → 'single'
```

In the V4 manifest: 2 `group` (commodityLine, unitRecord), 4 `field` (commodityCode, commodityType, species, numberOfAnimals), 8 `derived-leaf` (numberOfPackages + the 6 per-unit identifiers + permanentAddress), 30 `single`, 0 `user-leaf` (`indexedBy` is dead in the fork — nothing declares it).

Purge semantics per category (:350-377):
- **Out of scope (any category)** → whole entry dropped.
- **`derived-leaf`** → keep only stored records whose key is in the `applyTo` decision's `records` array. `const fulfilmentIds = new Set(decision?.records ?? [])`.
- **`single` / `field` / `user-leaf`** → keep (ancestors already checked).

### 2.3 Scope is a closure, not data — `applyTo` (`helpers.js`)

`applyTo(fulfilments, fulfilmentIdsByObligationId) → Decision`. Four factory helpers build it, each attaching a `.metadata` sidecar so the closure is a function at runtime and a data structure for tooling:

| Helper | Line | Uses in V4 |
|---|---|---|
| `allowListed(gate, values, projectionGroup?, reasons?)` | :39 | 6 |
| `allowListedByPredicate(gate, predicate, projectionGroup?, reasons?)` | :65 | 2 |
| `anyAllowListed(gate, values, whenTrue, whenFalse)` | :101 | 2 |
| `branchedGate(predicate, whenTrue, whenFalse)` | :132 | 6 constructions → 9 obligations |
| `matches` | :147 | **0 — dead** |
| `present` | :165 | **0 — dead** |

Manifest arithmetic (44 obligations): 19 conditional `applyTo`, 19 trivial `applyTo: () => ({inScope:true, status:'mandatory'|'optional'})`, 6 with no `applyTo` (2 groups + 4 fields). Sums to 44.

The DSL was prototyped and **explicitly rejected** — `model-spikes/obligations-v4-model/GAPS.md:62-86`, 5 reasons, chief among them "testable at obligation level without other units — each `obligation.applyTo(fulfilments, ids)` is a plain function call with plain inputs. No evaluator, no resolver, no `obligationsById` to construct." That claim is **true and verifiable**: `coverage.test.js:187` literally calls `po.applyTo()` with zero arguments and asserts the decision.

Depth-N projection is the clever bit (`helpers.js:182-215`): `filterAndProject` filters the gate obligation's storage by predicate to get *passing keys* (line ids), then — if a `projectionGroup` is supplied — projects those down onto the group's instance paths by prefix match:

```js
const records = projectionPaths.filter((path) =>
  passingKeys.includes(pathPrefix(path)))
```

That is how a per-**line** commodity code gates a per-**unit** obligation without the obligation enumerating storage itself. It is the mechanism that makes cross-identity-level gating declarative-ish rather than hand-rolled per case.

### 2.4 Evaluation context — what a predicate can see

`applyTo` receives exactly two things:

1. `recognisedFulfilments` — **the entire raw answer set**, unpurged, flat, composite-keyed. Not scoped to the item. Not scoped to the frame.
2. `fulfilmentIdsByObligationId` — `Map<groupId, string[]>` of instance paths, pre-purge.

It receives **no** path/instance argument. `applyTo` is called **once per obligation for the whole state** (`evaluator.js:284-291`), not once per record. Per-record scope is expressed by *returning* a `records: string[]` array of the paths the obligation authorises. This is the single most consequential design fact on Side B and everything below follows from it.

Domain evaluation has a *richer* context. `engine/index.js:61-102` `validate(obligation, value, fulfilments, domain, ctx)` builds `predicateCtx = { fulfilments, path, siblingValue, ids }` — so a value-legality predicate sees the whole answer set, its own instance path, and a `siblingValue(obl)` reader that resolves at the same path. Exercised by `domain/index.js:492-502` (`speciesDomain` reads `ctx.path` → the line's commodityCode → that code's species list). Neither `optionsFor` nor `validate` can see the *implications* (scope decisions) — only stored values.

### 2.5 Status / group-invariant evaluation (`engine/index.js`)

Separate from the ObligationEvaluator entirely. `classifyEntries` (:386) is one 5-way classifier (NA / Optional / NS / IP / F) shared by `pageStatus` (:442), `containerStatus` (:469) and `journeyState` (:583). Container status is **re-derived from the subtree's in-scope entries**, not rolled up from child statuses (:469-474, and the comment at :456-467 gives the reason: 5-way roll-up precedence "gets fiddly").

Two distinct blank-ness signals, deliberately (:311-343, :412-432): `hasFulfilment` consults `domainEntry.isComplete` for address composites; `hasAnyInput` uses raw `isBlankValue`. A half-filled address is therefore IP, not NS, and not F. This is a genuinely subtle piece of semantics, coded once and shared at every level.

`groupInvariantErrors` (:512) is the only cross-obligation rule primitive: for `group.requires.anyOf`, one error per in-scope instance where no required leaf is filled *and* at least one required leaf is in scope (`if (inScopeLeaves.length === 0) continue` — vacuous truth is handled). Exactly **1** group invariant exists in V4 (`unitRecord.requires`, `obligations.js:581-593`). Errors are fed into the same classifier as an integer count (`classifyEntries(inScope, state, groupErrorCount)`) so one classifier serves every level — a neat encoding.

---

## 3. Findings — the semantics that matter

### F1. `applyTo` is evaluated for EVERY obligation, including ones whose ancestors are out of scope — no short-circuiting

`runApplicabilityDecisions` (:284) loops the whole manifest unconditionally. `isInScope` (step 4) only AND-s the results afterwards. Consequence: **every `applyTo` must be total and defensive against missing/undefined gate values**, because it runs even when its group is dead. All four helpers are (`filterAndProject`: `const stored = storedForGate ?? {}`). A hand-written `applyTo` that assumes its gate has a value would blow up on an empty session — and nothing in the model catches it (no try/catch anywhere).

### F2. Single-pass, not fixpoint — gates read PRE-purge storage

Step 3 runs all `applyTo`s against `recognisedFulfilments`; step 5 purges. So if obligation A is going out of scope this call, obligation B's gate — which reads A's *value* — still sees A's stale value **in the same call**. Convergence happens on the *next* `evaluate` (next HTTP request), because A's value is gone from persisted storage by then.

This is not documented anywhere (grep for fixpoint/cascade/converge/one-pass across the whole spike returns nothing on this topic), and it is **not exercised** by the V4 manifest: every gate obligation in V4 (`regionCodeRequirement`, `reasonForImport`, `transporterType`, `meansOfTransport`, `commodityCode`, `accompanyingDocumentType`) is itself either unconditionally in scope or a `branchedGate` that is `inScope: true` on both branches. So no two-hop purge chain exists today. The hazard is **latent, untested, and would bite the first time someone gates a gate**. Cheap to fix (iterate to fixpoint, or purge before running dependent gates); free to leave until a chain appears.

### F3. Instance existence is inferred purely from storage keys — the model has no concept of an empty instance

`enumerateGroupPathsFromStorage` (:244-271) derives a group's instances by scanning **descendant storage key prefixes**. No storage on any descendant ⇒ the instance does not exist ⇒ every page for it is NA ⇒ the user cannot reach a page to create the storage. Chicken and egg.

The workaround is the seed hack in `lib/state.js`: `addCommodityLine` (:97-118) writes `fulfilments[seedObligation.id][id] = ''` and `addUnitRecord` (:186-204) writes `fulfilments[seedObligation.id]['line1/unit1'] = ''` — an empty string, purely to make the instance visible to the evaluator. The comment is explicit: *"Seed a placeholder record for the line so the ObligationEvaluator recognises the line as existing."*

This is structural: it falls straight out of "identity is a composite storage key". An alternative model (an explicit instance registry: `instances: { commodityLine: ['line1'] }`) would not need it. It is a *cheap* consequence in practice — one line per add — but it has a nasty second-order effect (F4).

### F4. THE LEAK — a second, hand-rolled, partial gate evaluator in the browser layer

Because of F3, the unit "add" flow must answer *"which obligation should I seed?"* = *"which unit-scoped obligation would be in scope for this line's commodity code, given no unit exists yet?"*. The ObligationEvaluator cannot answer that — it only reports scope for instances that already exist. So `features/units/controller.js:186-214` opens the `.metadata` sidecar and **re-implements gate evaluation by hand**:

```js
const meta = obligation.applyTo?.metadata
if (!meta) continue
if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return obligation
if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return obligation
```

Three observations:
- It branches on `meta.type` — a **string tag** — so it handles `allowListed` and `allowListedByPredicate` only. A unit-scoped obligation gated by `branchedGate` or a hand-written `applyTo` (no metadata) is **invisible** to the seed picker and the line silently offers no "add animal" affordance.
- `helpers.js:83-88` (the 6-line diff from the frozen ancestor) exists *solely* to expose `predicate` on the metadata for this call site. The leak forced a change to the model layer.
- Same trick, same file, in `features/commodity-lines/controller.js` (conditionally emitting the "Manage animals" link).

This is the clearest instance of "handled imperatively" on Side B in this dimension, and it is caused directly by the evaluator's structure, not by laziness.

### F5. `records` are bare strings — no per-record status, and the `applyTo` decision's `status` is DISCARDED for every indexed obligation

`Decision.records` is `string[]` (`obligations.md:392-399`; `helpers.js:198-209` returns `records: passingKeys`, strings). `buildImplication` then maps each string to `{ fulfilmentId, status: obligation.status }` — **`obligation.status`, the static declaration**, not `own.status` from the decision:

- `field` (:473-479): `status: obligation.status`
- `derived-leaf` (:487-491): `status: obligation.status`
- `user-leaf` (:503-506): `status: obligation.status`
- `single` (:453-455): `return own ?? { inScope: true }` ← **only here does the decision's status survive**

Two consequences:
1. Dynamic status (the mandatory↔optional swap that `branchedGate` exists to express) works **only for notification-level singletons**. Return `{inScope:true, status:'mandatory'}` from an indexed obligation's `applyTo` and the status is silently thrown away. V4 never trips this (no indexed obligation uses `branchedGate`), so it is untested and unnoticed. Fixable with a one-line `own?.status ?? obligation.status` — **not structural**.
2. Even with that fix, **status cannot vary per record** — the Decision carries one status for all the records it returns. "numberOfPackages is mandatory on line 1 and optional on line 2" is inexpressible. Fixing *that* means changing the Decision shape to `records: Array<{fulfilmentId, status}>` and touching every helper + the 4 category branches in `buildImplication`. That is a model-shape change — **structural**, though a small one (~40 LOC).

### F6. `{inScope: true}` with no `records` on an indexed obligation = silent total data loss

`purgeStorage:353-355`: `new Set(decision?.records ?? [])` → empty set → every stored record filtered out → `if (Object.keys(filtered).length > 0)` fails → the obligation's entry is dropped from `amendedFulfilments` entirely. So for a `derived-leaf`, the truthful-looking decision `{inScope: true}` means *"purge everything"*. Nothing warns. A hand-written `applyTo` on an indexed obligation that forgets to return `records` destroys the user's answers on the next page load. The 4 helpers all get this right; the footgun is live for anything hand-written (which `GAPS.md:527-528` explicitly invites: *"For anything that doesn't fit a helper, hand-write applyTo as a plain closure"*).

### F7. Cycle handling is a TEST, not a runtime guard

`buildAncestorGroups` (:188-200) is `while (cur) { chain.unshift(cur); cur = cur.within }` — a self-loop or cycle in `within` **hangs the process**. There is no depth bound, no seen-set, no guard. The protection is `obligations/coverage.test.js:108-137`, which walks each chain with a seen-set and a depth-100 bound at *test* time. The test's own comment says it: *"Without this, a self-loop or a cycle in the manifest hangs the whole evaluator."* Honest and effective in CI; a hang in production if the manifest ever gets built dynamically. Cheap to harden — **not structural**.

### F8. Purity, determinism, totality

- **Pure**: no I/O, no clock, no randomness, no globals in `obligations/` + `engine/` + `domain/` (verified by grep). `obligations.md:457-459`: *"The ObligationEvaluator never performs I/O. Given the same inputs it always returns the same output."* — checked, true.
- **Deterministic**: iteration is `Object.entries` over storage and manifest-array order; `Set` iteration is insertion-ordered. Same input ⇒ same output including array ordering.
- **Total-ish**: the evaluator itself contains no `throw`. But it does not defend the boundary — `o.applyTo(...)` is called raw. A throwing `applyTo` (or a throwing domain predicate, called raw at `engine/index.js:100`) propagates straight out to the Hapi handler as a 500. Evaluation is total *given* total predicates; it does not *enforce* totality.
- **Memoisation**: only within a call (`makeInScopeCheck`'s `inScopeCache`, :305). `evaluate` itself is **not** memoised — `lib/state.js:42-44` `readState(request)` calls `evaluateState(readFulfilments(request))` fresh on every controller entry, and controllers call `readState` once each. So it's one full pipeline run per HTTP request. 44 obligations, no measured cost; fine at this scale, no caching layer exists.

### F9. Doc-vs-code check

I checked the doc's claims against the source. `obligations.md:343-369` (the 7-step algorithm), :392-418 (the Decision/Implication types), :420-429 (the ids map), :450-455 (field members synthesised from the group's instance ids using the field's own status) all **match the code exactly**, including the line references it cites. This is unusually honest documentation. The one thing the doc does *not* say is F2 (pre-purge gate reads / no fixpoint) — not a contradiction, an omission.

---

## 4. Declarative vs imperative — the ruthless split

| Capability | Verdict | Evidence |
|---|---|---|
| Scope (show/hide obligation) | **Imperative — a JS closure**, deliberately (GAPS.md:62-86). Introspectable only via a `.metadata` sidecar on 4 helper shapes; a hand-written `applyTo` is opaque. | `helpers.js:39-141`; `obligations.js` × 19 conditional |
| Cardinality / depth | **Declarative** — the `within` chain + composite `/` keys. Genuinely data-driven; the evaluator computes ancestor/descendant/prefix-length from the manifest with no hard-coded depth. | `evaluator.js:188-218, 256, 406` |
| Completion mandate (mandatory/optional) | **Declarative at rest** (`status` on the record) — but dynamic swap works for singletons only (F5) | `evaluator.js:453-506` |
| Status alphabet (NA/Opt/NS/IP/F) | **Declarative** — one 5-way classifier, one implementation, every level | `engine/index.js:386-410` |
| Group invariants (≥1 of N) | **Declarative** — `requires.anyOf` on the group, interpreted by `groupInvariantErrors` | `obligations.js:581-593`; `engine/index.js:512` |
| Page/section visibility | **Declarative — emergent.** flow.js declares NO visibility rules; a page is NA when all its obligations are out of scope. The spike's central claim, and it holds. | `engine/index.js:442-447` |
| Value legality (enums, predicates, address composites) | **Declarative shapes, imperative bodies** — 4 factories, closures inside | `domain/index.js:134-281` |
| "Would this gate open for a new instance?" | **Imperative, hand-coded, partial** (2 of 4 gate shapes) | `features/units/controller.js:204-214` |
| Cycle safety | **Test-time only** — runtime hangs | `coverage.test.js:108-137` |
| Cross-record aggregation (any-line-has-X) | **Declarative** via `anyAllowListed` × 2 | `helpers.js:101`; `obligations.js:513, 549` |
| Order-dependent / fixpoint gates | **Absent** — single pass, gates read stale values | `evaluator.js:80-99` |
| Per-record status variation | **Absent — structurally** | `Decision.records: string[]` |

---

## 5. Test rigour on this dimension (the strongest thing on Side B)

| File | Cases | What it pins |
|---|---|---|
| `obligations/evaluator.units.test.js` | **61** | One `describe` per exported pipeline stage — all 12 of them (`buildObligationsById`, `buildObligationChildren`, `classifyObligations`, `buildAncestorGroups`, `buildDescendants`, `dropUnknownFulfilments`, `runApplicabilityDecisions`, `makeInScopeCheck`, `purgeStorage`, `enumerateGroupFulfilmentIds`, `buildImplications`, `buildImplication`). The pipeline is testable stage-by-stage because every stage is an exported pure function. |
| `obligations/evaluator.test.js` | **72** | Integration over the real V4 manifest: purge-on-flip, retain-value, mixed-line projection, inverse gates, depth-2 unit gating, CPH aggregation, the accompanying-document all-or-nothing block. |
| `engine/index.test.js` | **63** | Runtime primitives over **synthetic** obligations — no V4 coupling. This is what D3 (standalone functions, no orchestrator) buys. |
| `obligations/helpers.test.js` | **24** | The 4 gate factories in isolation. |
| `obligations/coverage.test.js` | **8** | The anti-add-and-forget gate + cycle detection + id/name uniqueness. |
| **Total on this dimension** | **228** | |

`docs/testing.md` additionally carries a **mutation register (mutations 1-11)** naming the specific ways the model could silently rot, with the test that catches each. I did not find an equivalent artefact anywhere.

---

## 6. What Side A should steal, and what it costs

1. **`coverage.test.js` whitelist gate** (190 LOC, near-zero cost). Every obligation is wired to a domain entry or explicitly allow-listed *with a written reason*. Plus cycle detection and id/name uniqueness. Portable to any model in an afternoon.
2. **Stage-by-stage exported pipeline** (`evaluator.js` exports all 7 steps + 5 builders). Cost: an export list. Buys 61 unit tests that pin the engine's internals without constructing a world.
3. **The `.metadata` sidecar on gate closures** — "the closure is a function at runtime and a data structure for tooling". Cost: one property per helper. Buys `data-dictionary-sketch.js` (98 LOC, stakeholder-facing dictionary derived entirely from metadata, declaring no rules of its own). **But note it is also how the leak (F4) happened** — metadata invites the browser layer to re-evaluate gates itself.
4. **One classifier, every level** (`classifyEntries`) + **container status re-derived, not rolled up**. Cost: none. Removes an entire class of roll-up precedence bugs.
5. **The `hasFulfilment` vs `hasAnyInput` distinction** for composites. Cost: two functions instead of one. Buys correct NS↔IP on half-filled addresses.

What Side A should *not* steal without fixing: F2 (single-pass gates), F6 (`{inScope:true}` = purge-all footgun), F7 (runtime cycle hang), F5 (discarded decision status).

---

## 7. Structural vs merely-unbuilt

**Structural (needs a model change):**
- No per-record status. `Decision.records: string[]`.
- Instance existence == storage existence (⇒ the seed hack, ⇒ the F4 leak).
- Scope is a closure ⇒ not serialisable, not cross-language exportable, not statically analysable except through the metadata sidecar, which only 4 shapes carry.
- Depth is data-driven in the *evaluator* but hard-coded in the *browser layer* (3 parallel `firstUnfulfilledPageFor*` in `engine/index.js:128, 149, 182` — one per depth). The engine would handle depth 3; the seam would not.

**Not structural (a build loop closes these cheaply):**
- Single-pass / no fixpoint (F2).
- Discarded `own.status` on indexed obligations (F5.1) — one line.
- Runtime cycle guard (F7).
- `{inScope:true}`-purges-everything footgun (F6) — one warning/assertion.
- No try/catch boundary around `applyTo` / domain predicates.
- `matches` and `present` helpers are dead code.
- `indexedBy` / `user-leaf` category is dead code in the fork (nothing declares `indexedBy`).
- `engine/index.js` half-injects `domain` (params at :41, :61) and half-imports it (:27, used at :319) — inconsistent, harmless, trivially fixed.
