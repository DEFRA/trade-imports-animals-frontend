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

   `mandatoryToSaveAndContinue` on the presents entry is separate from
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
   - **Subsection / section status roll-up** — subsection is F once
     every mandatory-in-scope obligation across its pages is filled.
     In-scope-optional obligations do not gate F: an optional-only
     page is F immediately, and a mixed page is F once its mandatories
     land. If you added an in-scope-optional obligation and a fixture
     is now over-filled, you can safely drop the value (or leave it —
     both walk to F). If you added a mandatory, the fixture almost
     certainly needs a value for it.
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
  `mandatoryToSaveAndContinue: true`. Default false — leaving the
  field blank on POST validates through and redirects on. When true,
  a blank POST returns a 400 with the flow-supplied required
  message; the domain check runs on non-blank input as normal.

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
      mandatoryToSaveAndContinue: true,
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

Reach for `mandatoryToSaveAndContinue: true` when the UX design says
"the user must not be allowed past this page without a value." Common
cases: journey-driving fields whose value gates every downstream
page's routing (`countryOfOrigin`, `commodityCode`), or safety-
critical inputs that must not be silently blank.

Do NOT reach for it by default. Making every mandatory field
submit-mandatory encourages users to type placeholders to get past
error pages; it also fights the GDS "let people save partial
progress" pattern. Prefer completion-mandate at F-rollup for most
required fields.

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
