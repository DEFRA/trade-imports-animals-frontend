# L2 — Documentation and extensibility ("how do I add a field?")

**A** = `clone-live-animals` @ b6ac2ed, `prototypes/standalone/live-animals/`
**B** = `clone-flow-layer` @ d59b432, `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

**VERDICT: B-better** — decisively on the headline probe, and *not* because B is less
finished. But the standing prior ("B's model is better, possibly in every respect") is
**REFUTED on one axis**, and it is the axis a third option most needs to get right.

---

## 1. The count (all re-verified at source, not taken from L1)

| Probe | A | B |
|---|---|---|
| **Conditionally-required field, existing page** | **8–11 files / ~16 edit sites**, of which **exactly 1** is a declarative model fact | **5 files / 11–12 edit sites**, of which **0** are imperative code |
| **New page** | 10 files / ~15 sites | **1 required file** (`flow/flow.js`); 3 with copy |
| **New collection** | model: 29 lines. Loop UI: **~1,280 LOC hand-written** across 2 collections | model: 1 file. Browser layer: **~8 files / 10+ places** |
| **Design prose** | 19 files / 4,173 LOC — **3 of 3 recipes**, 8 doc-vs-code lies | 10,713 LOC — **1 of 3 recipes**, no README, 2 doc lies |

The raw *site counts* are close (16 vs 12). **The counts are a trap.** What differs is the
**kind** of edit. A's edits scale with the **presentation surface** — one njk macro, one
POST value-map line, one CYA row, one CYA visibility ternary, up to four mapper directions,
*per field, forever*. B's edits scale with the **declaration surface**, and the presentation
surface is amortised across all fields.

### The single most damning piece of evidence is in A's own docs

`docs/limits.md:74`:

> | "Add a field" | Honestly means three edits… **v1 could sometimes do it with one data edit — but only for uniform standard-widget pages.** |

A's own limits page concedes the exact capability B built, and dismisses it as only viable
for "uniform standard-widget pages". B then went and shipped it for **31 pages / 44
obligations** with an address composite, computed enums and multi-selects. A's stated reason
for dropping the v1 data-edit path does not survive contact with B's evidence.

---

## 2. What B derives that A hand-writes (the core asymmetry)

Verified consumer-by-consumer:

- **Widget choice is derived, never declared.** `lib/field-widgets.js:68-335` is an ordered
  first-match-wins rule table. `entry.type === 'enum'` + ≤5 options → radios; >5 → select
  (`RADIO_MAX = 5`, `:64`, `:117`); integer → number; address → composite.
- **CYA is generic and reads scope from the engine.**
  `features/check-your-answers/controller.js:207-209` —
  `for (const [oblId, impl] of Object.entries(state.obligations)) { … if (!obligation || !impl.inScope) continue }`.
  A new obligation gets a row, a formatted value and a working Change link for **zero** edits.
- **Validation + error copy are derived.** `contract.js:284-291` calls `validateObligation`
  generically per descriptor; `lib/format-domain-errors.js` maps codes to the GOV.UK
  `{errorList, fieldErrors}` shape.

Now A, same field (`regionOfOriginCode`), `features/check-answers/controller.js:106-119`:

```js
row('Region of origin code required',
    YES_NO_LABEL[answers.regionOfOriginCodeRequirement] ?? '',
    'regionOfOriginCodeRequirement'),
...(answers.regionOfOriginCodeRequirement === 'yes'
  ? [ row('Region of origin code', answers.regionOfOriginCode, 'regionOfOriginCode') ]
  : []),
