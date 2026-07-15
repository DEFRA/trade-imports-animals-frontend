# L1 — Documentation and extensibility ("how do I add a field?") — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
All paths below are relative to that root unless stated.

---

## Headline

On Side B, **adding a field is a data edit in 5 files (~11 edit sites) and nothing else**. You
write no controller, no template, no route, no view-model, no CYA row, no validation call-site.
Rendering, widget choice, validation, error summary, task-list status, `/start` routing,
Change-links and CYA rows all fall out of the two declarations (obligation record + domain entry).
That is the single strongest extensibility claim on either side and it is **real** — I traced
every consumer.

The cost is paid in three places, all documented, one of them undocumented:

1. **i18n indirection.** Every string is a message key; a field needs an `en.json` bucket, a
   `presentation.js` key entry, and (for enums) a `domain.<bucket>.*` label bucket. That is 3 of
   the ~11 edit sites, and they exist only because the spike built an i18n layer nobody asked for.
2. **A new *collection*** (a third indexed group, or a depth-3 group) is **~8 files / 10+ places**
   in the browser layer, even though the *model* takes it in one. Depth is data-driven in the
   model and hard-coded in the browser layer.
3. **The "add-and-forget" gate only guards the domain layer.** An obligation wired to domain but
   never presented in `flow.js` is invisible in the UI, does not block journey completion, and
   **no test fires**. The doc claims otherwise.

Docs: 10,713 lines. `obligations.md` (3,010 lines) is a *model spec* and would not by itself make a
new dev productive. `docs/add-an-obligation.md` (1,164 lines, 8 worked examples that record what
actually broke each time) is the productivity doc and it is genuinely excellent. But there is
**no `add-a-page.md`, no `add-a-collection.md`, and no README at the spike root** — 10.7k lines of
documentation with no entry point.

---

## 1. THE COUNT — add ONE conditionally-required field to an EXISTING page

Worked concretely: add `exporterReference` (free text, max 30, **required only when
`reasonForImport === 'internal-market'`**) to the existing `reason-for-import` page.

| # | File | Edit sites | What |
|---|---|---|---|
| 1 | `obligations/obligations.js` | 3 | (a) reason const (`:54-120` block); (b) the obligation record with `applyTo: branchedGate(...)`; (c) append to the `obligations` array (`:793-838`) |
| 2 | `domain/index.js` | 3 | (a) add name to the import block (`:27-68`); (b) `predicate('string', stringMaxLength(30, ...), [reasons.stringMaxLength])`; (c) register in the `domain` Map (`:1150-1194`) |
| 3 | `lib/presentation.js` | 2 | (a) import (`:17-58`); (b) `OBLIGATION_KEYS` entry (`:69`) |
| 4 | `locales/en.json` | 1–2 | `presentation.exporterReference.{pageTitle,legend,hint}`; plus `errors.exporterReference.required` if `mandatoryToProceed` |
| 5 | `flow/flow.js` | 2 | (a) import (`:42-85`); (b) `presents` entry on the existing page (`:137-139`), optionally `mandatoryToProceed: true` + `errors.required` key |

**TOTAL: 5 files, 11–12 edit sites. Zero imperative code.** The conditional-requirement itself is
ONE helper call:

```js
applyTo: branchedGate(
  (fulfilments) => fulfilments[reasonForImport.id] === 'internal-market',
  { inScope: true, status: 'mandatory', reasons: [reason] },
  { inScope: false }
)
```
(pattern verbatim from `obligations/obligations.js:282-291`)

**What you do NOT touch — verified by reading each consumer:**

- **No route.** `routes.js:150` generates routes by walking `pages()`; the page already exists.
- **No controller.** `lib/page-controller.js` (111 loc) drives all 20 static pages from the flow
  declaration alone.
- **No template.** 8 `.njk` files (299 loc total) serve all 31 pages; `shared/partials/fields.njk`
  (50 loc) is a `switch` on `item.type`.
- **No widget wiring.** `lib/field-widgets.js:68-335` is an ordered first-match-wins rule table:
  `entry.type === 'enum'` + ≤5 options → radios; >5 → select; `'integer'` → number input;
  `'date'` → text; `'address'` → composite; else text. **Widget choice is derived, never declared.**
- **No validation call-site.** `contract.js:284-291` calls `validateObligation(...)` for every
  descriptor on the page generically.
- **No error plumbing.** `lib/format-domain-errors.js:139-158` maps domain error records to the
  GOV.UK `{errorList, fieldErrors}` shape by code.
- **No CYA row.** `features/check-your-answers/controller.js:22-26` imports the whole manifest and
  walks it; a new obligation gets a row, a formatted value and a Change link for free.
- **No status/navigation change.** `engine/index.js` re-derives container status from the subtree.

