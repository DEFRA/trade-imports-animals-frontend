# L3 adversarial verification — OV-5 (obligation-vocabulary)

**Verdict: AMENDED.** The claim's *conclusion* (B has a declarative, obligation-keyed value-domain layer that A lacks; it is additive; it belongs on the shopping list) survives. Its two *sharpest supporting assertions* — "NO value-legality layer at all" and "a typo in a gate string silently de-activates a conditional field and no test fails" — are both **false on the source**, and the second is false for the very example the claim cites.

---

## 1. The cited evidence is real (all quotes verified)

| Citation | Status |
|---|---|
| `features/origin/obligations.js:15` — `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` | ✅ verbatim |
| `features/origin/template.njk:42` — `{ value: "yes", text: "Yes", ... }` | ✅ verbatim |
| `features/origin/controller.js:33` — `oneOf('regionOfOriginCodeRequirement', ['yes', 'no'])` | ✅ verbatim |
| `spec/journey-spec.json:600-603` — `"activatedBy": { "obligation": "regionOfOriginCodeRequirement", "equals": "Yes" }` | ✅ verbatim, capital-Y confirmed |
| `contract.test.js` checks committed **ids**, not values | ✅ true as stated (`committedIds` at :43-46 compares id sets only) |
| B: `domain/index.js:1150-1194` — 40-entry `Map` keyed by obligation id | ✅ verified, ~40 entries, keyed `[obligation.id, obligationDomain]` |

`grep -rn "journey-spec"` over all of A's `*.js` returns **nothing** — the spec is read by no runtime or test code. So the capital-`"Yes"` is a real drift, but between a **build-time input artifact** and the code, not a live fourth copy. It proves there is no spec↔code conformance check; it does *not* prove a runtime hazard.

## 2. THE REFUTATION — a gate typo in A does **not** fail silently. It goes RED.

The claim's operational payoff sentence is the thing I set out to break, and it breaks cleanly. A has an **emergent** value-legality check built from three parts that the claim's author did not connect:

1. **`engine/evaluate/reconcile.js:32-39`** — any obligation with `wipeOnExit` that falls **out of scope** while holding an answer is added to `wiped`.
2. **`engine/write.js:11-18`** — `commit()` runs `reconcile(answers)` then `destroyWiped(answers, wiped)` on **every page POST**. De-activation is destructive, not cosmetic.
3. **`contract.test.js:173-181`** — asserts each page commits **exactly** its `collects` set. And `shared/kit.js:27-30` — `collectsFrom` includes conditional obligations unconditionally (it only filters `system`).

Trace the claim's own example with a hypothetical typo `equals: 'yez'`:

- contract.test origin case (`:63-71`) posts `regionOfOriginCodeRequirement: 'yes'`, `regionOfOriginCode: 'FR-75'`.
- `applyPredicate` (`predicate.js:13`) is strict `===` → `'yes' === 'yez'` → **false** → `regionOfOriginCode` out of scope.
- `regionOfOriginCode` has `wipeOnExit: true` (`origin/obligations.js:16`) and *is* answered → **wiped** → `destroyWiped` deletes it.
- `committedIds` therefore omits `regionOfOriginCode`; `committableCollects` still expects it.
- **`Should commit exactly the committable collects for origin` FAILS.**

And a second, independent test pins the literal by name:

> `engine/evaluate/reconcile.test.js:38-50` — *"Should reveal and wipe regionOfOriginCode with the requirement answer"*
> `expect(reconcile({ regionOfOriginCodeRequirement: 'yes' }).inScope.has('regionOfOriginCode')).toBe(true)`

This is exactly the "nothing checking agreement" that the claim says does not exist. Note it would *also* catch the spec's capital-`'Yes'` if anyone copied it into the code.

**This holds for every literal gate in A — there are only four, and all four are covered:**

| Gate | Literal site | wipeOnExit | Test that goes red on a typo |
|---|---|---|---|
| `regionOfOriginCode` | `equals: 'yes'` | ✅ | `reconcile.test.js:38-50` + `contract.test.js` origin case |
| `commercialTransporter` | `equals: 'Commercial'` | ✅ | `reconcile.test.js:13-25` |
| `privateTransporter` | `equals: 'Private'` | ✅ | `reconcile.test.js:13-25` |
| `purposeInInternalMarket` | `equals: 'internalMarket'` | ✅ | `contract.test.js:78-84` (seeds `internalMarket`, expects the commit) |
| `transitedCountries` | `includes: ['Railway','Road Vehicle']` | ✅ | `contract.test.js:113-119` (seeds `Road Vehicle`, expects the commit) |

There is no A gate whose typo passes the suite. The claim's central failure mode does not exist.

