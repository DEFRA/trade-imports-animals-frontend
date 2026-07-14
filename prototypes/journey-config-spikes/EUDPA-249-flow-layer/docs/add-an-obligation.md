# How to add an obligation to the V4 journey

Adding a new V4 field to the browsable prototype is a fixed sequence
of ~6 file edits. This doc is the checklist. Skip a step and either
tests fail or the field never appears in the UI — both loud enough to
catch the omission.

The doc is co-evolved with the code. Each iteration of step 4 in
`NEXT.md` refines the doc by running through it and recording where it
misled us.

## Prerequisites

- The obligation you want to add is already declared in
  [`obligations/obligations.js`](../obligations/obligations.js). This
  is almost always true — the parent EUDPA-277 spike declared ~42 V4
  obligations. If yours isn't there, add it (its own mini-checklist
  below in "Adding a brand-new obligation").
- The obligation is on the `KNOWN_UNWIRED` allow-list in
  [`obligations/coverage.test.js`](../obligations/coverage.test.js).
  You'll remove it at the end.

## The checklist

**Note on no-ops.** Steps 3 (presentation) and 4 (flow) can each be
no-ops. The initial spike shipped presentation copy for every V4
obligation, so if the copy is already accurate, step 3 is just a
verification. And if the obligation is already presented on an
existing page (this is common — the parent spike's `flow.js` presents
several obligations that don't have domain entries yet), step 4 is
also a no-op. In both cases, do the check, don't invent work. See
iteration 3's worked example.

1. **Confirm the obligation.** Look it up in `obligations/obligations.js`.
   Note the shape: is it a top-level singleton (`applyTo` at the
   root), is it `within: commodityLine` or `within: unitRecord`
   (group-scoped), does it have `applyTo` at all (structural groups
   don't)? The answer decides which factory you use in step 2. Also
   check whether the obligation is already presented on a page in
   `flow/flow.js` — if so, step 4 is a no-op.

2. **Add a domain entry** in
   [`domain/index.js`](../domain/index.js). Two edits in the same file:
   1. **Import the obligation** at the top of the file — add its name
      to the `import { ... } from '../obligations/obligations.js'`
      block.
   2. **Declare the domain entry.** One entry per obligation, keyed by
      the obligation's id. The factory you pick depends on the
      obligation's V4 semantics:

   | V4 shape                                        | Factory                                   | Example                   |
   | ----------------------------------------------- | ----------------------------------------- | ------------------------- |
   | Yes/No or small closed enum                     | `staticEnum(options, { labels })`         | `containsUnweanedAnimals` |
   | Enum whose options depend on another obligation | `computedEnum(fn, readsFrom, { labels })` | `purposeInInternalMarket` |
   | String / integer / date rule                    | `predicate(type, fn, reasons)`            | `internalReferenceNumber` |
   | Composite (enum + predicate on the same field)  | Build inline                              | `transitedCountries`      |

   Register the entry in the `export const domain = new Map([...])`
   list at the bottom of the file.

   **If the entry has a `labels` map** (enum shapes), its values are
   message keys, not literal strings. Follow the convention
   `domain.<bucket>.<code>` where `<bucket>` is the enum concept:
   `domain.country.*`, `domain.species.*`, `domain.yesNo.*`, etc.
   Reuse an existing bucket when the same codes appear across
   obligations (e.g. `regionCodeRequirement` and
   `containsUnweanedAnimals` both use `domain.yesNo.*`). See step 3
   for adding the actual English strings.

3. **Add presentation copy** to `locales/en.json` and register keys
   in [`lib/presentation.js`](../lib/presentation.js).
   1. **In `locales/en.json`:** add a bucket under `presentation.`
      keyed by the obligation's `name` (camelCase):

      ```json
      "presentation": {
        "myObligation": {
          "pageTitle": "My obligation",
          "legend": "How do you want to describe it?",
          "hint": "Optional guidance under the legend."
        }
      }
      ```

      Omit the `hint` key entirely if the field has no hint (rather
      than `null`).

      If step 2 added a `labels` map, also add the English strings
      under the matching `domain.<bucket>.*` bucket in en.json.

   2. **In `lib/presentation.js`:** import the obligation, then add
      an entry to `OBLIGATION_KEYS` that stores the keys, not literal
      strings:

      ```js
      ;[
        myObligation.id,
        {
          pageTitleKey: 'presentation.myObligation.pageTitle',
          legendKey: 'presentation.myObligation.legend',
          hintKey: 'presentation.myObligation.hint' // omit if no hint
        }
      ]
      ```

      Consumers (page-controller, CYA, widget builders) resolve via
      `t()` — you don't touch them.

   3. **`i18n-coverage.test.js` will fail** if any key referenced
      from flow.js, presentation.js, or the domain manifest is
      missing from en.json. Read the failure list, fix en.json.
      Missing keys also render as their raw dotted-path in the
      browser (visible red flag) so a manual walk catches them too.

4. **Present the obligation on a page** in
   [`flow/flow.js`](../flow/flow.js). Same two-edit pattern: import at
   the top of the file, then either:
   - Add a `presents` entry to an existing page, OR
   - Add a new page. If the obligation is a natural section-opener
     (e.g. one page for one obligation), add a new subsection with a
     single-page child. See the existing pages for shape.

   If you add a **new section or subsection**, its `titleKey` field
   must reference `flow.section.<id>.title` or
   `flow.subsection.<id>.title` and en.json must carry the copy.

   `mandatoryToProceed` on the presents entry is separate from
   the obligation's engine-level `status`. Default is `false` — the
   page validates against the domain but doesn't block save-and-
   continue on a blank submission. Set it to `true` (with a paired
   `errors.<obligationName>.required` message KEY under
   `errors: { required: 'errors.myObligation.required' }`, and the
   English string in en.json) when this specific page must not
   advance without an answer. See §Making a field mandatory-to-save-
   and-continue below for the full story.

5. **Remove from `KNOWN_UNWIRED`** in
   [`obligations/coverage.test.js`](../obligations/coverage.test.js).
   Simply delete the name from the set. The `coverage.test.js` suite
   should still pass — if not, either the domain entry is missing or
   the obligation is on the list under a wrong name.

6. **Update snapshot fixtures if needed** in
   [`fixtures/`](../fixtures/). The `dump.test.js` snapshots stringify
   the model state; new pages / new obligations change the shape.
   Run `npx vitest run dump.test.js` and update the snapshot if the
   diff is intentional.

7. **Run the full test suite.**

   ```bash
   npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/
   ```

   Expected: green if the obligation is late in the flow (no earlier
   assertion is invalidated); several failures if the obligation lands
   early. Common failures and fixes:
   - **`nextAfter` / redirect assertions** — a page inserted between
     two existing ones changes `nextAfter(<earlier>)`. Update the
     assertion to point at the new page.
   - **Subsection / section status roll-up** — see §Status alphabet
     below for the full 5-way rule. Quick summary for a fixture
     landing on this step: adding a MANDATORY obligation typically
     requires a fixture value or the roll-up drops F → NS/IP; adding
     an OPTIONAL obligation to a subsection that already has any
     mandatory concern does not change the roll-up; adding an OPTIONAL
     obligation to a purely-optional subsection means the subsection
     will read "Optional" until the user fills something (rather than
     the old vacuous F).
   - **`firstUnfulfilledPage`** — the descent order changed.
   - **`dump.test.js` snapshots** — fixtures under `fixtures/` need
     matching values for the new obligation. Update the fixture, not
     just the assertion.
   - **`KNOWN_UNWIRED` orphan-check** — if step 5 was skipped, the
     coverage test fires with a clear "missing" message.

8. **Manual walk in the browser.**

   ```bash
   npm run dev
   # http://localhost:3000/prototype/eudpa-249/start
   ```

   Click through. The new page should appear at the expected point in
   the flow. Fill it, save-and-continue, ensure it reaches CYA and
   shows the value there with a working Change link.

9. **Commit atomically.** One commit per iteration:

   ```
   feat(EUDPA-249): add <obligationName> + refine docs/add-an-obligation.md
   ```

## Worked example — iteration 1: `containsUnweanedAnimals`

_This section is written by iteration 1 as it runs. Subsequent
iterations may add their own examples below, or replace this with a
tighter example if a later iteration is a cleaner demonstrator._

**Target:** add `containsUnweanedAnimals` as a Yes/No question in a
new subsection under `arrival`.

Steps executed (record what actually happened):

- **Step 1 — Confirmed.** Declared at
  `obligations/obligations.js:188`, always in scope, mandatory,
  no `within`, no group semantics. A top-level singleton.
- **Step 2 — Domain entry.** Used `staticEnum(['yes', 'no'], {
labels: { yes: 'Yes', no: 'No' } })`. Registered in the domain
  manifest.
- **Step 3 — Presentation.** Added `pageTitle: 'Contains unweaned
animals'`, `legend: 'Are there any unweaned animals in this
consignment?'`, `hint: 'An animal that is still dependent on its
mother for milk.'`
- **Step 4 — Flow.** Added a new subsection `unweaned` under the
  existing `arrival` section, containing a single page
  `contains-unweaned-animals`.
- **Step 5 — Removed from KNOWN_UNWIRED.** One line deleted.
- **Step 6 — Fixtures.** `dump.test.js` snapshots did not need
  updating because the new subsection is NA / NS depending on
  fixture state, and the snapshot files are keyed by subsection id.
- **Step 7 — Tests.** All 385 tests green on the first go. No route
  test asserted on a specific redirect that broke; `dump.test.js`
  snapshots didn't cover the new subsection so passed silently (see
  "Refinements" below).
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: new
  "About the animals" subsection appears under Arrival on the task
  list, `contains-unweaned-animals` page shows Yes/No radios,
  save-and-continue works, CYA lists the value with a Change link.
- **Step 9 — Committed as one atomic commit.**

## Worked example — iteration 4: `species` (line-scoped + computed enum + infrastructure)

**Target:** wire `species` — the first line-scoped obligation, with
options that depend on the line's `commodityCode`. Also the first
`presentsForEach` page brought online (previously deferred to v2
backlog per the RECOMMENDATION.md file-map).

**Twist:** the domain-entry step (2) is one line of new code. The
enabling infrastructure — turning on `presentsForEach` route
generation, threading `path` through `optionsFor` — is where most of
the iteration went. Once landed, every future line-scoped obligation
(`commodityType`, `numberOfAnimals`, `numberOfPackages`, per-unit
identifiers) reuses the same rails.

Steps executed:

- **Step 1 — Confirmed.** Declared at `obligations/obligations.js:394`,
  line-scoped (`within: commodityLine`), always in scope, mandatory.
  Already presented via `presentsForEach` on `species-details` in
  `flow/flow.js`.
- **Step 2 — Domain entry.** `computedEnum(fn, [commodityCode], {
labels })` — the closure reads `ctx.path` (the current commodity line's
  fulfilmentId), looks up `fulfilments[commodityCode.id][path]` to find
  that line's commodity code, and returns the species list for that
  code from a small `SPECIES_BY_COMMODITY_CODE` map (8 codes covered).
  Species labels sit next to the map in a `SPECIES_LABELS` const.
- **Step 3 — Presentation.** _No-op_ — species already had a
  presentation entry from the initial spike.
- **Step 4 — Flow.** _No-op_ — species already presented via
  `presentsForEach: { obligation: species, forEachOf: commodityLine }`
  on the `species-details` page.
- **Step 4.5 — Infrastructure (NEW for iteration 4).** Two edits:
  - `routes.js`: dropped the `if (hasPresentsForEach(page)) continue`
    guard. Pages with `presentsForEach` now get a route registered
    (single URL — the page renders one field per in-scope commodity
    line via `expandPresents`, driven by the existing
    field-descriptors machinery).
  - `lib/build-field-descriptors.js`: the `optionsFor()` call now
    passes `{ path: entry.path }` in the ctx. This lets a
    `computedEnum` domain entry read its own line's sibling
    obligations rather than the top-level state.
- **Step 5 — Removed species from KNOWN_UNWIRED.** Down to 21 entries.
- **Step 6 — Fixtures.** No update needed. The
  `transit-with-lines.json` fixture already had
  `species: { line1: ['cattle'] }` and `commodityCode: { line1: '0102' }` —
  cattle is in the SPECIES_BY_COMMODITY_CODE['0102'] list, so it's a
  valid value under the new domain.
- **Step 7 — Tests.** All 385 existing tests still green. Added two
  new tests to `routes.test.js` proving the new route works:
  - `GET /pages/species-details` returns 200 with no fields when no
    commodity lines exist.
  - After adding a line and picking `commodityCode: '0102'`, GET
    renders a checkboxes group with Cattle/Buffalo/Bison and NOT
    Horse (which is in the `'0101'` list).

  Baseline now 387 tests.

- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: from
  the task list, click "Commodity line details" → "Species" — page
  renders one Yes/No-style checkbox group per line, with species
  options driven by each line's commodity code.
- **Step 9 — Committed atomically.**

## Worked example — iteration 5: `numberOfAnimals` (per-species cap cross-field predicate)

**Target:** wire `numberOfAnimals` — the first line-scoped **integer
with a cross-field predicate**. The predicate reads the same line's
`species` selection via `ctx.siblingValue(species)` and enforces a
per-species animal-count cap. Exercises predicate + line-scoped
storage + i18n for a parameterised error message all together.

**Twist:** every mechanism the predicate needs was already in
place — line-scoped `siblingValue` from iteration 4, per-`{name}`
error interpolation from the i18n phase 4 refactor. Step 2 (domain)
is the whole story; steps 3, 4 are no-ops.

Steps executed:

- **Step 1 — Confirmed.** Declared at `obligations/obligations.js:401`,
  line-scoped (`within: commodityLine`), always in scope, mandatory.
  Already presented via `presentsForEach` on `number-of-animals` in
  `flow/flow.js` (came for free with iteration 4's
  `presentsForEach` infrastructure).
- **Step 2 — Domain entry.** `predicate('integer', checker,
[integerMin])`. The `checker` closure:
  1. treat blank as pass (submit-mandate is a separate concern);
  2. reject non-integer / < 1 with `integerMin`.

  V4 spec permits values up to Long.MAX_VALUE with no per-species
  cap. An earlier iteration of this domain entry carried a
  fabricated `SPECIES_ANIMAL_CAP` cross-field map to exercise the
  `ctx.siblingValue` mechanism end-to-end; the audit
  (spec-vs-code, BLOCKER #4) surfaced that the map rejected
  spec-valid values (e.g. `5000` on a horse line under the old
  horse=100 cap). The cross-field predicate machinery is still
  exercised elsewhere (`regionCode` reading `regionCodeRequirement`,
  `species` reading `commodityCode`), so removing the fabricated
  cap costs no coverage.

- **Step 3 — Presentation.** _No-op_ — presentation copy already in
  `locales/en.json` under `presentation.numberOfAnimals.*` (from the
  initial spike + i18n phase 2 refactor).
- **Step 4 — Flow.** _No-op_ — already presented.
- **Step 5 — Removed `numberOfAnimals` from KNOWN_UNWIRED.** Down
  to 20 entries.
- **Step 6 — Fixtures.** No update. `transit-with-lines.json`
  already carries `numberOfAnimals: { line1: 25 }` with cattle —
  25 is a valid whole number so the fixture stays valid under any
  cap regime.
- **Step 7 — Tests.** All existing tests still green after
  removing the per-species-cap tests. Domain suite retains four
  `numberOfAnimals` tests (blank-pass, `integerMin` on 0/negatives,
  `integerMin` on non-integers, any-positive-integer regression
  covering the audit fix).
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: any
  positive integer on a numberOfAnimals field saves; `0` or a
  non-integer produces a red error summary + inline `integerMin`
  error.
- **Step 9 — Committed atomically.**

**Refinement to the doc:** the new pattern surface at step 5.5
(matching en.json + FORMAT_ERROR_KEYS + COPY entry when a predicate
adds a failure code) is the first time we've hit it — earlier
iterations used only pre-existing reason codes. Noted so step 5
knows to expect this trio of edits per new failure code.

## Worked example — iteration 6: `commodityType` (line-scoped static enum)

**Target:** wire `commodityType` — a line-scoped mandatory enum with a
small closed option list. Same shape as `species` in terms of scope
(line-scoped, `presentsForEach` page under `commodity-lines-details`)
but options are static (no cross-field dependency), matching
`commodityCode`. First iteration to combine `staticEnum` factory with
`presentsForEach` under the line-major URL shape introduced in the
"line-major commodity-line pages" refactor.

**Twist:** every mechanism is already in place. Domain factory (static
enum), line-major routing (`/lines/{lineId}/commodity-type` registered
automatically by the `presentsForEach` branch in routes.js), i18n
resolution, and coverage all work off existing infrastructure. This
iteration is the cheapest possible line-scoped-enum addition — mostly
one entry per file.

Steps executed:

- **Step 1 — Confirmed.** Declared at `obligations/obligations.js:385`,
  line-scoped (`within: commodityLine`), always in scope, mandatory,
  no `applyTo`.
- **Step 2 — Domain entry.**
  `staticEnum(COMMODITY_TYPE_OPTIONS, { labels })` with 4 illustrative
  MDM values (`meat-producing`, `dairy-producing`, `breeding-stock`,
  `other`) and labels stored as message keys pointing at the new
  `domain.commodityType.*` bucket in `locales/en.json`. Registered in
  the domain manifest between `commodityCodeDomain` and the predicate
  block.
- **Step 3 — Presentation.** Added `presentation.commodityType.*`
  (pageTitle / legend / hint) to `locales/en.json` and imported +
  registered `OBLIGATION_KEYS[commodityType.id]` in `lib/presentation.js`.
- **Step 4 — Flow.** Imported `commodityType` and inserted a
  `presentsForEach` page between `commodity-details` and
  `species-details` in `commodity-lines-details`:

  ```js
  {
    page: 'commodity-type',
    presentsForEach: {
      obligation: commodityType,
      forEachOf: commodityLine
    }
  }
  ```

  Semantic order: pick the commodity code, then its type, then the
  species that apply. The page name follows the count-obligation
  convention (`number-of-animals`) rather than the `-details` suffix.

- **Step 5 — Removed `commodityType` from KNOWN_UNWIRED.** Down to
  19 entries.
- **Step 6 — Fixtures.** No update. The two happy-path walks in
  `e2e-walk.test.js` gained one new `fillLinePage` step
  (`commodity-type` with `commodityType-line1: 'meat-producing'`); two
  tests in `e2e-commodity-lines.test.js` that walked all four
  mandatory pages also gained the same step. The Change-flow test
  that only touched `commodity-details` and the multi-select test
  that stopped at `species-details` were unaffected — no need to
  extend those.
- **Step 7 — Tests.** 5 new domain-unit tests (options list, label
  resolution for each code, generic label-resolution coverage). No
  new e2e file — the walks + existing commodity-lines tests already
  exercise the URL / navigation / rendering paths for any new
  presentsForEach page. Baseline now 456 tests.
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: after
  picking a commodity code on line 1, the next per-line page is
  Commodity type, rendering four radios (Meat-producing / Dairy-
  producing / Breeding stock / Other). After picking one and saving,
  the flow continues to Species.
- **Step 9 — Committed atomically.**

**Refinement to the doc:** this iteration confirms that with the i18n

- line-major infrastructure in place, adding a line-scoped static enum
  is essentially a JSON edit + a single presentation entry + a single
  flow page + a small domain entry. Nothing else in the pipeline needs
  touching. Good sign the model is settling.

## Worked example — iteration 8: accompanying-document block (branchedGate + multi-obligation page)

**Target:** wire the four accompanying-document obligations
(`accompanyingDocumentType`, `accompanyingDocumentAttachmentType`,
`accompanyingDocumentReference`, `accompanyingDocumentDateOfIssue`) as
a single-page subsection. First iteration where four obligations sit
on one page, and first time we exercise the `branchedGate` applyTo
end-to-end.

**Twist:** the four obligations share a `branchedGate(predicate,
whenTrue, whenFalse)` applyTo in `obligations.js`. `whenFalse` is
`{ inScope: true, status: 'optional' }`; the predicate flips to
`whenTrue` (`{ inScope: true, status: 'mandatory' }`) the moment
_any_ of the four has a fulfilment. At rest, the whole page is
optional-only, so:

1. `pageStatus` rolls the page up to F immediately (nothing mandatory
   in scope → mandatoryUnfilled is empty). The subsection is F on the
   task list without the user visiting the page.
2. `firstUnfulfilledPage` skips it, so `/start` never routes here —
   the user reaches the page voluntarily via the task-list link.
3. Once the user submits _any_ non-blank field, the branchedGate flips
   all four to mandatory and any still-blank ones become fulfilled-
   blocking.

The e2e walk-test needed a POST-directly step (not the `/start`-driven
`fill()` helper) to exercise this because the walk covers _mandatory_
navigation and the page is voluntary at rest. The internal-market walk
POSTs directly with all four filled to exercise the all-mandatory
branch; the transit walk skips the page to exercise the all-optional
branch.

Steps executed:

- **Step 1 — Confirmed.** All four declared at
  `obligations/obligations.js:621-643`, notification-level (no
  `within`), share `accompanyingDocumentBlockApplyTo` via
  `branchedGate`.
- **Step 2 — Domain entries.** Four entries:
  - `accompanyingDocumentTypeDomain` — `staticEnum` with 14
    spec values (ITAHC, Veterinary health certificate, Air waybill,
    Import permit, Letter of authority, Commercial invoice, Sea
    waybill, Rail waybill, Bill of lading, Catch certificate,
    Laboratory sampling results, Health certificate, Journey log,
    Other) and labels under `domain.accompanyingDocumentType.*`.
  - `accompanyingDocumentAttachmentTypeDomain` — `staticEnum` with 8
    file-extension values (pdf / doc / docx / jpg / jpeg / png /
    xls / xlsx) per the V4 spec.
  - `accompanyingDocumentReferenceDomain` — `predicate('string',
stringMaxLength(58, ...))`. Blank passes so an all-blank
    submission on the page (the branchedGate optional branch) doesn't
    error.
  - `accompanyingDocumentDateOfIssueDomain` — `predicate('date',
DD/MM/YYYY calendar-valid ...)`. Same shape as
    `arrivalDateAtPortDomain`; blank passes.

  All four registered in the domain manifest.

- **Step 3 — Presentation.** 4 new buckets in `locales/en.json`
  (`presentation.accompanyingDocument*`), 4 `OBLIGATION_KEYS` entries
  in `lib/presentation.js`, and 2 new domain-label buckets
  (`domain.accompanyingDocumentType.*`,
  `domain.accompanyingDocumentAttachmentType.*`).
- **Step 4 — Flow.** New subsection `accompanying-documents` under
  the existing `references` section, with a single page presenting
  all four obligations:

  ```js
  {
    kind: 'subsection',
    id: 'accompanying-documents',
    titleKey: 'flow.subsection.accompanying-documents.title',
    children: [
      {
        page: 'accompanying-documents',
        presents: [
          { obligation: accompanyingDocumentType },
          { obligation: accompanyingDocumentAttachmentType },
          { obligation: accompanyingDocumentReference },
          { obligation: accompanyingDocumentDateOfIssue }
        ]
      }
    ]
  }
  ```

  The multi-obligation `presents` pattern (four entries on one page)
  was already proven by `arrival-details` (date + port on one page);
  no new infrastructure needed. New
  `flow.subsection.accompanying-documents.title` entry in en.json.

- **Step 5 — Removed all four from `KNOWN_UNWIRED`.** Down to 8
  entries (2 group containers + 6 within-unitRecord leaves; only
  `permanentAddress` from the address family remains, blocked on
  depth-2 per-unit infrastructure).
- **Step 6 — Fixtures.** No update.
- **Step 7 — Tests.** Both walks in `e2e-walk.test.js` updated —
  internal-market POSTs the page directly with all four filled
  (exercises the all-mandatory branch of `branchedGate`); transit
  skips the page (exercises the all-optional branch). Terminal task-
  list assertion bumped from 13 to 14 Completed subsections. All 487
  tests green.
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: from
  the task list, "Accompanying documents" is Completed on entry
  (nothing filled); clicking through renders four fields (2 radios +
  1 text input + 1 date input); submitting any single field flips
  the subsection to In progress until the other three are filled;
  submitting all four returns to Completed.
- **Step 9 — Committed atomically.**

**Refinement to the doc:** the branchedGate + multi-obligation page
combination is the first time the walk-test framework couldn't cover
the surface end-to-end via `fill()` — the branchedGate all-optional
branch keeps the page voluntary, so `/start` never routes there. The
`POST /pages/{name}` direct-post pattern used here is the correct
substitute for any voluntary page: it demonstrates what the user does
after clicking a task-list link, without threading through `/start`.

## Worked example — iteration 9: `permanentAddress` (first depth-2 obligation — line → unit fan-out)

**Target:** wire `permanentAddress` — the ONLY mandatory unit-scoped
obligation in the manifest. Allow-listed to commodity code `01061900`
(Cats / Dogs / Ferrets). Same composite-widget shape as the iteration-7
address blocks, but keyed by a composite fulfilmentId
`${lineId}/${unitId}` under the evaluator's PATH_DELIMITER.

**Twist:** this is the first depth-2 obligation, so 90% of the
iteration was foundational plumbing:

- **State ops (Phase A).** `addUnitRecord(lineId, seedObligation)` +
  `deleteUnitRecord(lineId, unitId, unitLeafObligations)` in
  `lib/state.js`, mirroring `addCommodityLine` / `deleteCommodityLine`
  but keyed by the composite. Per-line unit-id counter (yar key
  `NEXT_UNIT_ID_BY_LINE_KEY`) keeps ids monotonic per line so a Delete
  can't recycle. `deleteCommodityLine` now CASCADES: it purges every
  unit fulfilment whose composite key starts with `${lineId}/` even
  if the caller forgot to pass a unit obligation.
- **Engine primitive (Phase A).** `firstUnfulfilledPageForUnit(root,
state, lineId, unitId)` in `engine/index.js`, analogue of the
  line-scoped primitive. Uses the shared `isBlankValue` helper so a
  composite address with all-empty sub-fields is treated as unfilled.
- **Contract seam (Phase A).** `nextAfterForUnit(page, state, lineId,
unitId)` returns `{ kind: 'unit-page' ... }` or `{ kind:
'units-list', lineId }`.
- **Unit-scoped page controller (Phase B).** `lib/unit-page-controller.js`
  mirrors `line-page-controller.js`. Uses `fieldsForPage(..., {
lineId: compositeKey })` — the existing option filters descriptors
  by `d.path === options.lineId`, so passing the composite string as
  `lineId` works without a new API. Same shape carries through
  `validatePagePayload`. The field ids end up as
  `permanentAddress-line1/unit1` and address sub-fields as
  `permanentAddress-line1/unit1__addressLine1` — the `/` doesn't
  break form encoding or hapi's payload parser.
- **Units UX (Phase B).** `features/units/{controller.js, list.njk}`
  emits `/lines/{lineId}/units` (list), POST
  `/lines/{lineId}/units/add` (mint + add-then-fill redirect), POST
  `/lines/{lineId}/units/{unitId}/delete`. Derives `UNIT_PAGES` +
  `UNIT_LEAF_OBLIGATIONS` from the flow using the same
  `presentsForEach.forEachOf === unitRecord` walk — same
  drift-free discipline as the commodity-lines controller.
- **Routing (Phase B).** `routes.js` branches the `presentsForEach`
  loop by `page.presentsForEach.forEachOf`: `commodityLine` →
  `makeLinePageController`; `unitRecord` →
  `makeUnitPageController` at `/lines/{lineId}/units/{unitId}/{name}`.
- **Discoverability.** The `/lines` per-line summary block gains a
  "Manage animals on this line" link when the line's commodity code
  opens a wired unit-scoped obligation. Gated via
  `lineHasWiredUnitObligation` in the commodity-lines controller,
  which introspects `applyTo.metadata` (exposed by the `allowListed`
  helper) rather than executing the closure. Reason: at add-time no
  unit exists yet, so the runtime `impl.inScope` is `false` for the
  very obligation we want to seed on (chicken-and-egg — the
  evaluator's projection over empty `unitRecord.records` returns
  `[]`). Same metadata approach powers `pickSeedObligationForLine` in
  the units controller.

**Domain / presentation / flow (Phase C) — small on their own:**

- **Step 1 — Confirmed.** Declared at `obligations/obligations.js:576`,
  `within: unitRecord` (which is `within: commodityLine`, so depth-2),
  mandatory, `applyTo` = `allowListed(commodityCode,
PERMANENT_ADDRESS_COMMODITIES, unitRecord, [...])` where
  `PERMANENT_ADDRESS_COMMODITIES = ['01061900']`.
- **Step 2 — Domain entry.** `addressBlock(permanentAddress, {
subFields: ADDRESS_SUB_FIELDS, required: ADDRESS_SUB_FIELDS })` —
  same shape as the seven iteration-7 address blocks. Registered in
  the manifest.
- **Step 3 — Presentation.** New `presentation.permanentAddress.*`
  bucket + `OBLIGATION_KEYS[permanentAddress.id]`.
- **Step 4 — Flow.** New subsection `per-unit-records` under the
  existing `commodity-lines` section with a single page whose
  `presentsForEach.forEachOf === unitRecord` (routing picks that up
  and registers the depth-2 URL). New
  `flow.subsection.per-unit-records.title` key. Hub controller's
  `subsectionHref` extended so the task-list click goes to `/lines`
  (the depth-1 UX bootstraps the depth-2 UX via the Manage animals
  link).
- **Step 5 — Removed permanentAddress from KNOWN_UNWIRED.** Down to
  6 entries — all `within: unitRecord` optional identifier
  obligations (passport, tattoo, earTag, horseName,
  identificationDetails, description) that step 5 will wire.
- **Step 6 — Fixtures.** No update.
- **Step 7 — Tests.** New `e2e-units.test.js` covering: Manage animals
  link visibility (present for 01061900, absent for 0102);
  add-then-fill loop end-to-end; per-line unit-id increment; delete
  a unit; delete the parent line cascades and purges every unit
  fulfilment. Plus 13 unit-level tests added in Phase A
  (`lib/state.test.js` + additions to `engine/index.test.js`).

  Baseline now 506 tests.

- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: add a
  commodity line, pick commodity code "Cats or Dogs or Ferrets
  (01061900)"; back to /lines; a "Manage animals on this line" link
  now shows below the summary rows; click through to
  `/lines/line1/units`; empty state with an Add button; click Add →
  land on `/lines/line1/units/unit1/permanent-address` composite
  form (4 sub-fields); fill and save; back to units list showing
  Animal 1 summary block; delete the unit; back to empty state.

- **Step 9 — Committed as three atomic commits (Phase A / B / C).**

**Refinement to the doc:** the depth-2 fan-out required new engine +
state + routing infrastructure (Phase A) before the domain / flow work
became a small edit (Phase C — comparable in size to iteration 6
`commodityType`). Same three-phase shape as iteration 7 (address
blocks Phase A introduced the widget, Phase B wired the rest). Once
the pattern is settled, the remaining 6 unit-scoped obligations
should be mechanical additions in step 5.

## Worked example — iteration 10: the six per-unit identifier obligations (`allowListed` × 4 + `allowListedByPredicate` × 2)

**Target:** wire all six remaining per-unit obligations in one atomic
commit — `passport`, `tattoo`, `earTag`, `horseName` (`allowListed` on
different commodity-code whitelists) and `identificationDetails`,
`description` (`allowListedByPredicate` inverse-gate, applying to codes
NOT on any specific-identifier whitelist). Empties the leaf portion of
`KNOWN_UNWIRED`; only the two group containers (`commodityLine`,
`unitRecord`) remain.

**Twist:** first iteration to wire an `allowListedByPredicate`
obligation. Iteration 9's browser-side helpers (`pickSeedObligationForLine`,
`lineHasWiredUnitObligation`) had a stub `if (meta.type ===
'allowListedByPredicate') return true` because there were no wired
obligations using that gate. Now that there are two, the stub needed
to actually evaluate the predicate against the line's commodity code —
but the metadata sidecar built by the helper only carried
`{ type, obligation, projection, reasons }`. Fix: expose the predicate
on the metadata (one-line edit in `obligations/helpers.js`) so
callers can ask "would this value be admitted?" without executing the
whole `applyTo` closure. Same discipline as `allowListed` which
exposes `values` for the same reason.

Second insight: `pickSeedObligationForLine` used to walk unit
obligations in manifest-declaration order and seed on the first match.
`permanentAddress` is declared LAST in the manifest but is the only
mandatory unit obligation — before iter 10, a pets line (`01061900`)
had permanentAddress as the only match, so it worked. After iter 10 a
pets line matches passport / tattoo / permanentAddress; declaration
order would seed on passport (optional) instead. Fix: two-pass
iteration — mandatory obligations first, then optional. Add-then-fill
now drops the user on a page they MUST complete.

Steps executed:

- **Step 1 — Confirmed.** All six declared at
  `obligations/obligations.js:501-574`, `within: unitRecord`,
  `status: 'optional'`. Applies via `allowListed(commodityCode,
LIST, unitRecord, [reason])` for four, `allowListedByPredicate`
  for the last two.
- **Step 2 — Domain entries.** Six predicate entries in
  `domain/index.js`, each `predicate('string', stringMaxLength(N,
obligation), [reasons.stringMaxLength])`. Structured identifiers
  (passport / tattoo / earTag / horseName) max 40; free-text
  fallbacks (identificationDetails / description) max 100. V4
  doesn't pin exact lengths for most of these — the numbers are
  conservative defaults we can tighten when the spec settles.
- **Step 3 — Presentation.** Six `presentation.*` buckets in
  `locales/en.json` + six `OBLIGATION_KEYS` entries.
- **Step 4 — Flow.** Six new `presentsForEach: { obligation,
forEachOf: unitRecord }` pages appended to the existing
  `per-unit-records` subsection, ordered by obligations.js
  declaration order. Routes.js's `forEachOf === unitRecord` branch
  registers them at `/lines/{lineId}/units/{unitId}/{page}`
  automatically — no route changes.
- **Step 4.5 — Metadata + seed-picker upgrades.** One-line
  `predicate` exposure on `allowListedByPredicate` metadata in
  `obligations/helpers.js`; two-pass mandatory-first ordering in
  `pickSeedObligationForLine`; both browser-side helpers upgraded
  from `return true` stubs to `meta.predicate?.(lineCode)`.
- **Step 5 — Cleared six entries from KNOWN_UNWIRED.** Down to 2 —
  the group containers (permanent exempt).
- **Step 6 — Fixtures.** No update.
- **Step 7 — Tests.** `e2e-units.test.js` — the negative "no
  Manage animals for cattle" case was invalidated (iter 10 wires
  passport/tattoo/earTag, so cattle now matches). Replaced with:
  (a) positive test for cattle (allowListed match), (b) positive
  test for birds-of-prey (allowListedByPredicate inverse-gate
  match), (c) negative test for a line with no commodity code
  chosen (the only path left that hides the link). `sketches.test.js`
  coverageReport assertion tightened to `equal(['commodityLine',
'unitRecord'])` — the two structural group containers are now
  the ONLY things without a domain entry. `obligations/helpers.test.js`
  metadata assertion extended to check the exposed predicate is
  callable.

  Baseline now 508 tests.