### The two surcharges the doc does not put on the checklist

- **Multi-select (checkbox) fields cost a 6th file.** `lib/field-widgets.js:56-62`:
  ```js
  const OBLIGATION_MULTI = new Set([
    'transitedCountries', 'species', 'animalsCertifiedFor'
  ])
  ```
  A hard-coded set **keyed by obligation `name`**, consulted at `:83`, `:116` and `:151`. Any new
  array-valued field must be added here or it silently renders as radios/select. This is the one
  place the browser layer reaches back into obligation names, and it is the counter-example to the
  spike's own "templates never see obligations" claim.
- **A new failure code costs 3 extra places + 1 en.json key:** `domain/index.js:75-125` (`reasons`
  registry) → `lib/format-domain-errors.js:21-68` (`COPY` dispatcher) → `:76-90`
  (`FORMAT_ERROR_KEYS`, walked by the coverage test) → `locales/en.json`. The doc flags this once,
  buried in iteration 5's retro (`docs/add-an-obligation.md:352-356`), not in the checklist.

---

## 2. THE COUNT — add a NEW PAGE

**1 required file: `flow/flow.js`** — one node in a subsection's `children`:

```js
{ page: 'exporter-reference', presents: [{ obligation: exporterReference }] }
```

Route (`routes.js:150-205`), controller (`makePageController`), template and task-list membership
all follow. Optionally `+1` `lib/presentation.js` `PAGE_KEYS` entry and `+1` `en.json` bucket for
the page title (missing → `humaniseId` fallback, `presentation.js:411-412`).

A **new subsection** = the same, plus a `titleKey` and an `en.json` entry. A **new section** = same.

**Real cost is test churn, and the doc is honest about it.** `docs/add-an-obligation.md:905-912`:
inserting two pages mid-flow "broke 10 tests" — `nextAfter` targets, `firstUnfulfilledPage` descent
order, subsection rollups, `dump.test.js` snapshots. That is the price of pinning navigation in
assertions rather than deriving it.

---

## 3. THE COUNT — add a NEW COLLECTION (the asymmetry that matters)

**In the MODEL: 1 file.** Declare a group obligation and point leaves at it with `within`. The
evaluator is depth-agnostic — composite `/`-delimited keys, ancestor-AND scope, cycle-checked.
`obligations.md:2819` records this as settled ("Nested indexing — implemented pattern (settled at
any depth)").

**In the BROWSER LAYER: ~8 files, 10+ places.** Every one verified:

| File | Evidence | What breaks |
|---|---|---|
| `routes.js:154` | `if (page.presentsForEach.forEachOf === unitRecord)` | Identity branch. **Exactly two collections are routable.** A third `forEachOf` falls through into the `commodityLine` branch and is mis-routed to `/lines/{lineId}/{page}`. |
| `lib/*-page-controller.js` | 3 parallel factories: `page-controller.js` (111), `line-page-controller.js` (141), `unit-page-controller.js` (179) | A 4th factory needed |
| `engine/index.js` | `firstUnfulfilledPageForLine`, `firstUnfulfilledPageForUnit` | A 3rd primitive needed |
| `contract.js:135,152` | `nextAfterForLine`, `nextAfterForUnit` | A 3rd seam fn needed |
| `lib/state.js:97,120,186,206` | `addCommodityLine` / `deleteCommodityLine` / `addUnitRecord` / `deleteUnitRecord`, plus `NEXT_LINE_ID_KEY` + `NEXT_UNIT_ID_BY_LINE_KEY` (`:14-16`) and a matching `resetState` clear (`:228-232`), plus hard-coded id prefixes `` `line${n}` ``/`` `unit${n}` `` | A 3rd add/delete pair + counter + cascade |
| `features/<x>/controller.js` + `list.njk` | `features/commodity-lines/controller.js` (227), `features/units/controller.js` (308) | Bespoke Add-another UX — **explicitly not a flow primitive** (`RECOMMENDATION.md:180-188`, and `obligations.md:2879` "Flow-primitive Add-another (deferred)") |
| `features/hub/controller.js:80-84` | `if (subsection.id === 'commodity-lines-manage' \|\| … === 'per-unit-records') return \`${BASE}/lines\`` | Hard-coded subsection-id branch for the task-list href |
| `features/check-your-answers/controller.js:34-57` | `/^line(\d+)$/` regex + composite-key ordinal helpers | Human labelling of the new instances |

