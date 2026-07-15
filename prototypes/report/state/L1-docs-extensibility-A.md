# L1 — Documentation and extensibility — SIDE A (live-animals)

Clone: `workareas/model-comparison/clone-live-animals` @ b6ac2ed
Root: `prototypes/standalone/live-animals/`
All paths below are relative to that root unless prefixed.

---

## 0. Headline

A has **the best documentation-of-a-recipe I have seen on either side, and it is
partly wrong**. Three numbered how-to guides (`docs/add-a-{field,page,collection}.md`,
764 LOC combined) walk the real files, are cited verbatim as the source of truth by an
automated build skill, and are backed by two *behavioural* guards that make a missed step
a hard failure rather than a review comment. But **eight verified doc-vs-code
disagreements** exist, all in the same direction — the docs **under-sell** the model,
describing capabilities as absent that the code now has, and naming a symbol
(`GROUP_ROWS`) that exists nowhere but the doc.

The extensibility answer itself: **the declarative part of adding a field is one line.
Everything else — 8-to-15 further edits — is imperative and hand-authored.** That is the
paradigm working as designed, not a defect, and A's own `docs/limits.md` says so. The
question for the third option is whether that trade is worth it.

---

## 1. THE KEY QUESTION — add ONE conditionally-required field to an existing page

