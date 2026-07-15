# L3 — code-shape — C2 — ADVERSARIAL VERIFICATION

**CLAIM (C2):** "REFUTES THE L1-A READ AND THE STANDING PRIOR: A's activation model is closed DATA; B's is open CODE. Both are non-serialisable, and B is the worse of the two — only ~20% of B's manifest is statically exportable, versus A being one pointer→id substitution from JSON."

**VERDICT: AMENDED.** The half that corrects L1-A survives. The half that ranks B below A does not — it collapses under a counter-example hunt.

---

## 1. What I verified as TRUE

**A's activation model is closed data.** Verified.
- `engine/evaluate/predicate.js:12-28` — `applyPredicate` handles exactly `equals` / `includes` / `notInUnionOf` / `present`, and `throw`s on anything else. Quote is real and means what the claim says.
- `grep -rn "=>" features/*/obligations.js` returns **only two hits**, both object-returning factories (`commodities/obligations.js:25` `enclosingCommodity`, `:62` `enclosingCommodityNotInUnionOf`). **Zero functions survive into any A obligation object.**
- The full key census across all 12 A obligation files: `id`, `required`, `activatedBy`, `wipeOnExit`, `enforcedAt`, `collection`, `item`, `requiredAtLeastOne`, `requiredOneOf`, `maxEntriesFrom`. All data or live pointers. The pointer→id rewrite to JSON is a real, bounded path.

**B's `applyTo` is a closure.** Verified — `obligations/helpers.js:39-57` returns `fn` with a `.metadata` sidecar. Quote is real.

**L1-A was wrong to call A's non-serialisability "the sharpest asymmetric limitation on side A."** Correct — it is not an asymmetry, because neither side has a serialised model today. That correction is the claim's genuine contribution and it stands.

---

## 2. What REFUTES the claim's central assertion ("B is the worse of the two")

### 2a. The 80% "impossible" denominator is padded with zero-information rows

Of B's **44** manifest obligations (`obligations.js:793-837`):
- **19** are bare `applyTo: () => ({inScope: true, status: 'mandatory'})` (one is `'optional'`, :383)
- **2** have **no `applyTo` at all** (`commodityLine` :408, `unitRecord` :567 — "structural group, always in scope")

That is **21 of 44 = 48% of the manifest that are constant functions with no free obligation reference whatsoever.** They contribute **zero edges** to a dependency graph. Counting them as "not statically exportable" is a denominator trick: the information content being "lost" is nil, and the fix is a three-line `always()` helper. The claim's own headline metric is dominated by rows that have nothing to export.

### 2b. THE COUNTER-EXAMPLE — every gate B actually uses is inside A's closed vocabulary

I read every non-constant `applyTo` in B's manifest. **Not one of them needs open code.** Mapping each to A's four operators:

| B obligation | file:line | B's predicate | A operator |
|---|---|---|---|
| `regionCode` | `obligations.js:194` | `fulfilments[regionCodeRequirement.id] === 'yes'` | **equals** |
| `purposeInInternalMarket` | `:217` | `=== 'internal-market'` | **equals** |
| `commercialTransporter` | `:283` | `=== 'commercial'` | **equals** |
| `privateTransporter` | `:297` | `=== 'private'` | **equals** |
| `transitedCountries` | `:338-339` | `LAND_TRANSPORT_MODES.includes(...)` | **includes** |
| accompanying-document block (×4) | `:751-762` | `isFilled(fulfilments[accompanyingDocumentType.id])` | **present** |
| `identificationDetails`, `description` | `:676-678, 685, 698` | `noSpecificIdentifier` = `!PASSPORT.includes(c) && !TATTOO.includes(c) && !EAR_TAG.includes(c) && !HORSE_NAME.includes(c)` | **notInUnionOf** — literally A's fourth operator, spelled out |
| `allowListed` ×6, `anyAllowListed` ×2 | — | already full data metadata | equals/includes |

**B's closures are open in principle and closed in practice.** The claim's picture — B reaching for unbounded expressiveness and paying for it in analysability — is not what the source shows. B pays the analysability cost and buys nothing with it that A's four operators don't already cover.

### 2c. B already ships the machinery to close the gap, unused

- `helpers.js:147-154` — **`matches(gateObligation, value)`** emits `fn.metadata = {type:'matches', obligation, value}`. **Zero uses in the manifest** (`grep "matches(" obligations.js` → no output).
- `helpers.js:165-175` — **`present(obligation)`**. **Zero uses in the manifest.**
- `helpers.js:132-141` — `branchedGate` drops its predicate's metadata on the floor. Passing `predicate.metadata ?? null` through is a **one-line** change.

Rewriting the 5 branchedGate predicates as `matches(...)` / `present(...)` + one line in `branchedGate` restores **100% of the dependency graph**. This is "nobody wired it up", not "the model cannot express it" — precisely the failure mode the brief flags as most damaging.

### 2d. B's own domain layer already declares dependencies as data