## 3. Second refutation — "the same value domain is written three times" is not the general case

I enumerated **every** gate in A (`grep -rn "equals:\|includes:\|present:\|notInUnionOf:" features/**/obligations.js`, 9 sites). The majority are **not literals at all** — they are calls into a shared service, so the gate domain and the widget/validator domain are *the same expression*:

- `features/commodities/obligations.js:15,33,39,45,51,83` — `includes: commodities.packageCountCommodities()` / `passportCommodities()` / `tattooCommodities()` / `earTagCommodities()` / `horseNameCommodities()` / `permanentAddressCommodities()`
- `features/additional-details/obligations.js:12` — `includes: commodities.unweanedCommodities()`
- `features/cph-number/obligations.js:10` — `includes: commodities.cphCommodities()`

and the **controllers call the identical function** (`additional-details/controller.js:17`, `consignment-details.controller.js:18`, `cph-number/controller.js:16`). One source, zero drift surface. Same for the validators: `transporters.controller.js:13` is `oneOf('transporterType', transportReference.transporterTypes())` — **service-sourced, not a literal**; `origin/controller.js:30` derives the `countryOfOrigin` domain from `countries.originCountries()`, the *same* call that builds the select items at `:21`. `controller.test.js:115-146` explicitly pins that single-sourcing ("Should validate against the list as primed at POST time, not as imported").

So for `transporterType` the domain is written **twice** (obligation literal + njk literal), with the validator side service-derived — not three times. And a njk-side typo is caught anyway: the posted value fails `oneOf` and surfaces as a validation error.

**A structural point in A's favour that B's static map cannot match:** `features/commodities/obligations.js:62-78` — `notInUnionOf: TYPED_ANIMAL_IDENTIFIERS`. The "else" branch's value set is **computed as the complement of the other obligations' gates**, so it is *incapable* of drifting when a commodity moves between branches. A 40-entry hand-maintained `staticEnum` map has to be *edited* to stay correct in that situation. This is a genuine asymmetric capability for A on the narrow question of drift-resistance.

## 4. What survives — the real, defensible gap

A's value-legality layer exists but lives in **the wrong place**: it is in the controller's `fields()` (`lib/validate` `oneOf`/`requiredOneOf`), **not on the obligation**. The registry cannot answer *"what values may obligation X take?"* Nothing that reads the model — a CYA renderer, a mapper, a widget-deriver, a coverage tool — can see the domain; only the page that happens to own the field can. B's `domain` Map keys legality **by obligation id**, so every model-reader gets it for free, plus the extras A has no analogue for at all:

- `computedEnum` with `readsFrom` (`domain/index.js:148`) — declares *which sibling obligations* a dynamic domain depends on. A's `countries.originCountries()` has this dependency too, but it is invisible to the model.
- `predicate` with `reasons[]` (`:163`) — enumerates every failure code a closure can emit. A's validators produce free-text messages with no enumerable failure set.
- `addressBlock` (`:197`) — a reusable composite value-shape; A re-types address fields per page.

That is what belongs on the shopping list, and it is **additive** — a parallel `domain` map keyed by obligation id would drop into A's registry without touching the engine. The claim is right about that.

## 5. Did the claim conflate "not built" with "cannot be built"?

No — it explicitly says "MISSING from A, not impossible... it is additive". Credit where due; that part is correctly framed. The overreach is in the *cost* half of the claim ("and pays for it"), which asserts an unchecked-drift hazard that the source shows is checked.

## What I searched

- Read all 4 cited A files at the cited lines; read `spec/journey-spec.json:585-614`.
- `grep -rn "journey-spec" --include="*.js"` → **no hits**; the spec is not loaded by any code.
- `grep -rn "equals" --include="*.js" --include="*.njk"` across A → 7 files; read each gate.
- `grep -rn "equals:\|includes:\|present:\|notInUnionOf:" features/**/obligations.js` → all 9 gate sites enumerated.
- `grep -rn "wipeOnExit\|activatedBy" engine/` → found `reconcile.js`; read it, `write.js`, `predicate.js`.
- `grep -rn "reconcile"` across A → found `reconcile.test.js`; read it in full (**the counter-example**).
- Read `contract.test.js` in full, `features/origin/controller.test.js`, `shared/kit.js:27-30`.
- `grep -rn "packageCountCommodities\|passportCommodities\|unweanedCommodities\|cphCommodities"` → proved obligation and controller share one service call.
- `grep -rn "oneOf" transporters.controller.js import-purpose/controller.js` → proved validator domains are service-sourced.
- B: read `domain/index.js:1140-1194` → 40-entry obligation-id-keyed Map confirmed.