Worked concretely against `features/origin/` (the doc's own example page), adding a field
gated on an existing radio (`activatedBy … equals`) and `required: true`.

### 1a. What the docs say

`docs/add-a-field.md:16`:

> "Adding a field touches **five places**. Steps 1 to 4 are the feature slice. Step 5 is
> named for you by a failing test."

`docs/limits.md:74` (same repo, same commit) says something different:

> | "Add a field" | Honestly means **three edits**: a model entry, a controller edit and a template edit. |

**The two docs contradict each other on the headline number.** Neither is right.

### 1b. What the code actually requires — counted

| # | File | Edit sites | Declarative or imperative? | In the doc? |
|---|---|---|---|---|
| 1 | `features/origin/obligations.js` | 2 — the def + the `obligations` array entry | **DECLARATIVE** (the whole model change) | yes, step 1 |
| 2 | `features/origin/controller.js` | 3 — a validator in `fields()` (:26-49), a GET prefill (:70-73), a POST value-map entry (:80-83) | imperative | yes, step 2 |
| 3 | `features/origin/template.njk` | 1-2 — the `govukInput` macro, plus a `{% set %}` reveal block wired into the activating radio's `conditional:` (:25-45) | imperative — **restates `activatedBy` a 2nd time** | yes, step 3 |
| 4 | `features/check-answers/controller.js` | 2 — a `row(...)` call **and** a hand-coded visibility ternary | imperative — **restates `activatedBy` a 3rd time** | row: yes (step 4). **Ternary: NO.** |
| 5 | `contract.test.js` | 1 — a payload line in the page's case | test | yes, step 5 |

**Documented total: 5 files, 9–10 edit sites.**

Then the parts the numbered steps omit:

| # | File | Edit sites | Why it is needed | In the doc? |
|---|---|---|---|---|
| 6 | `services/persistence/records/notification-mapper.js` | up to **4** — Mapper A forward, Mapper A reverse, Mapper B forward, Mapper B reverse | any field that must reach the backend | **NO** — mentioned in prose at `add-a-field.md:11` ("You author … the persistence wiring") and then never appears in a numbered step or the count |
| 7 | `services/persistence/records/notification-mapper.test.js` + `skeleton-equivalence.test.js` | 1-2 | the parity pin | no |
| 8 | `spec/fixtures/happy-path.json` + every ready-to-submit fixture | 1 + N | a `required: true` field in scope turns `readyForCheckYourAnswers` false everywhere | **yes, and honestly** — `add-a-page.md:240-255` records that the worked example "turned four test files red at once" |
| 9 | `prototypes/e2e/live-animals.spec.js` | 1 | the full walk must fill it before submit | yes, `add-a-field.md:184-193` |

**Realistic total for a real (persisted, required, conditional) field: 8–11 files, ~16
edit sites, of which exactly ONE is a declarative model fact.**

### 1c. The one line that is declarative

`features/origin/obligations.js:12-17` — the whole conditional-required behaviour:

```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}
```

That buys, with **zero further code**: scope membership, per-instance scope at depth,
scope-exit destruction, completeness contribution, the section/hub tag roll-up, the
submit-readiness gate, the derived page gate, dead-end reachability proof, and the
boot coverage assertion. That is genuinely a lot for four keys, and it is the strongest
thing about A's model.

### 1d. The `activatedBy` predicate is restated THREE times

This is the sharpest extensibility finding on side A. The model knows the gate. Nothing
that renders asks it.

1. **Model** — `features/origin/obligations.js:15`
   `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }`
2. **Template** — `features/origin/template.njk:42`
   `{ value: "yes", …, conditional: { html: regionCodeHtml } }`
3. **Check-your-answers** — `features/check-answers/controller.js:111`
   ```js
   ...(answers.regionOfOriginCodeRequirement === 'yes' ? [ row(…) ] : [])
   ```

`features/check-answers/controller.js` **never reads scope for row visibility** — the only
mention of `scope` in the file is the POST redirect (`:491`). There are **4 such
hand-coded restatements** in that one file (`:111`, `:150`, `:301`, `:304`), each mirroring
a real `activatedBy` literal elsewhere in the model. So when a gate's rule changes, three
places must change and only one of them is tested by the contract test.

Why it happens: the engine facade exposes scope only as `has(id)` —
`engine/read.js:31`, `has: (id) => inScope.has(id)` — which is **id-level, not
instance-level**, and `engine/index.js` (the 10-export barrel) does **not** export
`applyPredicate` / `evalPredicate`. A render surface that wants "is this field in scope for
*this* commodity line / *this* draft entry" has no engine call to make.

Proof that this bites: `features/commodities/animal-identification.controller.js:42-43`
hand-rolls the predicate rather than calling the engine —

```js
const typeApplies = (obligation, commodity) =>
  obligation.activatedBy.includes.includes(commodity)
```

and again at `:67-68` (`notInUnionOf`) and `:131-132`. It reaches past the facade to import
`includesUnion` straight from `engine/evaluate/predicate.js` (`:3`). So
`docs/obligation-model.md:100-104`'s claim — "exactly four operators, **interpreted in one
place** (`engine/evaluate/predicate.js`)" — is true for *scope* and false for *rendering*.
A fifth operator added to the model would silently not apply to this page's field gating.

**This is a cheap fix, not a structural flaw** — export `applyPredicate`/`evalPredicate` (or
a `scope.atPath(path, id)`) from the facade and the duplication collapses. Worth putting on
the shopping list.

---

## 2. Add a NEW PAGE — counted

`docs/add-a-page.md` = 10 numbered steps, 285 LOC. Traced against the code:

| Step | File | Sites | Real? |
|---|---|---|---|
| 1 | `features/<f>/page.js` (new) | 1 file | yes — pattern confirmed, the leaf imports nothing (cycle guard, `:66-72`) |
| 2 | `features/<f>/obligations.js` (new) | 1 file | yes |
| 3 | `features/<f>/controller.js` (new) | 1 file | yes |
| 4 | `features/<f>/template.njk` (new) | 1 file | yes |
| 5 | `registry.js` | 2 (import :1-12, spread :15-28) | yes |
| 6 | `features/index.js` | 3 (import :1-24, `dispatchPages` :27-46, `allRoutes` :48-73) | yes |
| 7 | `flow/flow.js` | 2 (import + section) | yes |
| — | **`flow/task-rows.js`** | **2 (import + row)** | **MISSING FROM THE DOC ENTIRELY** |
| 9 | `features/hub/controller.js` | 1 | **the doc names `GROUP_ROWS`; the symbol is `GROUPS` (`:21`) and it is a nested group→rows structure** |
| 8 | `features/check-answers/controller.js` | 1 per obligation (25 `row(`/`partyRow(` sites live today) | yes |
| 10 | `contract.test.js` | 1 case | yes |

**Real total: 10 files, ~15 edit sites**, versus the doc's 9 files / 10 steps.

`grep -rn "GROUP_ROWS"` across the whole root returns **2 hits, both inside
`docs/add-a-page.md` (:212, :220)**. A new dev following step 9 literally would search the
codebase for a symbol that does not exist. The hub's row list moved to `flow/task-rows.js`
(`taskRows`, `:24-51`) at inc-061 / DESIGN-DELTA #13 and the recipe was never updated —
even though `docs/flow-and-gates.md:113-118` documents `flow/task-rows.js` correctly. The
*reference* docs were maintained; the *recipe* docs were not.

---

## 3. Add a COLLECTION — counted

`docs/add-a-collection.md` = 7 steps, 260 LOC.

Declaratively, a collection is one nested data literal —
`features/commodities/obligations.js:96-124` declares a **depth-2** nested collection with
`requiredAtLeastOne`, `requiredOneOf` over a 6-member group, and `maxEntriesFrom` pointing
at a sibling count obligation, in 29 lines. Scope, per-instance wipe, per-entry
completeness, the cardinality cap and dispatch coverage at depth all recurse for free
(`docs/add-a-collection.md:108-127`, verified against `engine/evaluate/complete.js` and
`flow/dispatch.js`).

**But the loop UI is 100% hand-written, and that is where the cost is:**

| Live collection | Controller LOC |
|---|---|
| `features/documents/controller.js` (single-page add-another loop + cdp-uploader) | 358 |
| `features/commodities/search.controller.js` | 147 |
| `features/commodities/consignment-details.controller.js` | 207 |
| `features/commodities/animal-identification.controller.js` (nested depth-2 loop) | 566 |

There is **no generic loop renderer**. `state.collectionView(answers, path)` returns facts
only — `[{ index, path, entry, complete }]` — and the controller hand-builds every row
(`add-a-collection.md:143-156`). `docs/decisions.md` defends this explicitly: a repeating
collection "has no uniform-widget projection". Honest, and expensive: the two live
collections cost **~1,280 LOC of controller**.

Plus, per the doc's own step 5, two guards must be **copy-pasted by hand** into every new
nested controller (parent-index validation; the `Number.isInteger` splice guard) — there is
no shared helper enforcing them.

---

## 4. The behavioural guards — A's best extensibility property, and it is REAL

A does not rely on the reader following a checklist. Two guards make a missed step a hard
failure. Both verified in code.

1. **Boot coverage assertion.** `flow/dispatch.js#buildDispatch` inverts every page's
   `collects` into an obligation→page index and asserts **every non-system obligation at
   every depth is collected by exactly one page**. Declare an obligation and forget to wire
   it and the **server refuses to boot** — and because nearly every test file calls
   `buildDispatch(dispatchPages)` in `beforeAll`, the whole unit suite goes red at once
   (`docs/add-a-page.md:229-238`).
2. **Contract test.** `contract.test.js:43-52` drives each page's **real POST handler** and
   asserts the set of obligation ids actually committed **equals** the page's declared
   `collects` (minus `renderOnly`/`system`). A declared-but-unwired field fails exactly one
   test, and that test names the page (`docs/add-a-field.md:138-152`).

Net effect: of the ~16 edit sites for a field, **the model/wiring ones cannot be silently
missed**. The ones that *can* be silently missed are the presentation ones — the CYA row,
the CYA visibility ternary, the hub hint, the mapper. Which is precisely the imperative
half.

---

## 5. Documentation assessment

### Volume and shape

| Artefact | Files | LOC |
|---|---|---|
| `docs/` | 18 | 3,412 |
| `DESIGN-DELTA.md` (root) | 1 | 761 |
| **Total design prose** | **19** | **4,173** |
| of which the three how-to recipes | 3 | 764 (`add-a-field` 219, `add-a-page` 285, `add-a-collection` 260) |
| `docs/limits.md` — the honest-limits page | 1 | 88 |
| `docs/decisions.md` — ADRs | 1 | 309 |

Shape: an index (`docs/README.md`) with a prescribed **reading order** (architecture →
obligation-model → engine) and a one-line-per-doc table; three task-oriented recipes; four
reference docs; a limits page; an ADR log; a change log (DESIGN-DELTA, 15 numbered engine
divergences each naming its **carrier obligation**, its **backwards-compatibility
argument** and the **test file that proves it**). That is a strong information
architecture — it answers "how do I do X" and "why is it like this" separately.

### Would it make a new dev productive?

**Yes, and faster than any reference-manual-style doc would** — because the recipes name
real files, and because the two behavioural guards catch the steps the recipe fudges. A
dev who reads `add-a-field.md` (219 LOC, ~10 minutes) can add a field the same morning.

The recipes are trusted enough that a workspace automation consumes them as the
specification: `.claude/skills/prototype-element/SKILL.md:25-27` routes each mode to a doc
and quotes its count —

```
| `add-field`      | `docs/add-a-field.md` (5 places)      |
| `add-page`       | `docs/add-a-page.md` (10 steps)       |
| `add-collection` | `docs/add-a-collection.md` (7 steps)  |
```

That is the highest form of doc validation there is: the doc is executable.

### Where it fails — 8 verified doc/code disagreements

Every one of these was checked against the source. Every one **under-sells** the model or
misdirects the reader.

| # | Doc claim | Reality |
|---|---|---|
| 1 | `add-a-collection.md:254-260` — **"## The one hard limit — The model cannot express cross-frame conditionality: a sub-field gated on a value in an enclosing frame … `activatedBy` resolves same-frame siblings and top-level answers only."** | **FALSE since inc-031/inc-035.** `features/commodities/obligations.js:25-35` gates `animalIdentifiers[j].animalIdentifierPassport` on the **enclosing** `commodityLines[i].commoditySelection` via `frame: 'enclosing'`, interpreted at `engine/evaluate/predicate.js:38-48`. The doc's stated hard limit is the model's flagship capability. |
| 2 | `add-a-collection.md:92` — "the same **three** operators apply: `equals`, `includes`, `present`" | **Four.** `engine/evaluate/predicate.js:12-28` adds `notInUnionOf`. |
| 3 | `limits.md:16` — "`complete.js#entryComplete` does **not yet** resolve enclosing gates" | **FALSE.** `engine/evaluate/complete.js:35` — `} else if (ctx && subObligation.activatedBy.frame) {`. DESIGN-DELTA #5 (`:107-141`) documents the fix. **limits.md contradicts DESIGN-DELTA in the same commit.** |
| 4 | `limits.md:26` — "M2's `animalIdentifiers` **restores** a depth-2 carrier" (future tense) | It is live. `features/commodities/obligations.js:121`. |
| 5 | `add-a-page.md:212,220` — "add an entry to the `GROUP_ROWS` literal … the progress line counts over `GROUP_ROWS.length`" | **`GROUP_ROWS` does not exist.** `grep` finds it only in this doc. The real edits are `flow/task-rows.js#taskRows` (`:24-51`) — **which no recipe doc mentions at all** — and `features/hub/controller.js#GROUPS` (`:21`). |
| 6 | `add-a-collection.md:43` and `obligation-model.md:157` show `typeSelection` inside `commodityLines.item` | Retired (spec conflict c-037). The live `item` is `[commoditySelection, speciesSelection, numberOfPackages, numberOfAnimalsQuantity, animalIdentifiers]` (`features/commodities/obligations.js:113-124`). |
| 7 | `README.md:5` — "The spike is a standalone **car-insurance journey**" | It is the live-animals import-notification journey. Vendored-spike residue in the doc index's first sentence. |
| 8 | `testing.md:94,96` name `nested-drivers.spec.js` and `hub-copy.spec.js` | Neither exists. The files are `nested.test.js` and `t2-hub-copy.test.js`. |

Plus the internal contradiction already noted: `add-a-field.md:16` ("five places") vs
`limits.md:74` ("three edits").

Pattern: **reference docs (`obligation-model.md`, `flow-and-gates.md`, `engine.md`,
DESIGN-DELTA) were maintained by the build loop; the how-to recipes and `limits.md` were
not.** The build loop updated what it read; it did not update what it wrote for humans.
That is exactly the failure mode you would predict, and it means A's docs need a
verification pass (cheap: ~1 day) before anyone trusts them as the basis of a third option.

---

## 6. Declarative vs imperative — the ledger for THIS dimension

| Concern | A |
|---|---|
| What data is owed | **DECLARATIVE** (`required`, `requiredAtLeastOne`, `requiredOneOf`) |
| When it is owed | **DECLARATIVE** (`activatedBy` × 4 operators × 3 frame modes) |
| What happens when it stops being owed | **DECLARATIVE** (`wipeOnExit`; there is no `setScope` and no per-key delete in the stack — `engine/write.js`) |
| How many entries a collection may hold | **DECLARATIVE** (`maxEntriesFrom` → sibling count obligation) |
| Which page owns an obligation | **DERIVED** (boot inversion of page-side `collects`) — not declared on either side |
| Section/hub status, prerequisites, page gates | **DERIVED** (1 authored gate in the entire flow) |
| Field label / hint / widget | **IMPERATIVE** — hardcoded English in `.njk` (32 templates, 1,499 LOC). No `type` on an obligation, no widget registry, no i18n. |
| Validation + its message | **IMPERATIVE** — `lib/validate` composed per controller. No validator on an obligation. |
| Conditional reveal markup | **IMPERATIVE** — restates `activatedBy` |
| Check-your-answers row + its visibility | **IMPERATIVE** — 25 hand-composed rows, 4 hand-coded scope restatements |
| Hub row title + hint | **IMPERATIVE** — `features/hub/controller.js#GROUPS` |
| Backend persistence of the field | **IMPERATIVE** — `notification-mapper.js`, 507 LOC, **69 `answers.` sites**, each field written by hand in up to 4 directions (2 mappers × forward/reverse) |
| Collection loop UI | **IMPERATIVE** — ~1,280 LOC across 4 controllers |

`docs/obligation-model.md:34-42` states the rationale outright: v1 carried `type`, copy,
widget and validation on the obligation, "a usage trace during the rebuild found that **no
runtime code read them**", so v2 dropped them. And `docs/obligation-model.md:139-143`:
*"anything that needs real branching belongs in a page controller. That is the pressure
valve."*

**So the honest reading is: A's model is not weak at extensibility — it is deliberately
scoped to state, and it discharges that scope very well. Its extensibility cost is entirely
in the presentation and persistence layers it refuses to model. Any comparison that credits
B with "one data edit adds a field" must ask whether B's data edit also produces the
Check-your-answers row, the reveal markup, the hub hint AND the backend mapper. If it does,
that is asymmetric capability and A structurally cannot answer it without growing a new
layer.**

---

## 7. Retrofit cost — what a third option would pay to take A's parts

| Take from A | Cost |
|---|---|
| The boot coverage assertion (`buildDispatch`) | **Low.** 74 LOC, needs only a page-side `collects` declaration. Buys "an unowned obligation crashes the server". |
| The contract test (declared == committed) | **Low.** 328 LOC of test, needs a page-side `collects` + a drivable POST handler. Buys "you cannot forget the wiring". |
| `frame: 'enclosing'` / `'anyItem'` / `notInUnionOf` | **Low-to-medium.** 69 LOC total (`predicate.js`), plus the `frames` chain from `registry.js#walk` (`:44-71`) and the opt-in `ctx` through `complete.js`. All three are opt-in and byte-for-byte backwards compatible (DESIGN-DELTA #3, #5, #7 each pin this). |
| `maxEntriesFrom` (cardinality by reference to a sibling count) | **Low.** 31 LOC (`engine/evaluate/cardinality.js`). |
| `requiredOneOf` (sibling-at-least-one group) | **Low.** ~10 LOC inside `entryComplete`. |
| The reachability/dead-end prover | **Medium.** 215 LOC, and it must be taught every new frame mode (DESIGN-DELTA #3 records exactly that debt being paid twice). |
| The recipe docs | **Free, but they need a correctness pass first** — see §5. |

| Do NOT take from A without eyes open | Why |
|---|---|
| The hand-composed CYA (495 LOC) | It is the honest cost of no widget model. If the third option models widgets, this disappears — and A has no answer to that. |
| The by-hand mapper (507 LOC, 69 sites) | Every new field is 4 more mapper edits, untracked by any guard. |
| Hardcoded English copy in 32 `.njk` | No i18n seam exists at all. Welsh = touch all 32 templates. |

---

## 8. Two things A does that a config-first model would have to work to match

Stated as capability claims with evidence, for the asymmetry hunt:

1. **The model cannot lie about ownership, and a page cannot hand-roll a wipe.** There is
   no `setScope` and no per-key delete anywhere in the write surface
   (`engine/write.js`, 95 LOC — the *only* side-effecting module); scope and the wipe set
   are re-derived from the answers on **every read and write**
   (`engine/evaluate/reconcile.js:48 LOC`), so a resumed draft self-heals to current
   scope. A config-driven engine that lets a page write a key directly cannot make this
   guarantee by construction; it has to enforce it.
2. **Relationships are real JS object references, not strings/UUIDs.**
   `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` — a misspelt
   reference throws at module load; a misspelt id in a JSON config silently matches nothing
   (`docs/obligation-model.md:91-98`). A boot text-scan guard (`obligation-purity.js`, 46
   LOC) then proves no `obligations.js` imports anything but another `obligations.js`.
   **Cost:** this is exactly what makes the model un-serialisable — you cannot ship A's
   model as data over a wire or edit it in a CMS, and `notInUnionOf` (complement-by-
   reference at runtime) makes that structural, not incidental.
