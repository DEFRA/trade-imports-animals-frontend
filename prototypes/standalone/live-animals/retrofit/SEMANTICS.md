# Three semantic questions, settled with evidence

**Produced by** `inc-003`, 2026-07-17. **Input:** PLAN §5.1-5.3, `DELTA-REGISTER.md` (inc-002), `mapping.json` (inc-001), both manifests, `spec/journey-spec.json` + `spec/conflicts.json`.
**For:** Sam, at the M0 gate (`inc-004`).

**A** = `prototypes/standalone/live-animals` @ `b6ac2ed`. **B** = `prototypes/journey-config-spikes/EUDPA-249-flow-layer` @ `34550a3`.

---

## Headline

| Q                                             | Answer                                                                                                                          | Confidence                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Q1** — is Phase 5 a regression?             | **No.** A cannot express per-record conditional mandate either. Paul's YAGNI call stands.                                       | **Certain** — A's mandate vocabulary is the literal `true`, 32/32 sites. |
| **Q1′** — what _can_ A express that B cannot? | **`maxEntriesFrom`, and only `maxEntriesFrom`.** inc-002's claim is correct.                                                    | **Certain** — A's whole alphabet is 15 keys; 14 have B counterparts.     |
| **Q2** — `multi`                              | **Cleanup, not prerequisite.** The coupling dies with `contract.js`. Exactly **one** obligation needs it: `transitedCountries`. | **High** — one coercion site in all of A.                                |
| **Q3** — `pathPrefix`                         | **"Latent" survives D1 and D2** — but not for PLAN §5.3's stated reason. Bug + fix both now proven by execution.                | **Certain** — reproduced and fixed against B's real code.                |

---

## Q1 — Phase 5 is not a regression · PLAN §5.1

### The narrow question: can A express per-record conditional mandate?

**No.** PLAN §5.1's suspected reading is right, and the evidence is blunter than the plan dares to be.

A's mandate vocabulary is the key `required`. Every occurrence of it in A's manifest — all **32**, across all 12 feature files — is the literal `required: true`:

```
$ grep -rhn "required:" features/*/obligations.js | sort | uniq -c
   ... 32 occurrences, every one `required: true`
```

There is no `required: false`, no predicate, no closure, no per-record form. And the consumer is a bare property read — `engine/evaluate/complete.js:54`:

```js
return !subObligation.required || isAnswered(entry?.[subObligation.id])
```

No invocation, no context, no record argument. `required` is a static boolean that cannot vary by anything, let alone by record.

B stamps `obligation.status` uniformly across records (`evaluator.js:544-550`). **The two are the same expressive power.** Both sides get per-record mandate only as a _consequence_ of per-record scope — which both sides have (A: `activatedBy` + `frame`; B: `applyTo` returning `records`).

**So the corpus is conflating scope with mandate, exactly as PLAN §5.1 suspects.** `MATRIX`'s "A-only and structural" is wrong: it is not A-only, because A does not have it either.

**Verdict: Phase 5 is not a regression. Do not build it. Paul's YAGNI call was correct.** This also disposes of PLAN §6's risk #4.

**Corroborating evidence from inc-002's material.** D3 (`regionCode`) and D4 (`transitedCountries`) are the corpus's best examples of A and B disagreeing on mandate. Both turn out to be B carrying a _stale value_ — `c-017` and `c-038` rule against B, and each is a **one-line manifest fix** (`status: 'optional'` → `'mandatory'`). Neither needs any new model vocabulary. A stale value is not a missing capability. inc-002's note 1 is right.

### The real question: what can A express that B genuinely cannot?

The honest way to answer is to enumerate A's _entire_ obligation alphabet and check each key against B. A's manifest uses exactly **15 keys**:

| A key                  | B counterpart                       | Gap?                                         |
| ---------------------- | ----------------------------------- | -------------------------------------------- |
| `id`                   | `id`                                | no                                           |
| `required: true`       | `status: 'mandatory'`               | no — both static                             |
| `activatedBy`          | `applyTo` + helper                  | no                                           |
| ↳ `obligation`         | `metadata.obligation`               | no                                           |
| ↳ `equals`             | `equalsGate`                        | no                                           |
| ↳ `includes`           | `allowListed` / `includesGate`      | no                                           |
| ↳ `notInUnionOf`       | `notInUnionOf`                      | no — same derived-union design on both sides |
| ↳ `frame: 'enclosing'` | `allowListed(..., projectionGroup)` | no                                           |
| ↳ `frame: 'anyItem'`   | `anyAllowListed`                    | no                                           |
| `collection`           | group (via `within` back-refs)      | no                                           |
| `item`                 | `within`                            | no                                           |
| `requiredOneOf`        | `requires.anyOfIds`                 | no                                           |
| `requiredAtLeastOne`   | `requires.minEntries`               | **no** — see below                           |
| `wipeOnExit`           | unconditional purge                 | **no** — see below                           |
| `enforcedAt`           | —                                   | not a model key (flow; `inc-018`/`inc-020`)  |
| **`maxEntriesFrom`**   | **nothing**                         | **YES — the only one**                       |

