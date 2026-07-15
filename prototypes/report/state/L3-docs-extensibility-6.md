# L3 — Adversarial verification — DE-6 (docs-extensibility)

**Verdict: AMENDED.** The spine of the claim survives contact with the source. Four of its
supporting specifics do not.

A = `clone-live-animals` @ b6ac2ed, `prototypes/standalone/live-animals/`
B = `clone-flow-layer` @ d59b432, `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. What I verified at source and could NOT break

| Assertion | Status | Source |
|---|---|---|
| A has 3 change-recipes, B has 1 | **HOLDS** | A: `docs/add-a-{field,page,collection}.md`. B: `find -maxdepth 2 -name "*.md"` → `RECOMMENDATION.md`, `NEXT.md`, `PLAN.md`, `obligations.md`, `docs/testing.md`, `docs/add-an-obligation.md`, `e2e/README.md`. One recipe. |
| The "one hard limit" quote is real and verbatim | **HOLDS** | `docs/add-a-collection.md:254-260` — "## The one hard limit / The model cannot express cross-frame conditionality… `activatedBy` resolves same-frame siblings and top-level answers only." |
| …and it is FALSE against the code | **HOLDS** | `features/commodities/obligations.js:25-35` — `const enclosingCommodity = (includes) => ({ obligation: commoditySelection, frame: 'enclosing', includes })`, carried live by `animalIdentifierPassport` (:31-35). Interpreted at `engine/evaluate/predicate.js:38-48` (`if (activatedBy.frame === 'enclosing')`, walks `frames.slice(1)` outward). Completeness honours it too: `engine/evaluate/complete.js:35` — `} else if (ctx && subObligation.activatedBy.frame) {`. The doc's stated hard limit is the model's flagship capability. |
| `GROUP_ROWS` exists nowhere but that doc | **HOLDS** | `grep -rn "GROUP_ROWS"` across the whole of A → exactly 2 hits: `docs/add-a-page.md:212` and `:220`. Zero in source. |
| `flow/task-rows.js` appears in no recipe | **HOLDS** | `grep -rn "task-rows\|taskRows" --include="*.md"` → `DESIGN-DELTA.md:565,584,611`, `docs/engine.md:146`, `docs/flow-and-gates.md:9,113,115,118`, `docs/features.md:186`. **Reference docs only. Not one hit in add-a-field / add-a-page / add-a-collection.** |
| B has no root README | **HOLDS** | Root file list contains `RECOMMENDATION.md`, `NEXT.md`, `PLAN.md`, `obligations.md` — no `README.md`. The only README is `e2e/README.md`. |
| B's recipe is 1,164 LOC, lab-notebook shaped | **HOLDS** | `wc -l docs/add-an-obligation.md` → 1164. `:905-912` verbatim: "**Adding an obligation early in the flow breaks navigation tests.** Iteration 2 broke 10 tests: `nextAfter` from country-of-origin now points at region-code-requirement…". |
| `obligations.md:2075` "Cosmetic renames are safe" | **HOLDS (quote)** | Verbatim, under `### Obligation identifiers — id + name` (:2056). And the UUID scheme is *shipped*, not proposed: `obligations/obligations.js:432-437` — `species` carries `id: '2318293a-…'` + `name: 'species'`. |
| `field-widgets.js:83` keys `OBLIGATION_MULTI` by `obligation.name` | **HOLDS** | `:56-62` — `const OBLIGATION_MULTI = new Set(['transitedCountries','species','animalsCertifiedFor'])`; `:83` — `if (!OBLIGATION_MULTI.has(obligation.name)) return null`. A name-keyed string table with no model-level binding. |

### One thing I found that makes the claim STRONGER than stated

`flow/task-rows.js` is not merely undocumented — **the missing edit is silent**. `buildDispatch`
(`flow/dispatch.js`) guards obligation→page, not page→row. Nothing guards page→row:
`grep -rn "taskRows"` finds only `features/hub/controller.js:14`, `flow/section-status.js:3,12`
and `flow/task-rows.test.js`, and `task-rows.test.js:209-233` tests gating, never coverage.
`section-status.js:12` — `readyForCheckYourAnswers` is `taskRows.every(...)`. So a new page
omitted from `task-rows.js` boots clean, passes the contract test, is **invisible on the hub**,
and its **required obligations do not block submit**. The one mandatory edit that appears in no
recipe is also the one mandatory edit that no guard catches.

---

## 2. Where the claim BREAKS

### (a) "8 doc-vs-code lies total, all under-selling" — FALSE

Only **4 of the 8** under-sell. Taking L1-A's own enumeration and re-reading each:

| # | Lie | Under-sells? |
|---|---|---|
| 1 | `add-a-collection.md:254-260` cross-frame "hard limit" | YES |
| 2 | `add-a-collection.md:91-92` "The same three operators apply: `equals`, `includes`, `present`" (verified verbatim; `predicate.js` has four — `notInUnionOf`) | YES |
| 3 | `limits.md:16` "`complete.js#entryComplete` does not yet resolve enclosing gates" (false — `complete.js:35`) | YES |
| 4 | `limits.md:26` "M2's `animalIdentifiers` **restores** a depth-2 carrier" (future tense; live) | YES |
| 5 | `add-a-page.md:212` phantom `GROUP_ROWS` | **NO** — misdirection to a symbol that never existed. Nothing under-sold. |
| 6 | `add-a-collection.md:43` retired `typeSelection` in the `item` list | **NO** — stale shape; if anything it *over*-states the model. |
| 7 | `README.md:5` "standalone car-insurance journey" | **NO** — vendored-spike residue. |
| 8 | `testing.md:94,96` name two test files that don't exist | **NO** — stale filenames. |

Two populations are being merged. "A's **recipes** are stale" and "**8 lies**, all under-selling"
cannot both be carried by the same set: **4 of the 8 are not in a recipe at all** (`limits.md` ×2,
`README.md`, `testing.md`). The honest split is: **3 recipe defects** (#1, #2, #5, of which two
under-sell), **2 limits.md defects** (both under-sell), **3 assorted stale references**.

### (b) "A dev would design around A's best feature" — OVERSTATED

The stale sentence's own link target refutes it, one hop away. `docs/limits.md:5` is headed
**"## Cross-frame conditionality (modelled in inc-031)"** and `:7-14` correctly documents all
three frame modes and names the live carrier. `add-a-collection.md:260` literally ends
"See [limits.md](limits.md)." So A's docs are **self-contradicting**, not uniformly wrong — a dev
who follows the link finds the truth. The risk is real (the recipe is the doc a newcomer opens,
and it is the one shouting a bold `## The one hard limit`), but "would design around it" should be
"could".

### (c) B's "worst lie" consequence is misdescribed — twice

1. **Not a select.** `domain/index.js:462` — `'0102': ['cattle', 'buffalo', 'bison']`. Three
   options. `RADIO_MAX = 5` (`field-widgets.js:64`), and the **radios** rule (`:102-117`) fires
   before select for a non-multi enum with ≤5 options. Rename `species` and forget
   `OBLIGATION_MULTI` and you get **radios**, not a select. The select outcome bites only >5-option
   lists (`transitedCountries`).
2. **A test does fire.** `e2e/journey.js:306` — `await checkBox(page, \`species-${lineId}\`, value)`,
   and `checkBox` (`:61-65`) locates `input[type="checkbox"][name="${name}"][value="${value}"]`.
   The Playwright walk fails on a radios/select rendering.

The **accurate and sharper** version of this finding, which I confirmed:

> The entire **node suite stays green**. `routes.test.js:961` is titled *"GET after adding a cattle
> line renders one checkbox group with cattle-list options"* — and asserts only
> `expect(res.payload).toMatch(/name="species-line1"/)` plus the option **labels** (`:982-987`).
> It **never asserts `type="checkbox"`**. Radios and a select both satisfy every assertion in the
> test whose name promises to be the guard. And `field-widgets.test.js:63-77` exercises the rule
> against a **stub literal** `{ name: 'transitedCountries' }`, not the real model, so it cannot
> notice a model rename either.

That is a better indictment than the one offered: not "no test fires" but "the test that is named
for this behaviour does not test it".

Also worth registering in mitigation: `obligations.md:2075` sits in a **persistence/migration**
section, and its safety claim is scoped to persisted data ("Persisted fulfilments are untouched"),
explicitly assuming "frontend + code start using the new name". The defect is that
`OBLIGATION_MULTI` is a *hidden, unenforced* name reference that a code-wide rename sweep can miss
with no compile error and no unit failure — not that the doc claims code needs no changes.

### (d) "B has no page/collection recipe" — TRUE ONLY OF STANDALONE DOCS

`docs/add-an-obligation.md:1152-1164`, **"## What this doc does not cover"**, names its own gap and
scopes it far more narrowly than the claim allows:

> - Adding a **new page** *without a new obligation* (i.e. presenting an existing obligation on a
>   new page too). See `docs/add-a-page.md` (**not yet written**).
> - Adding a **new subsection** or **new section** as its own structural change. **Included as a
>   sub-step of the checklist above because the two usually happen together**…

So page + subsection wiring **is** covered, as a sub-step of the main checklist, for the ordinary
case (new obligation on a new page). And the collection case has a **110-line worked example** —
`:556-667`, "iteration 9: `permanentAddress` (first depth-2 obligation — line → unit fan-out)",
walking `lib/state.js` ops, the `firstUnfulfilledPageForUnit` engine primitive, the
`nextAfterForUnit` contract seam, `lib/unit-page-controller.js`, `features/units/`, and the
`routes.js` `presentsForEach` branch. B's real doc gaps are: **no root README**, **no recipe for
presenting an existing obligation on a new page**, and no *standalone* collection doc — not "no
page/collection recipe".

(Minor: 9 `## Worked example` headings, not 8 — `:194, 232, 295, 358, 438, 556, 668, 775, 814`.)

---

## 3. Counter-example hunt — what I searched and did not find

- `grep -rn "GROUP_ROWS"` over all of A → no source symbol. The claim's phantom stands.
- `grep -rn "task-rows|taskRows" --include="*.md"` over all of A → no recipe mentions it. Stands.
- `grep -rn "frame"` in `engine/evaluate/predicate.js` and read `complete.js:25-42` → cross-frame is
  real in scope, wipe **and** completeness. The recipe's "hard limit" has no surviving defence.
- Searched B's whole tree for a second recipe or a root README → none. Searched `obligations.md`'s
  headings and `add-an-obligation.md`'s headings for embedded page/collection guidance → **found it**
  (checklist sub-step + iteration-9 worked example). This is the one place a genuine counter-example
  turned up.
- Searched B's tests for anything that would catch the `OBLIGATION_MULTI` rename → **found the
  Playwright `checkBox` helper**, which does. The node suite does not.

## 4. Conflates "not built" with "cannot be built"?

No. This claim is entirely about docs-vs-code drift and recipe coverage, not about structural
capability. Both defects it names are cheap to fix (A: a ~1-day doc correctness pass plus a
page→row coverage test; B: a README, an `add-a-page.md`, and one `expect(res.payload).toContain('type="checkbox"')`).
Neither is structural, and the claim does not pretend otherwise.

## 5. Does the claim credit a DOC the CODE does not honour?

It does the opposite — it catches docs the code has outrun (A) and a doc the code quietly
contradicts (B). That instinct is correct. Its error is arithmetic and rhetorical, not directional.