- **Step 8 — Manual walk.** _Left to the reviewer._ Expected:
  every commodity code now shows the "Manage animals on this line"
  link; add a unit under a cattle line and you land on Passport
  (optional); add a unit under a pets line and you land on
  Permanent address (mandatory) — the two-pass seed-picker at
  work. All six identifier pages render one text input each; the
  applyTo filter means a given unit only sees the pages for its
  parent line's commodity code (e.g. horse units see Passport +
  Horse name; sheep units see Ear tag; birds-of-prey units see
  Identification details + Description).
- **Step 9 — Committed atomically.**

**Refinement to the doc:** three lessons that generalise for step 5:

1. When a new obligation lands using a helper (`allowListed`,
   `allowListedByPredicate`, ...) that browser-side code introspects,
   check that the helper exposes enough metadata on `applyTo.metadata`
   for the introspection to work. Add a predicate/value/callback field
   to the metadata rather than duplicating the gate logic outside.
2. Manifest-declaration order is not a design signal for UX. Order
   the add-then-fill seed by _status_ (mandatory first) so the user
   lands on what they must complete, not what happens to be declared
   earlier.
3. Negative tests that assert absence of a feature ("does not show X
   in this case") get invalidated when subsequent iterations wire the
   feature to cover that case. Rework them to test the last remaining
   absence path (here: "no commodity code chosen") rather than
   deleting the coverage.

## Worked example — iteration 3: `portOfEntry`

**Target:** wire `portOfEntry` — a straightforward static enum where
the obligation is already presented on an existing page.

**Twist:** step 4 (flow) AND step 3 (presentation) both turned out to
be no-ops. `portOfEntry` was already presented on `arrival-details`
from the initial spike, and it already had a `presentation.js` entry
(from the initial spike's baseline of copy for every obligation). All
the real work was in step 2 (domain entry) and step 5 (remove from
`KNOWN_UNWIRED`).

Steps executed:

- **Step 1 — Confirmed.** Declared at `obligations/obligations.js:321`,
  top-level singleton, always in scope, mandatory.
- **Step 2 — Domain entry.** `staticEnum` over 8 UK ports of entry
  (DVR, HUL, LGW, LHR, STN, EDI, BRS, MAN) with labels ("Port of
  Dover", "Heathrow Airport", …). Registered in the domain manifest.
- **Step 3 — Presentation.** _No-op — already had an entry from the
  initial spike._ Bumped the `hint` from `null` to
  `'Choose the UK port or airport where the animals will arrive.'`
  now that a dropdown is being rendered.
- **Step 4 — Flow.** _No-op — already presented on `arrival-details`
  alongside `arrivalDateAtPort`._
- **Step 5 — Removed from KNOWN_UNWIRED.** Down to 22 entries.
- **Step 6 — Fixtures.** No update needed — the two fixtures already
  had `portOfEntry: 'DVR'`, which happens to be in the new enum.
  (Iteration 2's lesson: had the fixture value not been in the enum,
  `dump.test.js` snapshot would have gained a domain error and required
  a fixture update.)
- **Step 7 — Tests.** All 385 tests green on the first go. Zero test
  churn — the direct consequence of picking a late-in-flow obligation
  that was already presented.
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: the
  arrival-details page's second field ("Port of entry") is now a
  select dropdown of 8 UK ports instead of a free-text input.
- **Step 9 — Committed atomically.**

## Worked example — iteration 2: `regionCodeRequirement` + `regionCode`

**Target:** wire the region-code pair, adding two new pages into an
existing subsection (`origin`) rather than creating a new subsection.

Both obligations at once because `regionCode.applyTo` gates on
`regionCodeRequirement === 'yes'` — wiring one without the other
leaves an unreachable page or a stateless gate.

Steps executed:

- **Step 1 — Confirmed.** Both already declared. `regionCodeRequirement`
  is a Yes/No singleton; `regionCode` uses `branchedGate` — mandatory
  when requirement=yes, optional otherwise. In-scope in both cases
  (retain-value pattern).
- **Step 2 — Domain entries.**
  - `regionCodeRequirementDomain = staticEnum(YES_NO_OPTIONS, { labels: YES_NO_LABELS })`
    — reused the consts from iteration 1. Proof that the extraction
    was worth it.
  - `regionCodeDomain = predicate('string', stringMaxLength(5,
regionCode), [reasons.stringMaxLength])` — first use of the predicate
    factory in this doc.
- **Step 3 — Presentation.** Two entries added.
- **Step 4 — Flow.** Both pages added as children of the **existing**
  `origin` subsection, not a new subsection. This differs from
  iteration 1's implicit "new subsection per new page" — a natural
  V4 grouping ("origin" now means country + region requirement + code).
- **Step 5 — Removed both from KNOWN_UNWIRED.**
- **Step 6 — Fixtures.** Two updates:
  - Both fixture JSONs (`internal-market-partial.json`,
    `transit-with-lines.json`) needed `regionCodeRequirement: 'no'`
    and `regionCode: 'FR-75'` for the origin subsection to be F. **This
    is the biggest doc refinement iteration 2 landed.**
- **Step 7 — Tests.** 10 tests fell over first run. All were
  legitimate: assertions about origin-subsection status, redirect
  targets, `firstUnfulfilledPage` results, and dump snapshots.
  Updated each to include the new pages in the expected flow.
- **Step 8 — Manual walk.** _Left to the reviewer._ Expected: two new
  pages appear between country-of-origin and reason-for-import.
- **Step 9 — Committed atomically.**

## Refinements to this doc based on iterations 1 and 2

Iteration 1:

- **Three files (`domain/index.js`, `lib/presentation.js`,
  `flow/flow.js`) each need an import added.** Consistent pattern:
  add to the top-of-file `import { ... } from
'../obligations/obligations.js'`. Worth spelling out explicitly in
  each step above so a fresh contributor doesn't forget one.
- **The Yes/No pattern was extracted into shared consts** in
  `domain/index.js`: `YES_NO_OPTIONS = ['yes', 'no']` and
  `YES_NO_LABELS = { yes: 'Yes', no: 'No' }`. Later Yes/No obligations
  (`regionCodeRequirement` is the obvious next) can reuse them without
  restating the literals. Similar pattern likely for other repeat
  shapes.
- **`dump.test.js` snapshots don't cover the new subsection.** The
  snapshots key by subsection id and only assert on subsections the
  test explicitly names. A new subsection sits silently in the dump
  output without being checked. Not a defect but a note: if
  positioning matters, add a `statusPerSubsection` key assertion.
- **`routes.test.js` uses label-based navigation** (`getByLabel` /
  substring matches), not ordinal-based. New pages don't break the
  redirect chain assertions — they only fire if the new page changes
  what an existing page's `nextAfter` computes.

Explicit step-by-step for the import bump added to the checklist
above under each of steps 2, 3, 4.

Iteration 2:

- **Adding pages to an existing subsection is a distinct pattern from
  adding a new subsection.** Iteration 1 implicitly baked in "new
  subsection per new obligation"; iteration 2's region-code pair fits
  naturally under the existing `origin` subsection. Step 4 above now
  offers both options explicitly.
- **In-scope-optional obligations are visible on the task list under
  the 5-way alphabet.** A mixed page (mandatory + optional) reaches F
  the moment every mandatory is filled — an untouched optional does
  not gate F. A purely-optional page/subsection reads "Optional" until
  the user fills any obligation, at which point it flips to F. See
  §Status alphabet below for the exhaustive rule. Iteration 2's
  fixtures added `regionCode: 'FR-75'` when the fixture wanted the
  subsection to read F specifically because the fixture put the
  page into the mixed shape; a fixture that wants "Optional" instead
  just leaves the optional blank.
- **Wiring a `branchedGate` obligation** usually means also wiring the
  obligation the gate depends on. Iteration 2 wired the pair
  `regionCodeRequirement` (gate) + `regionCode` (gated) in one commit;
  wiring only `regionCode` would leave it stateless (always
  in-scope-optional, no way for the user to answer "yes").
- **Adding an obligation early in the flow breaks navigation tests.**
  Iteration 2 broke 10 tests: `nextAfter` from country-of-origin now
  points at region-code-requirement (was reason-for-import);
  `origin-and-reason F` needs the new obligations filled;
  `firstUnfulfilledPage` descent order changed; dump snapshots
  expected new keys. All were mechanical updates once the pattern was
  spotted. Iteration 3 should probably pick an obligation added
  LATER in the flow to avoid the churn.
- **Fixtures under `fixtures/` are the source of truth for
  `dump.test.js`.** When you add an obligation that a fixture "wants",
  update the fixture too — not just the assertion. The fixture is
  what a stakeholder walks through in `dump.js`.

Iteration 4:

- **Line-scoped obligations need `ctx.path` threaded through the
  domain layer.** `computedEnum` closures reading sibling obligations
  (like species reading its line's commodityCode) need the current
  line's fulfilmentId. Fixed in `lib/build-field-descriptors.js` —
  the `optionsFor()` call now passes `{ path: entry.path }` in ctx.
  This is a one-time infrastructure change; every future line-scoped
  `computedEnum` benefits.
- **`presentsForEach` route generation was v2 backlog until now.**
  The plugin previously skipped every `presentsForEach` page with a
  `continue`. Iteration 4 removed the skip: pages now register with a
  single route and `expandPresents` fans out one field per in-scope
  commodity line at render time. Simpler than per-line routes
  (`/pages/species-details/{lineId}`) and adequate for 1-2 line UX.
  Per-line routes remain available as a follow-on when line counts
  routinely exceed a handful.
- **Existing tests can't prove the new route works.** All 385 tests
  stayed green after enabling `presentsForEach` routing — because
  nothing exercised the newly-registered routes. Iteration 4 added
  two focused HTTP tests that seed a commodity line + commodity code
  and assert species options render according to the domain's
  computed enum. Any future line-scoped obligation should get a
  similar route test alongside its domain entry.
- **The initial spike had already declared the flow entries and
  presentation copy** for every line-scoped obligation. Only domain
  entries + the infrastructure unlock were missing. Every remaining
  line-scoped obligation (`commodityType`, `numberOfAnimals`,
  `numberOfPackages`, `passport`, `tattoo`, `earTag`, `horseName`,
  `identificationDetails`, `description`, `permanentAddress`) will
  now be a smaller iteration.

Iteration 3:

- **Steps 3 and 4 are frequently no-ops.** The initial spike shipped
  presentation copy for every V4 obligation, and `flow.js` already
  presents several obligations that don't yet have domain entries.
  `portOfEntry` was one such case — the only real work was step 2
  (domain) and step 5 (KNOWN_UNWIRED). Now noted upfront in the
  "Note on no-ops" section before step 1.
- **When an obligation is already presented, fixture values may
  already work.** Both existing fixtures had `portOfEntry: 'DVR'`,
  which happens to be in the enum we chose. Zero fixture updates
  needed. If the fixture value hadn't been valid, `dump.test.js`
  would have surfaced a domain error and the fixture would need
  updating (see iteration 2 for the pattern).
- **Late-in-flow obligations minimise test churn.** Iteration 2
  broke 10 tests by inserting pages between country-of-origin and
  reason-for-import. Iteration 3 touched the arrival section and
  broke zero tests. Rule: prefer late-in-flow obligations when the
  goal is exercising a factory rather than exercising navigation
  updates.

Themes across all three iterations:

- **The import-bump / register pattern is repeated up to three times
  per obligation** (domain, presentation, flow — minus any no-ops). A
  helper `wireObligation` might be worth it after ~5 more iterations
  if the pattern stays identical. Not yet.
- **Yes/No is a repeat shape.** `YES_NO_OPTIONS` + `YES_NO_LABELS`
  in `domain/index.js` was used in iterations 1 and 2. Add more shared
  consts as patterns emerge (e.g. an `ISO_COUNTRY_LIST` when the first
  address-block iteration lands).
- **The `KNOWN_UNWIRED` allow-list shrinks steadily.** 26 → 25
  (iter 1) → 23 (iter 2) → 22 (iter 3) → 21 (iter 4). When it hits 0
  or the residual is genuinely-doesn't-need-domain-entry (like
  `commodityLine` / `unitRecord` — structural groups), step 4 is
  complete.

## Adding a brand-new obligation

This case is rarer than "wire an existing obligation" — usually the
V4 obligation already exists in `obligations/obligations.js`. If it
doesn't:

1. Pick a stable UUID (any valid v4 UUID — `uuidgen` on macOS works).
2. Choose the shape:
   - Top-level singleton with an `applyTo` returning `{ inScope, status,
reasons? }`.
   - `within: commodityLine` for a line-scoped field with `status`.
   - `within: unitRecord` for a unit-scoped field.
   - `applyTo` using an allow-list helper if the scope depends on
     another obligation's value.
3. Add to the `export const obligations = [ ... ]` list at the bottom
   of `obligations/obligations.js`.
4. Then follow the standard checklist above.

Note: `obligations/coverage.test.js` will fire immediately with an
"obligation lacks domain and allow-list entry" error until you wire
it. That's the correct catch — it's why we added that test.

## Making a field mandatory-to-save-and-continue

Two orthogonal mandate concepts exist in the model, so it's worth
being explicit which one you want when adding an obligation:

- **Completion-mandate** — does the _journey_ need this filled to
  reach F? Set on the obligation itself, via `status: 'mandatory' |
'optional'` (top-level or via `applyTo`). Enforced by
  `pageStatus`/`containerStatus`/`journeyState`.
- **Submit-mandate** — must the _user_ fill this before hitting Save
  and continue on this page? Set on the flow-entry, via
  `mandatoryToProceed: true`. Default false — leaving the
  field blank on POST validates through and redirects on. When true,
  a blank POST returns a 400 with the flow-supplied required
  message; the domain check runs on non-blank input as normal.
  For **address (composite) obligations**, the gate consults
  `domainEntry.isComplete(value)` rather than just checking blank —
  so a partial address (some required sub-fields blank) also fails
  the gate, matching the V4 "Mandatory to proceed" semantic that
  "the whole page must be complete." See `contract.js`
  `isSufficientForProceed` and the audit finding cluster #7-9.

The two are independent. A field can be:

|                  | completion-optional                                                                                 | completion-mandatory                       |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| submit-optional  | fill any time, or not at all (e.g. internal reference)                                              | fill any time — journey blocks at F rollup |
| submit-mandatory | must fill _here_, can be blank as far as F cares (rare — usually you want completion-mandatory too) | must fill here AND fill somewhere for F    |

### Shape

```js
{
  page: 'country-of-origin',
  presents: [
    {
      obligation: countryOfOrigin,
      mandatoryToProceed: true,
      errors: {
        required: 'errors.countryOfOrigin.required'
      }
    }
  ]
}
```

`errors.required` is a **message key**, resolved via `lib/i18n.js`
(`t(key)` → `locales/en.json`). Add the English string to
`locales/en.json`:

```json
"errors": {
  "countryOfOrigin": {
    "required": "Enter a country of origin"
  }
}
```

Missing keys render as their raw dotted-path in the UI (visible red
flag) and are caught in CI by `i18n-coverage.test.js`.

### When to use it

Reach for `mandatoryToProceed: true` when the UX design says
"the user must not be allowed past this page without a value." Common
cases: journey-driving fields whose value gates every downstream
page's routing (`countryOfOrigin`, `commodityCode`), or safety-
critical inputs that must not be silently blank.

Do NOT reach for it by default. Making every mandatory field
submit-mandatory encourages users to type placeholders to get past
error pages; it also fights the GDS "let people save partial
progress" pattern. Prefer completion-mandate at F-rollup for most
required fields.

## Status alphabet — page, container, journey

Every page, subsection, section, and the journey itself surface a
single derived status through the same 5-way alphabet. The rules are
computed by `classifyEntries` in `engine/index.js` — one classifier
that runs at page level over a single page's presented entries,
at container level over a subtree's collected entries, and at journey
level over every section's entries combined. The alphabet:

| Status         | When it fires                                                             | Task-list tag             |
| :------------- | :------------------------------------------------------------------------ | :------------------------ |
| Not applicable | No obligations are in scope at all.                                       | `govuk-tag--grey`         |
| Not started    | At least one mandatory concern in scope, nothing filled anywhere.         | `govuk-tag--blue`         |
| Optional       | Only optional obligations in scope, none filled.                          | `govuk-tag--turquoise`    |
| In progress    | At least one mandatory concern still unsatisfied, some obligation filled. | `govuk-tag--light-blue`   |
| Complete       | Either only optional in scope and ≥ 1 filled, or every mandatory filled.  | (no tag — GOV.UK default) |

A "mandatory concern" means an in-scope obligation with
`status: 'mandatory'` OR (at container/journey level) any unsatisfied
group-invariant instance from a `presentsForEach.forEachOf.requires`
group (e.g. "≥ 1 identifier per unit-record"). Group errors count
identically to unfilled mandatory obligations for classification.

**Design notes worth being explicit about:**

1. **No visited-plumbing.** "Optional" doesn't need a per-session
   "user visited this page" flag. Engagement is measured by fulfilment
   count, same as everywhere else. A user who visits an Optional page
   and consciously leaves everything blank sees the tag stay Optional.
   Filling any obligation flips it to Complete.
2. **Case classification is dynamic.** Whether a page (or subtree) is
   "only optional" depends on the current fulfilment state via
   `applyTo`. A page declared with 1 mandatory + 3 optional obligations
   whose mandatory falls out of scope is effectively optional-only for
   that render.
3. **Optional pages are skipped by `firstUnfulfilledPage`.** Same as
   Complete pages. The Optional tag surfaces the invitation to visit;
   the `/start` redirect and the Continue affordance don't force it.
   Users reach Optional pages via the task list (or a CYA change link).
4. **Optional at container level only surfaces on purely-optional
   subtrees.** A subsection with any in-scope mandatory anywhere in
   its pages falls into the mandatory-branch of the classifier
   (NS/IP/Complete). This is deliberate: on mixed subsections the
   mandatory work IS the primary story, and the "invitation to add
   more" from an optional sub-page gets absorbed into Complete once
   the mandatory bar is met. Stakeholders asking "why doesn't a mixed
   subsection tell me there's more?" — because "Done" is defined by
   the mandatory bar, not by every field being touched.
5. **The historical "empty-session clamp" is gone.** The old
   `containerStatus` clamped to Not started when nothing had been
   touched — necessary because vacuously-F optional-only children
   would otherwise push a purely-untouched subsection to In progress.
   The 5-way classifier makes this natural: nothing filled + at least
   one mandatory anywhere = NS; nothing filled + only optional = Optional.
   No clamp needed.
6. **Design record.** The status alphabet was expanded from 4 → 5
   values during the P0 UX fix (2026-07-13). Prior to that, an
   untouched optional-only page/subsection read Completed via a
   vacuous match on "no mandatory unfilled" — model-correct but
   confusing on the task list. The Optional tag makes the surface
   read honestly; the underlying invariants (F ⇒ every mandatory
   satisfied) are unchanged.

## Gotchas

_This section accumulates real problems iteration by iteration.
Currently empty; iteration 1 will populate it if any come up._

## What this doc does not cover

- Adding a **new page** without a new obligation (i.e. presenting an
  existing obligation on a new page too). See `docs/add-a-page.md`
  (not yet written).
- Adding a **new subsection** or **new section** as its own
  structural change. Included as a sub-step of the checklist above
  because the two usually happen together; a dedicated
  `docs/add-a-subsection.md` will materialise when iteration 2+ has
  a case that separates them.
- Bespoke controllers (features/ folders). Those are for UX flows
  that don't fit the generic form-page pattern — hub, CYA,
  commodity-lines add/list/delete, etc.