Three of these deserve their reasoning on the record, because two are near-misses that look like gaps and are not:

**`requiredAtLeastOne` is not a gap.** `mapping.json` and `DELTA-REGISTER` D2 pair it with `maxEntriesFrom` as "A-only structural keys". Only half of that is true. B's `requires.minEntries` is _generic_ — `engine/index.js:532-541` reads it off any group and emits `MIN_ENTRIES`. B simply hasn't wired it onto `unitRecord`. That is a one-line manifest addition (`requires: { minEntries: 1 }`), not a model extension. **D2 should be split: the floor is a manifest value, the cap is a capability.**

**`wipeOnExit` is not a gap — it is dead vocabulary in A.** All 15 occurrences are `wipeOnExit: true`, one per `activatedBy` (15 each). A never uses the retain-value option its own key implies. And per `c-017` ("wipe on exit everywhere, confirmed") it never legally could. B's `purgeStorage` (`evaluator.js:404`) drops every out-of-scope entry unconditionally — **which is exactly the ruled behaviour, with no key needed.** B is simpler _and_ more correct here. Worth noting the direction of travel: this is one place the retrofit should not port A's vocabulary across.

**`maxEntriesFrom` is a genuine, ruled capability gap.** `features/commodities/obligations.js:110` declares `maxEntriesFrom: numberOfAnimalsQuantity`, and `engine/evaluate/cardinality.js:20-31` resolves it **per collection instance** by reading a sibling's value _in that instance's frame_:

```js
const value = valueAt(answers, [
  ...collectionPath.slice(0, -1),
  countObligation.id
])
```

B cannot express this, for two independent reasons — either alone is sufficient:

1. **B's decision surface has no numeric channel.** An `applyTo` returns `{inScope, status, records, reasons}`. Scope is boolean, status is an enum. A cap is a **number read from a sibling field, resolved per frame**. There is nowhere to put it. B's only numeric vocabulary is `requires.minEntries`, and that is a _literal_ (`minEntries: 1`), not a reference to another obligation's value.
2. **B's group implications ignore `applyTo`'s records anyway.** `buildImplication`'s group branch (`evaluator.js:515-525`) takes only `own.reasons` and rebuilds `records` from `fulfilmentIdsByObligationId` — i.e. from storage. So even the hack of "return only the first N records from the group's `applyTo`" is closed off by construction. (`unitRecord` classifies as `group`: it has children via `within` back-refs — `classifyObligations`, `evaluator.js:236`.)

And it is not YAGNI-able: `c-031` ruled the cardinality link in, and `journey-spec.json:1339` records it **implemented at `inc-063`, DESIGN-DELTA #15**. It is a shipped, ruled V4 capability.

**One nuance the register misses, and M2 should hear it.** `maxEntriesFrom` is not really a _scope_ rule at all — it is **admission control**. Per `c-031` item 4 and `journey-spec.json:1339`, `appendEntryAt` **rejects at the cap** and a count-drop must "block with a GDS error… never silently trim". B's model has no admission-control surface whatsoever; its nearest neighbour is `groupInvariantErrors`, a _validation emitter_. So porting `maxEntriesFrom` onto B is **not** "add a key to the manifest" — it needs a new kind of answer from the model (a per-instance integer cap) **and** a caller that enforces it at append. Sizing this as one `MODEL_EXTENDER` increment is optimistic; treat it as the second-largest item in M1 after the bridge.

> **Answer to Q1′:** `maxEntriesFrom` — and, after a full key-by-key audit, **nothing else**. inc-002's claim is confirmed. Every other A key is either matched by B, a one-line manifest value B hasn't set, dead vocabulary A shouldn't port, or a flow key that isn't in the model.

---

## Q2 — `multi` is cleanup, and it needs exactly one entry · PLAN §5.2

