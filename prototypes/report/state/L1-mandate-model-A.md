# L1 — Mandate model — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals`, root `prototypes/standalone/live-animals/` (HEAD b6ac2ed).
All paths below are relative to that root unless stated.

## Verdict in one paragraph

A's mandate model is **two-level and mostly declarative, but the two levels are enforced in two entirely different places and are not linked to each other**. The *completion* mandate (`required`, `requiredAtLeastOne`, `requiredOneOf`) is pure data, read by the engine in exactly **five lines across two files**, and it drives the whole hub status roll-up and the submit gate. The *proceed* mandate (`enforcedAt: 'continue'`) is also data, but the engine only uses it to derive **flow sequencing** (which later steps are reachable) — it does **not** make the field save-blocking. The actual "you cannot Save and Continue without this" behaviour is hand-coded per page as a Joi `requiredOneOf`/`requiredText` rule (3 controllers) plus one hand-rolled `if` (1 controller), and **the set of hard-blocked fields and the set of `enforcedAt: 'continue'` obligations overlap in exactly one member** (`countryOfOrigin`). "Optional" and "not-applicable" *are* cleanly distinguished (two distinct statuses out of five). Mandate cannot be relaxed by context in any declared way — but it doesn't need to be, because `required` never blocks a save in the first place: draft-save-anything is the default, and the only hard mandate surface is submit.

---

## 1. The declarative vocabulary

Three mandate keys, out of a max-11-key obligation vocabulary (`docs/obligation-model.md:16-28`):

| Key | Meaning | Where interpreted | Live carriers |
|---|---|---|---|
| `required: true` | this answer is owed for completeness | `engine/status.js:24`, `engine/evaluate/complete.js:54` | **32** |
| `requiredAtLeastOne: true` | a collection owes ≥1 entry | `engine/evaluate/complete.js:65` | **2** (`commodityLines`, `animalIdentifiers`) |
| `requiredOneOf: [ids]` | each entry of a collection owes ≥1 answer among a **named subset** of its `item` fields | `engine/evaluate/complete.js:15-22` | **1** (`animalIdentifiers`, over a 6-member group) |

Plus one *level* key:

| Key | Meaning | Where interpreted | Live carriers |
|---|---|---|---|
| `enforcedAt: 'continue'` | blocks **later flow steps** until answered | `flow/prerequisites.js:11` (the ONLY reader in the codebase) | **2** (`countryOfOrigin`, `commoditySelection`) |

`enforcedAt: 'submit'` is never written in any obligation file — it is the *absence* of `enforcedAt` (DESIGN-DELTA.md:167-171: "the default reading for every other required obligation … feeds submit-readiness only"). The spec carries it explicitly on ~40 obligations (`spec/journey-spec.json`), the running model does not. So the model is really "continue-level" vs "default".

**Mandate read sites in the engine — 5 lines, 2 files.** Verified by grep over `engine/`, `flow/`, `analysis/`, `shared/kit.js`:

- `engine/status.js:23-24` — `const isRequiredObligation = (obligation) => Boolean(obligation?.required || obligation?.requiredAtLeastOne)`
- `engine/evaluate/complete.js:54` — `return !subObligation.required || isAnswered(entry?.[subObligation.id])`
- `engine/evaluate/complete.js:65` — `if (obligation.requiredAtLeastOne && entries.length === 0) return false`
- `engine/evaluate/complete.js:15-21` — the `requiredOneOf` group check
- `flow/prerequisites.js:11` — `if (obligation.enforcedAt !== 'continue') continue`

Nothing else in the engine, flow layer, kit or analysis reads a mandate key. That is genuinely tight.

## 2. required / optional / not-applicable — the five-status roll-up

`engine/status.js:5-9` defines five statuses: `NA`, `NOT_STARTED`, `IN_PROGRESS`, `FULFILLED`, `OPTIONAL`. `statusOf(parts, answers, inScope)` (`status.js:59-79`) is the single roll-up:

```js
const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
if (inScopeParts.length === 0) return NA
const required = inScopeParts.filter(partRequired)
if (required.length === 0) { ...OPTIONAL / IN_PROGRESS / FULFILLED... }
```