`domain/index.js:151` attaches `entry.metadata.readsFrom` — a declared cross-obligation dependency, pinned by a test (`domain/index.test.js:172`: `expect(purposeInInternalMarketDomain.metadata.readsFrom).toEqual([...])`). The exact idiom L2 says B "structurally cannot have" is already in B's codebase, one layer over. It is a convention gap, not a structural one.

### 2e. B's metadata is load-bearing in production; A's export path is vapour

- B: `features/commodity-lines/controller.js:110` and `features/units/controller.js:204` both read `obligation.applyTo?.metadata` **instead of executing the closure**. `data-dictionary-sketch.js:33` is a working static-export sketch, pinned by `sketches.test.js:118`.
- A: there is **no exporter and no loader**. `spec/journey-spec.json` (2,014 lines) is upstream documentation nothing reads at boot (L1-A §2.2 confirms). A's "one substitution from JSON" is a rewrite **nobody has done**.

**The claim credits A for an unbuilt-but-easy capability and charges B for an unbuilt-but-easy capability.** Both are at "not built". That asymmetry of charity is the whole of the "B is worse" verdict.

---

## 3. The asymmetric capability the claim MISSES — and it runs B's way

The real difference is not operator count. It is **return type**.

- **A:** `applyPredicate` returns a **boolean** (`predicate.js:12-28`). `required` is a **static boolean** read off the obligation — `engine/status.js:24`: `partRequired = Boolean(obligation?.required || obligation?.requiredAtLeastOne)`; `complete.js:54`: `!subObligation.required || isAnswered(...)`. **A has no conditional-`required` in its vocabulary at all.**
- **B:** `applyTo` returns a **decision** — `{inScope, status, reasons, records}`.

Consequence, with a live carrier on both sides:

| | A | B |
|---|---|---|
| `regionCode` when requirement = 'no' | `region-of-origin/obligations.js:13-16` — `activatedBy: {equals:'yes'}, required: true, wipeOnExit: true` → **out of scope AND purged** | `obligations.js:190-198` — `branchedGate(..., {inScope:true, status:'mandatory'}, {inScope:true, status:'optional'})` → **in scope, optional, value retained** |

B's comment at `:186-189` cites the V4 spec explicitly: *"Stored values are kept across gate flips (V4 spec: the field itself is not purged on `no`)."* **A cannot express this in its model.** Its activation gate is binary in-scope/out-of-scope and its `required` is static — mandatory↔optional status-swap with value retention requires an *engine change*, not a new operator. Same for the accompanying-document all-or-nothing block (`obligations.js:754-786`), which A models as four flat `required: true` fields in a `documents` collection. B also carries machine-readable `reasons` on every gate decision; A's vocabulary has no such key.

**So on the axis the claim picks — model expressiveness vs analysability — the concrete, spec-mandated capability gap runs B → A, not A → B.** A's closed vocabulary is not free; it costs a behaviour the V4 spec actually asks for.

## 4. A is also less pure than the claim implies, outside `activatedBy`

- `flow/flow.js:72` — `gate: (scope) => scope.readyForCheckYourAnswers` — **a raw closure sitting in A's own flow manifest**, and `readyForCheckYourAnswers` is itself a function injected at boot (`engine/read.js:7`, `configureReadyForCheckYourAnswers`). A's *journey* manifest is not pure data either.
- A's "closed vocabulary throws on unknown" discipline is enforced in **1 of 3** readers of `activatedBy`: `applyPredicate` throws, `analysis/reachability.js:36-45` silently returns `undefined`, and controllers read `activatedBy.includes` / `.notInUnionOf` raw.

---

## 5. Census corrections to the evidence as offered

- `allowListedByPredicate`: claim says **3**; actual is **2** (`obligations.js:685, 698`).
- `branchedGate`: claim says **6**; actual is **5 constructions** (`:193, 216, 282, 296, 337`) plus one shared `accompanyingDocumentBlockApplyTo` (`:754`) carried by **4** obligations (`:767, 773, 779, 785`) — so 6 constructions / **9 obligations**. Directionally fine.
- The 19 bare arrows and the helpers.js line numbers are all accurate. `GAPS.md`'s "Custom one-off applyTos just omit metadata" concession is real (verified in the `model-spikes/obligations-v4-model/GAPS.md` gatedBy section).

---

## 6. What survives

**True and useful:** L1-A overstated. Non-serialisability is not an A-only structural limitation — *neither* model is serialised today, and A's obligation objects being pure data is a genuine, verified structural advantage in *kind*.

**False:** "B is the worse of the two." "Only ~20% of B's manifest is statically exportable" is a padded denominator. "Impossible for ~80% of the manifest at any cost" is flatly wrong: **every gate predicate in B's manifest is expressible in A's own four operators**, B already ships two unused data-shaped helpers (`matches`, `present`) and a `readsFrom` precedent in its domain layer that close the gap, and the fix is a one-line `branchedGate` metadata passthrough plus five predicate rewrites. That is a **wiring omission of ~30 LOC**, not a structural incapacity — and it is precisely the "★ mandatory `.metadata` with declared `dependsOn`" item L2 §7 already scores as the highest-value synthesis on the whole list. L2 cannot both cost that fix at ~30 LOC *and* call the thing it fixes structural.
