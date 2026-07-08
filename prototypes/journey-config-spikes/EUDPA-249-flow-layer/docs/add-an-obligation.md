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

1. **Confirm the obligation.** Look it up in `obligations/obligations.js`.
   Note the shape: is it a top-level singleton (`applyTo` at the
   root), is it `within: commodityLine` or `within: unitRecord`
   (group-scoped), does it have `applyTo` at all (structural groups
   don't)? The answer decides which factory you use in step 2.

2. **Add a domain entry** in
   [`domain/index.js`](../domain/index.js). Two edits in the same file:
   1. **Import the obligation** at the top of the file — add its name
      to the `import { ... } from '../obligations/obligations.js'`
      block.
   2. **Declare the domain entry.** One entry per obligation, keyed by
      the obligation's id. The factory you pick depends on the
      obligation's V4 semantics:

   | V4 shape                                         | Factory                                    | Example                   |
   | ------------------------------------------------ | ------------------------------------------ | ------------------------- |
   | Yes/No or small closed enum                      | `staticEnum(options, { labels })`          | `containsUnweanedAnimals` |
   | Enum whose options depend on another obligation  | `computedEnum(fn, readsFrom, { labels })`  | `purposeInInternalMarket` |
   | Enum whose options come from a lookup obligation | `lookupEnum(lookupObligation, { labels })` | `animalsCertifiedFor`     |
   | String / integer / date rule                     | `predicate(type, fn, reasons)`             | `internalReferenceNumber` |
   | Composite (enum + predicate on the same field)   | Build inline                               | `transitedCountries`      |

   Register the entry in the `export const domain = new Map([...])`
   list at the bottom of the file.

3. **Add presentation copy** in
   [`lib/presentation.js`](../lib/presentation.js). Same two-edit
   pattern: import the obligation at the top of the file, then add an
   entry keyed by `obligation.id` with `pageTitle`, `legend`, and
   optional `hint`. `pageTitle` is used when the obligation is the
   sole presented entry on a page; `legend` is the fieldset legend.

4. **Present the obligation on a page** in
   [`flow/flow.js`](../flow/flow.js). Same two-edit pattern: import at
   the top of the file, then either:
   - Add a `presents` entry to an existing page, OR
   - Add a new page. If the obligation is a natural section-opener
     (e.g. one page for one obligation), add a new subsection with a
     single-page child. See the existing pages for shape.

   `mandate` on the presents entry is separate from the obligation's
   engine-level `status`. Default `mandate` is `soft` — engine keeps
   the obligation in scope but the page doesn't block save-and-continue.
   Use `hard` when this specific page must not advance without an
   answer.

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
   - **Subsection / section status roll-up** — subsection is F only
     when all its pages are F. If you added an in-scope-optional
     obligation, its page stays NS until any value lands, keeping
     the subsection IP. Fill the optional in the fixture or expectation
     (see iteration 2's `regionCode: 'FR-75'`).
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
- **In-scope-optional obligations count as "unfilled" until they have
  a value.** The runtime `pageStatus` rule for `FULFILLED` is
  "no mandatory unfilled AND at least one entry filled". An optional
  obligation on a fresh page keeps the subsection IP until any value
  lands. If your fixture expects section-F, fill the optional too.
  This is why iteration 2's fixtures gained `regionCode: 'FR-75'`.
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

Themes across both iterations:

- **The import-bump / register pattern is repeated three times per
  obligation** (domain, presentation, flow). A helper `wireObligation`
  might be worth it after ~5 more iterations if the pattern stays
  identical. Not yet.
- **Yes/No is a repeat shape.** `YES_NO_OPTIONS` + `YES_NO_LABELS`
  in `domain/index.js` is now used twice (iteration 1 +
  iteration 2). Add more shared consts as patterns emerge (e.g. an
  `ISO_COUNTRY_LIST` when the first address-block iteration lands).

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