- **NOT_APPLICABLE** = nothing the part covers is in scope. Scope is derived on every read/write by `engine/evaluate/reconcile.js:6-30` from `activatedBy`. So NA is a *derived consequence of conditionality*, never authored.
- **OPTIONAL** = in scope, but nothing required. Untouched → `OPTIONAL`; once ≥1 answer exists it tracks `IN_PROGRESS`/`FULFILLED` by completeness (`status.js:64-70`).
- These are **distinct in the model, in the roll-up and in the UI**: `features/hub/controller.js:121-133` maps `FULFILLED→"Completed"`, `OPTIONAL→plain "Optional"` (no tag), `IN_PROGRESS→light-blue`, `NOT_STARTED→blue`, and a gated-out row → grey **text** "Cannot start yet" with no link; `hub/controller.js:156` drops a `conditional: true` row entirely when its status is `NA`.

This is the strongest part of A's mandate model: **optional ≠ not-applicable** is a first-class distinction all the way from data to tag, and it exists because of a real bug (DESIGN-DELTA.md:206-218 — a blank optional `documents` section used to read "Completed" and count towards "X of N").

## 3. Conditional mandate ("required only when X") — fully declarative

`required: true` + `activatedBy: {...}` + `wipeOnExit: true` is the whole idiom. Live examples:

- `features/transport/obligations.js:17-25` — `transitedCountries` required only when `meansOfTransport` ∈ `['Railway','Road Vehicle']`.
- `features/transport/obligations.js:29-47` — `commercialTransporter` / `privateTransporter`, `equals`-gated branches, both `required: true`.
- `features/import-purpose/obligations.js:3-8` — `purposeInInternalMarket` required only when `reasonForImport === 'internalMarket'`.
- `features/cph-number/obligations.js:4-13` — `countyParishHoldingCph` required when **any** commodity line's `commoditySelection` is in the CPH list (`frame: 'anyItem'`) — a cross-frame conditional mandate.
- `features/commodities/obligations.js:80-85` — `permanentAddress`, required per identifier record but only when the **enclosing** commodity line's selection is in the permanent-address list (`frame: 'enclosing'`).

**15 obligations carry `activatedBy`, and all 15 carry `wipeOnExit: true`.** The mandate switching off destroys the stored answer, so an out-of-scope answer can never satisfy a group check later (proven for the `requiredOneOf` case at `engine/evaluate/cross-frame.test.js:279`).

The conditional-mandate operator set is exactly four (`equals`, `includes`, `present`, `notInUnionOf`), all interpreted in `engine/evaluate/predicate.js` (69 LOC). Anything richer is out of the model by design — `docs/obligation-model.md:139-143`: *"Anything that needs real branching — arithmetic, multi-condition logic, external state — belongs in a page controller. That is the pressure valve."*

## 4. At-least-one-of group mandates

Two distinct group forms, both declarative:

1. **Collection floor** — `requiredAtLeastOne` (`complete.js:65`). Carried by `commodityLines` and by the nested `animalIdentifiers` (`features/commodities/obligations.js:108,123`), so "at least one identifier record per commodity line" is expressed structurally rather than as a rule.
2. **Sibling group** — `requiredOneOf: [id, ...]` over a **named subset** of an entry's `item` fields, each of which stays individually optional (`complete.js:14-22`). The one live carrier is `ANIMAL_IDENTIFIER_GROUP` — 6 of the 7 fields of an identifier record (`features/commodities/obligations.js:87-109`); `permanentAddress` is the 7th and is separately `required` + gated.

There is a subtlety worth stealing: `entryComplete` takes an optional `includesMember` filter, and the group check is only applied if the filter's member set actually **owns** a group member (`complete.js:13-18`, `groupOwned`). That is what lets the hub split one stored collection across two task rows (a "facet", `flow/task-rows.js:29,36`) without one facet falsely failing the other's group mandate. `engine/status.test.js:66-91` pins the facet/whole agreement.

**Conspicuously absent:** no `requiredAtMostOne`, no `mutuallyExclusive`, no arity (`requiredNOf`), no group at the *root* level (the group is a property of a collection, so two top-level fields cannot be "one of these two"). Adding a root-level group needs a new key and a new reader.