```

Three hand-written things in one row: **the label**, **the value formatter**, and **the
visibility rule** — the last being a third restatement of an `activatedBy` the model already
knows (`features/origin/obligations.js:15`). The file **never reads `scope` for row
visibility** (only `:491`, the POST redirect); there are 4 such restatements (`:111`, `:150`,
`:301`, `:304`).

**L1-A called this "FIXABLE CHEAPLY — export the predicate". That is only one-third right.**
Exporting `applyPredicate` collapses the *visibility* ternary. It does nothing for the label
or the value formatter, because **an A obligation carries no label and no type to derive them
from** — `docs/obligation-model.md:36-42`: *"There is deliberately no `type`, no copy, no
widget choice and no validation on an obligation."* A must hand-write the row regardless.
That is the structural half, and it is why A's per-field cost never amortises.

---

## 3. Where the standing prior is REFUTED: B's gates are code, A's are data

This is the finding that survives the exercise, and it runs against the prior.

**A's scope rules are 100% data.** `activatedBy` is a literal drawn from a closed
4-operator vocabulary — `equals` / `includes` / `notInUnionOf` / `present`
(`engine/evaluate/predicate.js:12-28`), interpreted in one place. Even A's two helper
*functions* (`features/commodities/obligations.js:25`, `:62`) are **data-literal factories**
returning `{ obligation, frame, includes }` — not closures. Every gate in A is enumerable,
diffable and analysable without executing it.

**B's scope rules are closures.** `applyTo` is `(fulfilments, idsByObligation) → Decision` —
Turing-complete JS. Classified all 39 `applyTo` in `obligations/obligations.js`:

| Gate shape | Count | Introspectable by tooling? |
|---|---|---|
| bare closure `() => ({inScope:true, status:'mandatory'})` | **18** | **NO** — no `.metadata` → `data-dictionary-sketch.js:34` reports `{kind:'custom-applyTo'}` |
| `branchedGate(...)` | **5** | **PARTIAL — the condition is INVISIBLE.** `helpers.js:135-139` metadata is `{type, whenTrue, whenFalse}`. **The predicate is not in it.** |
| `allowListedByPredicate(...)` | 2 | partial — exposes a *function* (`helpers.js:88`) |
| `allowListed` / `anyAllowListed` | **8** | **YES** — `{obligation, values, projection}` |

**Only 8 of 39 gates (21%) are fully introspectable as data.** And the shape B uses for the
canonical *conditionally-required field* — `branchedGate` (`obligations.js:282-291`) — is one
where the metadata sidecar **records the outcomes but not the condition**. So B's own
data-dictionary can tell a stakeholder *that* a field is conditionally mandatory but **not
what the condition is**. Worse, the 18 trivially-constant "always mandatory" obligations are
opaque to the dictionary too, purely because they were written as closures.

B rejected the declarative DSL with reasons (`GAPS.md:62-86`) and calls the loss a
"Trade-off accepted" (`obligations.md:759`). It is a defensible trade. But it means:

> **The two sides are data-shaped in complementary halves.**
> **A: gates = data, presentation = code. B: gates = code, presentation = data.**

That is the deliverable. The third option is not "pick B" — it is **B's domain/presentation
derivation + A's closed-vocabulary `activatedBy`**, which is a combination neither side has.

---

## 4. Two A claims that DIE on inspection

**(a) Cross-frame conditionality is NOT asymmetric to A.** A's flagship (DESIGN-DELTA #3/#5,
`frame: 'enclosing'`) is fully expressible in B via `projectionGroup`. `helpers.js:32-37`
states it outright: *"For depth-N > 1 gates (gate at a broader identity level than the gated
obligation), pass the gated obligation's parent group as `projectionGroup`."* Live at
`obligations.js:636` — `allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, [...])`
gates a per-**unit** obligation on the enclosing **line**'s commodity code. Identical
semantics, and B's is *more* general (arbitrary projection + arbitrary predicate).

**(b) `wipeOnExit` is not A-only.** B purges out-of-scope storage in the evaluator
(`obligations/evaluator.js:327-333`, `purgeStorage`), and retention-instead-of-purge is what
`branchedGate`'s both-branches-in-scope shape is for (`helpers.js:123-131`).

---

## 5. Where A genuinely wins: the guard is by construction, not by test

`flow/dispatch.js:62` — `throw new Error("Obligations collected by no page: …")`, plus `:46`
for double-collection. Declare an obligation and forget to wire it and **the server refuses to
boot**; because nearly every test calls `buildDispatch` in `beforeAll`, the whole suite goes
red. `contract.test.js` then asserts committed == declared per page.

B has **no equivalent at the flow layer**. Confirmed: `grep` for `presents|pages()` across
`obligations/coverage.test.js` returns **nothing** — the coverage test only checks the
*domain* layer (`:81-86`). An obligation can be declared, domain-wired, pass all 649 tests,
and be **presented on no page: invisible in the UI, and green**. `statusOfJourney` walks the
flow (`contract.js:91-93`), so it cannot even block completion. This directly contradicts
`docs/add-an-obligation.md:3-6` ("skip a step and either tests fail or the field never appears
in the UI").

**But this is NOT structural** — it is a missing ~15-line test (walk `pages()`, diff against
the manifest, minus a `PRESENTATION_EXEMPT` list mirroring `KNOWN_UNWIRED`). It is the
**highest value-per-line steal on the board** and belongs on the shopping list. It does not
rescue A's verdict.

---

## 6. Documentation

| | A | B |
|---|---|---|
| Volume | 4,173 LOC / 19 files | 10,713 LOC |
| Change-recipes | **3 of 3** (field/page/collection), 764 LOC | **1 of 3** (field only) |
| Entry point | `docs/README.md` with a prescribed reading order | **none** — no root README; `RECOMMENDATION.md` fills it by accident |
| Best single doc | `DESIGN-DELTA.md` (15 deltas, each naming carrier + back-comp argument + proving test) | **`docs/add-an-obligation.md`** (1,164 LOC, 8 worked examples recording *what actually broke*) |
| Doc-vs-code lies | **8 — all under-selling the model** | 2 |

**B's one recipe is better than any single one of A's** — it is a lab notebook, not a
tutorial: it tells you what will break (`:905-912` "Iteration 2 broke 10 tests"). **A's doc
*set* is better organised** and is executable enough that an automation consumes it verbatim
(`.claude/skills/prototype-element/SKILL.md:25-27`).

But A's recipes are **stale in the most damaging way possible**. Verified at source,
`docs/add-a-collection.md:254-260`:

> **## The one hard limit**
> The model cannot express cross-frame conditionality… `activatedBy` resolves same-frame
> siblings and top-level answers only.

This declares as *the one hard limit* precisely the capability that
`features/commodities/obligations.js:25-35` + `predicate.js:38-48` **now deliver**. A dev
reading A's docs would design *around* A's best feature. Pattern: the build loop maintained
the **reference** docs (which it read) and let the **human recipes** rot (which it wrote).
`flow/task-rows.js` — a mandatory edit for every new page — appears in **no recipe at all**,
and `add-a-page.md:212` sends you to `GROUP_ROWS`, a symbol that exists **nowhere but that
doc** (2 grep hits, both in the doc).

B's worst lie is narrower but real: `obligations.md:2075` "Cosmetic renames are safe" is
**false** — `field-widgets.js:83` keys `OBLIGATION_MULTI` by obligation **`name`**, so
renaming `name: 'species'` silently downgrades a checkbox group to a select, and no test
fires.

**Neither doc set is trustworthy as-is.** A needs a ~1-day correctness pass; B needs a README
and two more recipes.

---

## 7. Verdict

**B-better.** On the actual probe — *how many places to add a conditionally-required field* —
B is 5 data files vs A's 8–11 files with ~15 imperative sites, and B's number **does not grow
with the presentation surface**. B's field renders, validates, error-summarises, appears on
CYA with a working Change link and moves the task-list status with **zero imperative code**;
A's does none of that without hand-written label, formatter, reveal markup, CYA row and
visibility ternary. Against the real requirement set (V4 has ~44+ fields and growing), A's
model imposes a per-field tax that B has already amortised.

**This is not a "B is less finished" artefact.** B's win is in the *model's shape* — the
`type`→widget→CYA derivation chain — not in feature count. Conversely, A's breadth (upload,
amend, persistence, Mongo parity) is **entirely orthogonal to this dimension** and earns it
nothing here: none of it makes adding field #45 cheaper. Scoring the model, not the mileage,
B wins.

**But the prior is wrong that B is better in every respect.** A's gates are total, closed-
vocabulary data; B's are closures that are 79% opaque to its own tooling — including the
condition of every `branchedGate`, the shape B uses for conditional requiredness. And A's
add-and-forget guard is a **boot crash**, where B's has a hole it does not know about.

**Shopping list for the third option:**
1. B's `domain` + `presentation` + widget-derivation chain (the whole reason B wins).
2. A's `activatedBy` closed 4-operator vocabulary **replacing** B's `applyTo` closures — buys
   back 100% static introspectability, with `allowListedByPredicate` retained as a *declared*
   escape hatch so the totality property is explicit where it is broken.
3. A's boot dispatch assertion + contract test, applied to B's `presents` (same shape as
   `collects`) — closes B's invisible-and-green hole by construction.
4. B's `coverage.test.js` (190 LOC, near-zero deps) and `i18n-coverage.test.js`.
5. A's `DESIGN-DELTA` discipline (carrier + back-compat argument + proving test per change)
   applied to B's docs; B's `add-an-obligation.md` "what actually broke" format applied to the
   page and collection recipes neither side has written properly.
6. Neither side solves the collection loop UI. A hand-writes ~1,280 LOC per pair of
   collections; B hard-codes exactly two (`routes.js:154` branches on `=== unitRecord` by
   **identity**, so a third collection mis-routes **silently**). This is unsolved on both
   sides and should be scoped as new work, not inherited.