**This is the clean statement of Side B's structural limit: the model is collection-count- and
depth-agnostic; the browser layer is hard-coded to exactly two collections at exactly two depths.**
It is real code, it works, and it is *not* a model defect — but a third collection costs about as
much as the second one did (iteration 9 was, in the author's own words, "90% foundational
plumbing" — `docs/add-an-obligation.md:563`).

---

## 4. What is MODELLED vs HANDLED IMPERATIVELY

**Modelled declaratively (data the engine interprets):**
- Page composition, section/subsection tree, task-list membership (`flow/flow.js`, 667 loc, zero
  visibility rules).
- Widget choice — derived from `entry.type` + option count (`field-widgets.js`, `RADIO_MAX = 5`).
- Value legality — 40 domain entries, 4 factory shapes (`domain/index.js:1150-1194`).
- Status (5-way), navigation, Change-links, CYA rows — all derived.
- Route generation — walked from the flow at register time.

**Declared as a FUNCTION, not data (the deliberate middle ground):**
- **Scope/mandate.** `applyTo` is a closure. For 4 common shapes there are factories
  (`helpers.js:39,65,101,132`) that attach a `.metadata` sidecar so tooling can still introspect.
  Novel gates are hand-written JS. The DSL was prototyped and **rejected with reasons** —
  `GAPS.md:62-86` ("Idiomatic JS … Testable at obligation level without other units … Composes with
  JS operators"). This is a considered trade, not an omission. Cost: `data-dictionary-sketch.js`
  only sees gates built from the 4 helpers; a bespoke `applyTo` reports `{kind:'custom-applyTo'}`
  (`data-dictionary-sketch.js:34`).

**Handled imperatively (real, working, hand-coded per case):**
- Add-another UX at both depths (2 bespoke controllers, 535 loc).
- Collection routing/state/id-minting (see §3).
- The multi-select widget set (`OBLIGATION_MULTI`).
- Task-list hrefs for collection subsections.

**Absent:** persistence beyond session, upload, auth, amend/resubmit, Welsh, client JS. Out of
scope for this dimension but they mean "add a field" has never been tested against a
backend mapper, a submitted-notification freeze, or a Welsh translation.

---

## 5. THE GUARD RAILS — the best idea on Side B, and its hole

`obligations/coverage.test.js` (190 loc) is the anti-add-and-forget gate and is worth stealing
regardless of who wins:

- `:81-86` every obligation has a domain entry **or** is on `KNOWN_UNWIRED` (which is down to 4:
  2 structural groups + 2 system-populated).
- `:88-97` the allow-list cannot rot the other way.
- `:99-105` no orphan allow-list names.
- `:108-137` `within`-chain cycle detection (a self-loop **hangs** the evaluator — caught in 3 ms).
- `:139-170` id + name uniqueness.

`i18n-coverage.test.js` (222 loc) is the second gate: it walks `flow.js` title/error keys,
`presentation.js` keys, domain label keys, address sub-field keys and `FORMAT_ERROR_KEYS` and
asserts each resolves in `en.json`. Forget a string, CI goes red.

**The hole.** `docs/add-an-obligation.md:3-6` claims: *"Skip a step and either tests fail or the
field never appears in the UI — both loud enough to catch the omission."* Two of the nine steps
fail that claim:

- **Skip step 3 (presentation)** → `presentation.js:420-425` falls back to `humaniseId(obligation.name)`.
  The field renders with a machine-derived label. **No test fires.** (`docs/testing.md:593-618`,
  mutation 16, concedes presentation-copy drift is an open, deferred gap.)
- **Skip step 4 (flow)** → the obligation is in the manifest, has a domain entry, passes
  `coverage.test.js`… and is presented on no page. `statusOfJourney` walks the flow
  (`contract.js:91-93`), so it does not block completion either. It is simply **invisible, and
  green.** Nothing in the 649 test declarations asserts "every non-system obligation is presented
  somewhere". This is the exact mutation the coverage test was built to prevent, one layer up.

---

## 6. DOC-vs-CODE DISAGREEMENTS

1. **`obligations.md:2075-2078` — "Cosmetic renames are safe. Rename in the model: change `name`,
   leave `id` alone."** **False.** `field-widgets.js:56-62` keys `OBLIGATION_MULTI` by `name`.
   Rename `name: 'species'` → `'speciesList'` (keeping the export binding) and the field silently
   drops from a checkbox group to a `select` (8 options > `RADIO_MAX`). Neither
   `routes.test.js:961-984` (asserts `name="species-line1"` and the option *text*, both of which a
   `select` also emits) nor `field-widgets.test.js:63-77` (uses a synthetic
   `{ name: 'transitedCountries' }`, so it tests the Set, not the coupling) would fail.
   `docs/testing.md:28-61` mutation 1 renames the *export binding*, not the `name` string — so the
   rename-safety claim is untested. `KNOWN_UNWIRED` is also name-keyed but *is* guarded
   (`coverage.test.js:99-105`); `OBLIGATION_MULTI` is not.
2. **`docs/add-an-obligation.md:3-6`** — "skip a step and tests fail" (see §5 hole).
3. **`docs/add-an-obligation.md:1152-1165`** — honest self-report: no `add-a-page.md`, no
   `add-a-subsection.md`, bespoke controllers out of scope. Credit where due, but it means the doc
   set covers 1 of the 3 change-recipes A documents.

---

## 7. DOCUMENTATION ASSESSMENT — would a new dev be productive?

| Doc | LOC | What it is | Would it make a new dev productive? |
|---|---|---|---|
| `docs/add-an-obligation.md` | 1,164 | 9-step checklist + **8 worked examples written as each iteration ran**, each recording what actually broke (iteration 2: "10 tests fell over"; iteration 10: "manifest-declaration order is not a design signal for UX") | **Yes — outstanding.** This is the single best onboarding artefact on either side for the field case. It is co-evolved with the code, not written after. |
| `obligations.md` | 3,010 | Canonical model spec: terminology, evaluator algorithm + TS types, key-properties table, group invariants, 15 primitives, contract seam, persistence, staleness, status alphabet, a settled/deferred register (`:2685-2888`) | **Not on its own.** It is a *specification*, not a tutorial. Superb for "why is it like this" and for anyone extending the *model*; too long and too abstract to get a dev shipping a field. Its real value is that every design question has a written ruling. |
| `RECOMMENDATION.md` | 614 | Spike ADR: 3-layer table, D1–D5 decisions, trade-offs table, **5-minute playback script** (`:58`), file map (`:506`) | Yes — this is the de-facto entry point and does the job. |
| `docs/testing.md` | 644 | 4 test levels + a **16-mutation register** naming the specific ways the model could silently rot, with 4 gaps found and 3 closed in-session | Yes — and it is the honest one. It names its own gaps. |
| `GAPS.md` | 219 | Gap log from modelling V4; `:62-86` is the reasoned rejection of a declarative gate DSL | Yes, for anyone tempted to re-litigate the DSL. |
| `NEXT.md` | 1,367 | Living handoff / session log | Marginal. Chronological, not navigable. |

**Missing:** a root `README.md`. There is `e2e/README.md` and nothing else. 10,713 lines of docs with
no "start here". `RECOMMENDATION.md` fills the role by accident.

**Verdict on the doc set:** B's documentation is *deeper* than A's on the model and *narrower* on
the change-recipes. B has 1 of 3 recipes (field/obligation), A has 3 of 3
(`add-a-field.md`/`add-a-page.md`/`add-a-collection.md`). B's one recipe is better than any single
one of A's because it is a lab notebook, not a tutorial — it tells you what will break.

---

## 8. THE ASYMMETRY — stated plainly

**What B does that A structurally cannot (cheaply):** a new field on Side B **renders, validates,
error-summarises, appears on CYA with a working Change link, and moves the task-list status with
zero imperative code**. Side A's own doc concedes the inverse in its opening paragraph
(`clone-live-animals/prototypes/standalone/live-animals/docs/add-a-field.md:8-14`):

> "The model never renders. Declaring an obligation buys you the state-layer behaviour only… You
> author the rendering, the validation, the persistence wiring and the Check your answers row by
> hand. That is the paradigm's deliberate inversion."

So A's 5 places are *5 places of hand-written code across model + controller + template + CYA*; B's
5 files are *5 files of data*. Raw file counts are similar (A: 5 places / ~4 files; B: 5 files /
~11 sites) — **the counts are a trap. The difference is what kind of edit each one is.** A's edits
scale with the *presentation surface* (one njk macro, one view-model line, one POST line, one CYA
row per field, forever). B's edits scale with the *declaration surface* (one record, one domain
entry, one key bucket) and the presentation surface is amortised across all fields.

**What A does that B cannot:** B cannot express a third collection or a depth-3 group **in the
browser layer** without a new page-controller factory, a new engine primitive, a new contract fn, a
new state add/delete pair and a new `routes.js` identity branch. The *model* can. (Whether A can is
for the A-side worker to say — but A's `page-owned-spine` gives pages imperative control, which is
usually cheaper for one-off structures and more expensive for the 44th field.)

**Retrofit cost of stealing B's model into A:** the three layers are cleanly separable —
`obligations/` (1,577 loc: manifest + evaluator + helpers), `domain/` (1,194 loc), `engine/`
(601 loc) and `contract.js` (338 loc) have **no Hapi, no yar, no njk imports**. They lift out. What
does *not* lift out is the i18n indirection (`presentation.js` + `locales/en.json` + 3 coverage
tests) and the 8-template widget dispatch, which is where the "free rendering" actually lives —
take the model without the widget dispatch and you inherit the declaration cost without the payoff.
The single cheapest steal, at any price, is `obligations/coverage.test.js` (190 loc, zero
dependencies on the rest of the spike beyond the two manifests).