## 5. "Required to proceed" vs "required to submit" — the honest picture

The spec ruled a two-level mandate (`spec/conflicts.json:215-216`: *"countryOfOrigin and commoditySelection are enforcedAt=continue … every other required obligation is enforcedAt=submit"*). The code implements the **sequencing half** of that ruling and hand-codes the **blocking half**.

**Half 1 — sequencing (declarative, derived).** `flow/prerequisites.js:8-26` walks the structural catalogue, picks the `enforcedAt: 'continue'` obligations, finds each one's owning page via the dispatch index, and returns those owned by a **strictly earlier** flow step. `flow/gates.js:21-28`:

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return (
    prerequisitesMet(pagePrerequisites(page.id), scope) &&
    inScopeReachable(collectsOf(page.id), scope)
  )
}
```

So origin is always open; commodities opens once `countryOfOrigin` is answered; everything after commodities opens once **any** line's `commoditySelection` is answered (`scope.answered` is instance-aware — `engine/read.js:18-25`). **There is no hand-authored prerequisite graph anywhere in the codebase.** That is a genuinely strong, genuinely declarative result: 2 data facts generate the whole "Cannot start yet" behaviour of an 11-row hub.

**Half 2 — save-blocking (imperative, unlinked).** Nothing reads `enforcedAt` to build a validator. The hard blocks are:

| Field | Hard block | Model says |
|---|---|---|
| `countryOfOrigin` | `features/origin/controller.js:28` Joi `requiredOneOf` | `required: true, enforcedAt: 'continue'` ✅ |
| `importType` | `features/import-type-filter/controller.js:26` Joi `requiredOneOf` | `export const importType = { id: 'importType' }` — **no required, no enforcedAt** |
| `declaration` | `features/declaration/controller.js:17` Joi `requiredOneOf` | `required: true` — **no enforcedAt** |
| commodity selection | `features/commodities/search.controller.js:122-128` hand-rolled `if (selected.length === 0) … errors: { search: 'Select a commodity' }` — not even Joi | `commoditySelection: required + enforcedAt: 'continue'` ✅ (but blocked by a different mechanism) |

So: **4 hard blocks, 2 `enforcedAt` carriers, 1 field in both sets.** The level exists in the data and the level exists in the behaviour, and they are wired together only through a human remembering.

**Doc/code disagreement (a finding in its own right).** `docs/validation.md:71-78` states: *"`requiredText` and `requiredOneOf` are the save-blocking primitives. **Exactly one field uses one**: `countryOfOrigin`… A user can walk the whole journey saving blanks, apart from the country of origin."* That is now false in three ways (importType, declaration, and the hand-rolled commodity-search block). The doc was written before the filter and declaration pages landed and was never refreshed. Anyone reading A's docs to understand its mandate model will be materially misled about where hard mandates live.

**Everything else is save-optional by construction.** Every other validator factory carries `.allow('')` (`lib/validate/validators.js:26-131`) — `maxText`, `pattern`, `postcode`, `ukPhone`, `oneOf`, `integerInRange`, `currency`, `dateParts` all pass a blank. `docs/validation.md:79-81` even makes this a convention with a warning ("Leave that out and the field silently becomes save-blocking").

## 6. The submit gate

`flow/section-status.js:11-15` is the whole thing:

```js
export const readyForCheckYourAnswers = (answers, inScope) =>
  taskRows.every((row) => {
    const status = rowStatus(row, answers, inScope)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
```

Three consumers:
1. **The one authored gate in the entire flow** — `flow/flow.js:72`: `gate: (scope) => scope.readyForCheckYourAnswers` on the `review` section. Every other gate in the app is derived.
2. **The server-side re-check** — `engine/write.js:89-95`: `if (!scope.readyForCheckYourAnswers) return { ok: false, ... }`. The button is a soft gate; this is the real one. `docs/validation.md:90-94` says so explicitly.
3. The hub's link/lock rendering (`features/hub/controller.js:142,158`).

Injected downward at boot (`engine/read.js:7-16`) so the engine imports nothing from `flow/`, and the unconfigured default **throws** — a pre-boot `makeScope` is a loud failure, not a silent `false`.

Note the semantics: `OPTIONAL` passes the gate, `IN_PROGRESS` does not. So a **half-filled optional collection blocks submit** — start a document and you must finish it (all 4 `documents` item fields are `required: true` under a collection with **no** `requiredAtLeastOne`: `features/documents/obligations.js:1-30`). That is a neat, fully-declarative expression of "optional, but complete if present", and it comes for free from the interaction of two existing keys. It is also the *only* per-context relaxation in the model, and it is structural rather than declared — there is no `optionalUntilStarted` flag; it falls out of `statusOf`.

## 7. Can a mandate be relaxed by context?

**No — and the model doesn't need it, because mandate is never save-blocking to begin with.** There is no mandate profile, no `enforcedAt` value other than `'continue'`, no per-journey-status override. What exists instead:

- **Draft = anything saves.** `required: true` is purely a completion fact (`docs/obligation-model.md:44-51`).
- **Submit = the roll-up gate** (§6).
- **Post-submit = a freeze, not a mandate change.** `engine/persistence/records.js` `assertWritable` rejects writes to a `SUBMITTED` record; `records.amend` is the sanctioned unfreeze, and a resubmission runs the **same** gate again (`spec/conflicts.json:266-267` — submit-before-complete was explicitly rejected in favour of amend-and-resubmit).

So the mandate model has exactly one enforcement point that can ever say "no, you are not finished" (`readyForCheckYourAnswers`), and it says it identically on first submit and on every resubmission. That is a defensible design, but it means **there is no vocabulary for a third level** (e.g. "warn but allow", "required at arrival", "required for this route only"). Adding one is a new key + a new reader + a new status.

## 8. Where mandate is *not* modelled — the imperative pressure valve

Two mandate-adjacent behaviours that are real, working, and entirely hand-coded:

- **The count-drop block.** Lowering a species' `numberOfAnimalsQuantity` below the number of identifier records already entered is rejected with a GDS error naming the species (`features/commodities/consignment-details.controller.js:161-175`). This is a cross-obligation cardinality *mandate* ("count ≥ records"), and the model cannot express it: `maxEntriesFrom` (`engine/evaluate/cardinality.js`) is a **cap on appends**, checked only in `appendEntryAt` (`engine/write.js:23-24`), never a completion mandate. `docs/obligation-model.md:213-218` is candid: *"Save-blocking above the cap is controller-owned, like all save-blocking."*
- **Conditional rendering re-derives the gate by hand.** `consignment-details.controller.js:17-18` — `export const packagesApply = (commoditySelection) => commodities.packageCountCommodities().includes(commoditySelection)` — is a hand re-implementation of the exact predicate the model already declares on `numberOfPackages` (`features/commodities/obligations.js:11-18`). It then drives both the validator set (`:30`) and the commit (`:181-183`). The engine derives scope from that literal; the controller derives *presentation and commit* from a copy of it. They agree today because both read the same service list, but nothing enforces that they agree.

## 9. Test coverage of the mandate model

- `engine/status.test.js` — 6 cases (NA, NOT_STARTED, facet NA/NOT_STARTED, facet split, facet-vs-whole agreement).
- `flow/gates.test.js` — 12 cases (RULE 1 enforcedAt-derived prerequisites, RULE 2 review gate, no deadlock, `assertDispatchBuilt` fail-loud, the "no `enforcedAt` ⇒ never a prerequisite" backwards-compat pin at `:126`).
- `flow/task-rows.test.js` — 15 cases (row status, row gating, review gate on a blank vs a ready journey).
- `indexed.test.js` — 7 cases (OPTIONAL/IN_PROGRESS/FULFILLED for an optional section).
- `engine/evaluate/sibling-at-least-one.test.js` — the `requiredOneOf` group mandate, **explicitly labelled synthetic** (`:29` — `describe('requiredOneOf group mandate (synthetic — no live carrier)')`, a stale label: `animalIdentifiers` is now a live carrier).
- `engine/evaluate/enclosing-complete.test.js` — a required enclosing-gated field owed on-gate / not owed off-gate, plus the conservative no-ctx pin (`:107`).

Roughly **40+ unit cases** bear directly on mandate/status/gating, out of 526 total.

---

## Structural limits (things a build loop cannot fix in A)

1. **Mandate conditions are limited to the 4-operator activation vocabulary over another obligation's answer.** No arithmetic, no conjunction/disjunction, no external state. `docs/obligation-model.md:139-143` states this as a design position, not an omission. Anything else must be a controller `if`. **Structural** — widening it means a new predicate language and a new interpreter, i.e. rewriting the thing that makes A's model 69 lines.
2. **A mandate carries no reason, message, or copy.** By construction — no `type`, no label, no validator on an obligation (`docs/obligation-model.md:34-42`). Consequence: the app can compute *that* a journey is not ready but can never tell the user *what is missing* in the model's own words. Observable: `features/declaration/controller.js:66` — a failed submit is `h.redirect(pagePath(kit.CYA_SLUG))` with **no message at all**. **Structural** for messages (the model has nowhere to put one); the "which rows are incomplete" list is derivable from `rowStatus` and simply isn't built.
3. **Only two mandate levels, one of which is a default.** No advisory/warning level, no per-context profile. **Not structural** (a third `enforcedAt` value + a reader would do it) — but the second level's *enforcement* is not derived (see below), so a third level would inherit the same problem.

## Non-structural gaps (a build loop could close these)

4. **`enforcedAt: 'continue'` does not generate its own save-block.** One reader, `flow/prerequisites.js:11`; the "cannot Save and Continue" behaviour is hand-written per controller. Closing it means deriving a required-validator from the flag — which needs a *value domain* the obligation deliberately does not carry, so the cheap fix is a boot-time assertion ("every `enforcedAt:'continue'` obligation's owning page must run a save-blocking validator on it") rather than true derivation. Cost: a new page-side declaration, or a `contract.test`-style handler probe.
5. **Gates are navigation-shaping, not route guards.** `pageGatePasses` is called only from `flow/navigation.js`, `flow/run.js`, `features/hub/controller.js` and `analysis/simulate.js` — never as a Hapi route pre-handler. The only hard server-side checks are the fresh-journey entry guard (`flow/entry-guard.js:44-50`) and `submitJourney`. A deep link to a "Cannot start yet" page renders it.
6. **The docs misstate the save-blocking surface** (`docs/validation.md:71-78` vs 4 real hard blocks). Cheap to fix, expensive if believed.
7. **`satisfied(id, answers)` ignores `required` at the root** (`complete.js:85-87`: a non-collection root is "satisfied" iff answered). `statusOf` compensates by pre-filtering to required parts (`status.js:63`), so no live bug — but the function's name over-promises, and any new caller would inherit the wrong semantics.

## What A's mandate model does that is genuinely worth stealing

- **Derived prerequisites from a mandate level.** 2 data facts (`enforcedAt: 'continue'`) + flow order + the page→obligation index generate the entire "Cannot start yet" graph. Zero authored prerequisites. (`flow/prerequisites.js`, 31 LOC.)
- **OPTIONAL as a distinct status from NOT_APPLICABLE**, mapped to distinct GDS output, with the submit gate accepting both.
- **"Optional but complete-if-started"** falling out for free from `collection` (no `requiredAtLeastOne`) + `required: true` items.
- **The facet-aware group check** (`groupOwned`, `complete.js:13-18`) — one stored collection, two hub rows, no false group failures.
- **The freeze/amend model**: one gate, applied identically to first submit and every resubmission.

## Cost of adopting any of it

The mandate keys are cheap (3 keys + 1 level key, 5 reader lines). What is *not* cheap is the surrounding contract they depend on: the boot-time dispatch coverage assertion (`flow/dispatch.js` — every non-system obligation at every depth collected by exactly one page, or the server crashes), the page-side `collects` declarations that the prerequisite derivation inverts, and the instance-aware `scope.answered` walk. Lift `enforcedAt`-derived sequencing without those and it degenerates into a hand-authored prerequisite list. Adding a mandated field to A touches **5 places** (`docs/add-a-field.md:16`): obligations.js, controller schema, controller commit, template, CYA row — of which only the first is the mandate itself.