### The coupling dies with `contract.js` — confirmed

B's `contract.js:331-335` array-coerces **only when `descriptor.widget === 'checkboxes'`**, and the widget itself is decided by `lib/field-widgets.js` from the hardcoded 3-name `OBLIGATION_MULTI` Set (`transitedCountries`, `species`, `animalsCertifiedFor`). Both files are on PLAN §2.2's **discard** list. Neither is imported by `obligations/`, `domain/`, `engine/` or `analysis/` — contamination is one-way (UI → model), as §2.2 verified. **So yes: the coupling dies with `contract.js`, and it cannot follow the model across.** PLAN §5.2 is right.

### Where A decides array-ness today

**In one controller, by hand, on the HTTP payload.** A has exactly **one** obligation-storing coercion site in the entire prototype:

```js
// features/transport/transit-countries.controller.js:55
;[].concat(payload.transitedCountries ?? []).filter((code) => code !== '')
```

(`search.controller.js:41`'s `toList` is the only other `[].concat` on a payload, and it is applied to `shown` / `selected` / `species` — transient _form_ state, not obligations. `seedLine` writes a scalar.)

A's model is **array-agnostic by design**, not by omission: `engine/evaluate/predicate.js:12-24` wraps every compared value in `[].concat(value ?? [])`, so a gate reads a scalar and an array identically. A does not need to know which fields are arrays, which is why it has no `multi` key.

### B's `OBLIGATION_MULTI` is wrong on 2 of its 3 entries

This is the finding I did not expect, and it strengthens PLAN §5.2's conclusion considerably. Checked against A's shipped code and the ruled spec:

| B's `multi`           | A's counterpart       | A's stored shape                                                                 | Ruled spec                                              | Agrees?                                                                                                     |
| --------------------- | --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --- |
| `transitedCountries`  | `transitedCountries`  | **array** (`controller.js:55`; test asserts `['FR']`)                            | widget `checkboxes`, `maxSelections: 12` (`:1249-1254`) | ✅                                                                                                          |
| `species`             | `speciesSelection`    | **scalar** — `lineKey` is `` `${commoditySelection}                              | ${speciesSelection}` ``, `seedLine` writes a string     | _"the stored value is **SINGLE-VALUED** per commodity line"_ — GRAIN CHANGE at `inc-062`, `c-030` (`:1452`) | ❌  |
| `animalsCertifiedFor` | `animalsCertifiedFor` | **scalar** — `govukRadios`, strict `option.value === values.animalsCertifiedFor` | widget **`radios`** (`:656`)                            | ❌                                                                                                          |

`speciesSelection` is the one that should end the argument. The spec says its widget is **`checkboxes`** _and_ its stored value is **single-valued** — the multi-select fans out into one commodity line per species (`inc-062`, ruled by `c-030`). **So on this field, on the ruled spec, widget and stored shape point opposite ways.** B's `widget === 'checkboxes' ⇒ array` rule doesn't just risk the wrong shape in theory (`L2-pres:106`'s rename scenario) — it produces the wrong shape _today_, on a real ruled field, in the direction that matters.

**`animalsCertifiedFor` is a plain error**: B marks it multi; the spec says radios and A stores a scalar.

### Verdict

**Cleanup, not prerequisite** — PLAN §5.2 is right, and for the right reason. Nothing in A derives persistence from a widget; A's model never asks. Sequencing is free.

**Which obligations need `multi`: exactly one — `transitedCountries`.** Not three. If `inc-027` is ever picked up (it is behind M5's deferred gate), it is a one-entry key, and it should be **derived from the domain's value legality (an enum-multi), never from a widget**.

**Two warnings for whoever does pick it up:**

- **Do not port `OBLIGATION_MULTI`.** It is wrong on 2 of 3 and it is presentation-layer. Re-derive from the spec.
- **`multi` is not free once it exists.** B's gate helpers assume scalars — `filterAndProject` tests `values.includes(value)` against the raw stored value, which is a silent `false` for an array. A's `applyTo` tolerates both via `[].concat`. No live gate reads an array on either side today (`transitedCountries` gates nothing), so this is latent — but adding `multi` without teaching the helpers to normalise would arm it. **Prefer leaving `multi` out entirely** unless CYA/validation genuinely demands it; A's array-agnostic predicate is the better design and it already works.

---

## Q3 — `pathPrefix`: latent survives D1 and D2, and the bug is now proven · PLAN §5.3

### Re-checked against the post-D1 shape, not inherited

inc-002's note 3 is a fair challenge, so I re-derived the depth claim rather than carrying it over. **First, PLAN §5.3 states the trigger condition slightly wrong**, and the correction matters for the re-check:

> §5.3: "It breaks only when the **gate itself** sits at depth ≥2 **and projects**, where `'line1/unit1'` slices to `'line1'`, misses…"

The mechanism is right but the described slice is not: it is the **projection path** that gets sliced, not the gate's key. Precisely: `filterAndProject` (`helpers.js:548-575`) builds `passingKeys` from the **gate's own** record keys, then filters projection paths by `passingKeys.includes(pathPrefix(path))`. `pathPrefix` returns the **first segment only**. So the match can only ever succeed when the gate's keys are **one segment long** — i.e. the gate is `within` a **depth-1** group. The _projection target's_ depth is irrelevant: a depth-1 gate projecting onto a depth-3 group would work fine (`'line1/unit1/sub1'` → `'line1'` ✅).

**The condition is therefore: gate at depth ≥ 2, with a projection.** Nothing about the gated obligation's depth.

**Does D1 arm it?** No. `documents` is a **notification-level** collection — depth 1 (`journey-spec.json:1353-1365`). Its four fields sit at depth 1, and their gate (B's self-referencing `presentGate` all-or-nothing block, `obligations.js:812-820`) gates _siblings at the same level_, so it takes `projectionGroup: null` — and `filterAndProject` returns `passingKeys` directly at `:565-567` without ever calling `pathPrefix`. D1 does add a real wrinkle B must handle (once the four fields are `within: documents`, their storage becomes a record map, so the gate moves from B's scalar family to the `allowListed` family) — but at depth 1, with a null projection. **The trap stays disarmed.**

**Does D2 arm it?** No. `maxEntriesFrom` is a cardinality cap, not a gate. It projects nothing and produces no `passingKeys`.

**Does anything else?** No. The deepest **group** on either side is `unitRecord` at depth 2, and after D1 the maximum stays 2 (`documents` is depth 1). Every projecting gate on both sides is `commodityCode` at depth 1 → `unitRecord` at depth 2 — the case that works. `permanentAddress` does not add a level: its sub-fields live inside one stored value (`addressBlock`), not a group.

> **So "latent, not live" survives D1 and D2 — but the load-bearing fact is "no gate sits inside a depth-≥2 group", not "A's journey is depth-2".** The distinction matters: A's journey being depth-2 is _not_ sufficient on its own. A gate `within: unitRecord` (depth 2) projecting deeper would be live _today_ at depth 2. It is latent because no such gate exists, not because the journey is shallow. Any future obligation gated on a **per-unit** value — a plausible V4 growth direction — arms it at the current depth, with no depth-3 requirement at all. **PLAN §6's risk #5 is slightly under-rated on those grounds.** Fix at `inc-006` as planned.

### The deliverable: a proven failing test

`retrofit/path-prefix-depth.test.js` — `describe.skip`, pointing at `inc-006`.

**It is not a speculative test. I proved both halves by execution**, by vendoring B's `obligations/` at the inc-005 path (`live-animals/model/obligations/`) temporarily and un-skipping it:

- **Red, on B @ `34550a3` as shipped** — and red in exactly the data-destroying way. A gate at depth 2 (`unitFlag`, `within: unit`, keys `'line1/unit1'`) says `'yes'`, projecting onto `subUnit` at depth 3 (paths `'line1/unit1/sub1'`). `pathPrefix` yields `'line1'`, misses, `applyTo` returns `{inScope: false}`, and `purgeStorage`'s derived-leaf branch (`evaluator.js:408-424`) **deletes the record**. The assertion `result.fulfilments.subDetail` came back `undefined`: **the user's stored value was destroyed.**
- **Green, with the fix** — replacing the filter with a real prefix test turns all three green, no other change:
  ```js
  passingKeys.some(
    (key) => key === '' || path === key || path.startsWith(`${key}/`)
  )
  ```
  The `key === ''` case is load-bearing: `filterAndProject:559-561` uses `''` as the key for a scalar (non-record-map) gate. A naive `path.startsWith(key + '/')` alone regresses that path — worth flagging, because it is the obvious fix and it is subtly wrong.

The vendored model was removed afterwards; the only file this increment adds is the test.

**The file carries a third test — a negative control** (gate says `'no'` ⇒ record still purged). It passes _with the bug_, for the wrong reason. It is there so `inc-006` cannot buy the first two tests by making the gate admit everything. **Do not delete it as redundant.**

**For `inc-006`:** un-skip the whole file, do not rewrite it. The imports are dynamic (`await import` inside the test body) purely so the file can sit on disk while B's model is unvendored; once inc-005 lands they resolve as-is. If inc-005 vendors somewhere other than `model/obligations/`, fix the two specifiers and nothing else.

---

## Where PLAN §5.1-5.3 is wrong

The plan is right on all three headline calls. Four corrections, one of which changes an estimate:

1. **§5.3's trigger condition is described wrongly** (right mechanism, wrong slice — it is the projection path that gets sliced, not the gate key), and its "A's journey is depth-2 → latent" reasoning is **not the actual reason**. The reason is that no gate sits inside a depth-≥2 group. A depth-2 gate that projects would be live today. §6 risk #5 is correspondingly under-rated.
2. **§5.1's "the real cost is ~2 sites"** (citing `DESIGN-PHASE-5.md:67-74`) is moot — the cost is **0 sites**, because the feature should not be built at all.
3. **§5.2 understates itself.** It says the sharp edge "mostly evaporates". It evaporates entirely for persistence, _and_ the `multi` list B would hand us is wrong on 2 of its 3 entries. The scope of `inc-027` shrinks from 3 obligations to 1 — and there is a decent argument it should be dropped rather than deferred, since A's array-agnostic predicate already solves the problem `multi` exists to solve.
4. **§4/M1 under-scopes `maxEntriesFrom`** (inherited from D2). It is admission control, not a manifest key: B needs a numeric per-instance channel it does not have, _plus_ an append-time enforcement point it does not have. And D2 conflates it with `requiredAtLeastOne`, which is **not** a gap at all (`requires.minEntries` is generic; B just hasn't wired it to `unitRecord`).

---

## What M1 (`inc-005`..`inc-007c`) and the M2 oracle should know

1. **`inc-006` inherits a proven fix, not a guess.** Use the `key === '' || path === key || path.startsWith(key + '/')` form — the empty-key branch is required for scalar gates and the obvious one-liner drops it. Un-skip `path-prefix-depth.test.js`; keep the negative control.
2. **`inc-005`'s vendor path is now load-bearing.** `path-prefix-depth.test.js` imports `../model/obligations/{evaluator,helpers}.js`. That path is verified to work (I ran the suite against it). Landing elsewhere means editing the test.
3. **The dep tree really is closed** — `obligations/{evaluator,helpers,helper-internals,obligations}.js` imports nothing outside itself. Vendored and ran green with zero other files. PLAN §2.2's "detaches cleanly" is confirmed by execution, not just by grep.
4. **Do not port `wipeOnExit`.** All 15 sites are `true`; `c-017` rules wipe-everywhere; B's unconditional purge is already correct. Porting the key would re-introduce an option the ruling forbids. This is the one place the retrofit should let A's vocabulary go.
5. **Split D2 before scheduling it.** `requiredAtLeastOne` on `unitRecord` = one-line manifest value (`requires.minEntries: 1`). `maxEntriesFrom` = a real model extension **plus** an admission-control seam. Different sizes, different risk; do not put them in one increment.
6. **For the M2 oracle — mandate can be compared as static data on both sides.** Neither engine varies mandate per record, so the oracle needs no per-record mandate dimension at all: compare `inScope` sets, a scalar status per obligation, and the wipe set. That is a real simplification of `inc-009`.
7. **The oracle cannot see any of `inc-003`'s findings.** `maxEntriesFrom` (no B vocabulary), `multi` (no A vocabulary), `pathPrefix` (no manifest triggers it). All three are structural, exactly like D1/D2. **Running total: 5 of the 9+3 deltas are invisible to the differential oracle.** The oracle is still worth building — it is the only thing that catches D3/D4 and the vocabulary-normalisation class — but M2's gate must not be read as "green oracle ⇒ retrofit is behaviourally complete". It means "green on the deltas the oracle can express".
8. **`inc-007c` gains a task from Q2.** When options move to MDM, `animalsCertifiedFor` must land as **radios/scalar** (`journey-spec.json:656`), not as B's checkbox-multi. Porting B's widget rules verbatim would silently change its stored shape from a string to an array — and, per Q2, nothing in B's own test suite would catch it.
