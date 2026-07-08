# EUDPA-249 — what's next

This file is a hand-off for whoever picks up next (human or fresh
agent). It captures where the spike is, the six agreed to-do items,
the recommended order, and the design calls that need resolving before
you can execute each. Two follow-on items (Joi adoption + data
dictionary MD) are parked for after the V4 buildout.

---

## Where we are — session handoff (last updated 2026-07-08)

**Branch:** `spike/EUDPA-249-flow-layer`, pushed to
`DEFRA/trade-imports-animals-frontend`. Latest commit on origin
`839d4fd` (doc pass); the ticket-implementation tip is `75c1c11`
(animalsCertifiedFor static stub).

**Tests:** 388 spike + 1201 total frontend, all green.
Run: `npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

**Browsable demo:** `npm run dev` (auth defaults off in dev), then
<http://localhost:3000/prototype/eudpa-249/start>.

**Reviewer rule:** the user reviews locally before pushing. Commit
freely; do NOT push without an explicit go-ahead.

### Today's session (2026-07-08)

Four commits, all pushed:

- `540eec4` — hub-controller fix. `Add commodity lines` subsection
  was rolling up to NA (its only child page is a read-only intro,
  which pageStatus correctly returns NA for) and the hub stripped
  the href. Now `subsectionHref` special-cases the id BEFORE the
  firstNavigablePage null-check, `linesManageStatus()` derives status
  from `commodityLine` record count, and the handler always renders
  the href for that subsection.
- `9139729` — same subsection now returns FULFILLED once ≥ 1 line
  exists (was IN_PROGRESS forever). The "add step" is done as soon
  as the user has added a line; per-line details are the sibling
  `commodity-lines-details` subsection's concern.
- `75c1c11` — removed the async-lookup pattern entirely. The
  `certifiedForOptionsLookup` obligation was accidentally rendering
  as a text input labelled "Loading" (no domain entry → fallback
  widget); typing into it stored a string under an id whose consumer
  (`lookupEnum`) then crashed on `options.map` because it expected
  an array. Rather than papering over (remove-from-presents +
  auto-seed on GET), decided to delete the whole pattern: it was
  materially the same as `computedEnum` reading a sibling, with only
  the async-populated bit differing (runtime plumbing, not a model
  shape). `animalsCertifiedFor` is now a `staticEnum` stub with
  `bovine` / `ovine` / `porcine` / `equine` (Cattle / Sheep / Pigs
  / Horses). Deleted: `lookupEnum` factory, `certifiedForOptionsLookup`
  obligation, `features/lookup/` controller, `isLookupSeeded`/
  `markLookupSeeded` helpers, `LOOKUP_SEEDED_KEY`, `/pages/animals-
certified-for/resolve` route, the "Loading options" presentation
  entry. Domain factories are now three (was four): `staticEnum`,
  `computedEnum`, `predicate`.
- `839d4fd` — doc pass. `RECOMMENDATION.md` refreshed in-place (D5
  recast, playback bullet dropped, D2 tightened, test counts
  updated, features/lookup row removed, out-of-scope follow-ons
  reframed as "Async / dynamic options for enums" + "Dynamic
  predicates via orchestrator resolution"). `NEXT.md` — this file —
  updated (see below). `PLAN.md` got a post-implementation note at
  the top; body left intact as historical planning record.

### Current model / architecture state

- **Three layers proven end-to-end** (Obligations · Domain · Flow),
  browsable at `/prototype/eudpa-249/*`.
- **Contract seam** (`contract.js`) — browser layer only reads model
  through it. Enforceable by grep:
  `grep -rn "from '../engine\\|from '../domain\\|from '../flow" features/ lib/ | grep -v contract`
  should return nothing.
- **Domain factories:** `staticEnum`, `computedEnum`, `predicate`.
  Plus the `transitedCountries` composite (built inline).
- **Runtime primitives:** `pageStatus`, `containerStatus`,
  `journeyState`, `firstApplicablePage`, `firstUnfulfilledPage`,
  `firstPagePresentingObligation`, `optionsFor`, `validate`,
  `expandPresents`.
- **Feature folders:** `hub`, `check-your-answers`, `commodity-lines`,
  `start`, `reset`. (`lookup/` deleted today.)
- **KNOWN_UNWIRED** in `obligations/coverage.test.js`: 21 obligations
  (down from 26 at spike start). Step 4 iterations whittle this.

### Step 4 iterations completed

1. `containsUnweanedAnimals` (new subsection)
2. `regionCodeRequirement` + `regionCode` (added to origin
   subsection; both wired in one iteration)
3. `portOfEntry` (arrival subsection)
4. `species` + presentsForEach page-routing unlock (line-scoped;
   turned on the routes.js path that previously skipped
   presentsForEach pages)

Each iteration also refined `docs/add-an-obligation.md`.

### Known limitations to raise before step 5

- **numberOfPackages optional-only stays NS.** V4 says it's optional,
  in-scope only for certain commodity codes. The runtime rule
  `pageStatus === F requires "no mandatory unfilled AND ≥ 1 entry
filled"` means an unfilled optional page stays NS, so
  `commodity-lines-details` subsection can't roll up to F unless the
  user fills the optional field. Discussed today; three options
  (fill in walk / rule change / page-visited plumbing). No decision.
- The **Add commodity lines** subsection currently maxes at FULFILLED
  as soon as ≥ 1 line exists. That's the current design (add step
  done when there's a line). If the user removes all lines, it
  reverts to NOT_STARTED. Fine as-is.

### Immediate next candidates

Pick one, iterate:

- `commodityType` (line-scoped MDM enum — same shape as species)
- `numberOfAnimals` (line-scoped integer with a per-species cap
  predicate — worth doing because it exercises predicate + line-
  scoped storage together)
- `numberOfPackages` (line-scoped integer, optional, applyTo-scoped
  — pressure-tests the optional-only-NS limitation above)
- Any of the address blocks (`placeOfOrigin`, `consignor` etc.) — a
  composite widget that would extend `field-widgets.js` with a new
  rule. Bigger design lift.

Then step 5 (full V4 buildout).

**Parked post-step-5** (unchanged): P1 Joi adoption; P2 data
dictionary MD artefact. See below for both.

Read [`RECOMMENDATION.md`](./RECOMMENDATION.md) end-to-end before
doing anything — it explains the three-layer architecture, the
contract seam, the browser layer, tests + convention that prove the
mapping, the env gate, and the v2 backlog. This NEXT.md assumes you
have.

## Path map

```
prototypes/journey-config-spikes/EUDPA-249-flow-layer/
├── routes.js                        Hapi plugin
├── contract.js                      The seam — browser ↔ model
├── dump.js                          Headless proof (CLI + report())
├── controller-sketch.js             JOI composition sketch (historical)
├── data-dictionary-sketch.js        Dictionary builder — feeds to-do 5
├── RECOMMENDATION.md                Design write-up
├── PLAN.md                          Original spike plan (historical)
├── NEXT.md                          This file
├── integration.test.js              Cross-cutting integration test
├── sketches.test.js                 Sketch tests
├── contract.test.js                 Contract seam tests
├── dump.test.js                     Dump snapshot tests
├── routes.test.js                   Hapi server.inject integration tests
├── obligations/                     Forked from EUDPA-277 (step 1)
│   └── {obligations,evaluator,helpers}.js + *.test.js
├── engine/                          Runtime primitives
│   └── index.{js,test.js}
├── flow/                            Flow declarations
│   └── flow.js
├── domain/                          Layer 1.25 constraint declarations
│   └── index.{js,test.js}
├── features/                        One folder per bespoke UX concern
│   ├── hub/                         Task list
│   ├── check-your-answers/          CYA
│   ├── commodity-lines/             Bespoke Add-another UX
│   ├── start/                       Landing redirect
│   └── reset/                       Session reset
├── lib/                             Cross-feature utilities
│   ├── page-controller.js           Generic GET/POST factory
│   ├── build-field-descriptors.js
│   ├── field-widgets.js
│   ├── format-domain-errors.js
│   ├── presentation.js
│   └── state.js
├── shared/                          Cross-feature templates
│   ├── layout.njk
│   ├── page.njk
│   └── partials/{fields,error-summary}.njk
├── fixtures/                        Named fulfilment fixtures
└── docs/                            Topic-per-file (feeds to-dos 4-6)
```

The parent EUDPA-277 obligations spike lives at
`prototypes/model-spikes/obligations-v4-model/`. It's unchanged; we
forked its source + tests into `./obligations/` during step 1 and now
consume the local copy exclusively.

The parent-layouts branch `spike/EUDPA-249-prototype-layouts` has the
14-function `contract` interface, four alternative model-spikes (a-d),
`obligations-standalone-spike`, and shared scaffolding. **Reference
only** — not a merge target, cherry-pick fragments as needed.

## The six to-dos (in recommended order)

### 1. Inline the obligations spike into our directory structure ✅ DONE

Forked `obligations.js`, `evaluator.js`, `helpers.js`, and their tests
(`evaluator.test.js`, `evaluator.units.test.js`, `helpers.test.js`)
from `prototypes/model-spikes/obligations-v4-model/` into
[`./obligations/`](./obligations/). The parent folder is unchanged; the
fork is now our source of truth. Documented in RECOMMENDATION.md
§Obligations fork.

**Verification passed:** 345 tests green
(spike + forked-obligations); 632 existing frontend tests unaffected.
`grep -rn "obligations-v4-model"` returns only doc pointers.

**Not forked:** `obligations.md` (150-page canonical doc), `GAPS.md`,
`RECOMMENDATION.md`, `TODO.md` — all historical EUDPA-277 records;
they stay in the parent folder and are referenced by path.

### 2. Restructure the folder layout for clarity and discoverability ✅ DONE

Done in a single commit — see the git log for `refactor(EUDPA-249):
feature-first folder layout inspired by obligations-v2-spike`. Every
file moved with `git mv` where possible so `git log --follow` traces
history through the reshape. No behaviour change.

**What landed:**

- Dropped `browser/` folder — top-level `routes.js`, `contract.js`,
  `dump.js` at spike root.
- New folders: `engine/` (was `runtime.js`), `flow/` (was `flow.js`),
  `domain/` (was `domain.js`), `features/{hub,check-your-answers,commodity-lines,start,reset}/`,
  `lib/` (browser JS), `shared/` + `shared/partials/` (templates),
  `fixtures/`, `docs/`.
- Every bespoke UX concern (hub, cya, commodity-lines, start, reset)
  has its own folder with `controller.js` + optional `template.njk`.
  Generic form pages stay flow-driven from
  `flow/flow.js` + `lib/page-controller.js` + `shared/page.njk` — no
  per-page feature folder.
- Vision + Nunjucks path in `src/config/nunjucks/nunjucks.js` now
  points at the spike root so `h.view('shared/page')` and
  `h.view('features/hub/template')` both resolve.
- `src/server/router.js` import switched from
  `browser/plugin.js` to `routes.js`.

**Design questions resolved:**

- Per-feature template vs shared generic: **kept the generic**
  (`shared/page.njk`) for every static form page; only bespoke
  features get their own template.
- Whether to keep `browser/` as a folder name: **dropped it**.
- Whether `domain/` splits or stays as one file: **kept as
  `domain/index.js`** (single file inside the folder). Ditto
  `engine/index.js`. A per-primitive split under `engine/` (page-status,
  container-status, navigation, etc.) is available as a follow-on
  polish; deferred.

**Verification passed:** 345 spike tests + 632 existing frontend tests
green. Browsable walk still works at
http://localhost:3000/prototype/eudpa-249/start.

Original detail preserved below for context; the "Approach" and
"Design questions to resolve during this to-do" sections apply to
future restructures if similar work happens again.

---

**Original why:** doing it before everything downstream (Joi call,
docs, V4 scale-up) means every follow-up references stable paths.
Doing it after (1) means the parent-spike files are already local and
can be moved cleanly.

**Reference:** the `obligations-v2-spike` folder on the parent-layouts
branch —
<https://github.com/DEFRA/trade-imports-animals-frontend/tree/spike/EUDPA-249-prototype-layouts/prototypes/standalone/obligations-v2-spike>.
That spike organises a car-insurance journey by **feature-first
folders**, with per-topic docs, an explicit `engine/` / `flow/` /
`lib/` / `shared/` split, and test files named for what they prove.
We adopt the shape, not the domain content.

**Fetch specific files:**

```bash
gh api repos/DEFRA/trade-imports-animals-frontend/contents/<path>?ref=spike/EUDPA-249-prototype-layouts \
  --jq '.content' | base64 -d
```

Key files to read first: `README.md`, `docs/architecture.md`,
`docs/add-a-field.md`, `docs/add-a-page.md`, `features/index.js`,
`features/about-you/{controller,obligations,page,template}.*`,
`engine/index.js`, `flow/flow.js`, `shared/kit.js`, `routes.js`.

#### Target layout

```
prototypes/journey-config-spikes/EUDPA-249-flow-layer/
├── README.md                    Root entrypoint — brief + pointers
├── RECOMMENDATION.md            (unchanged) — design record
├── NEXT.md                      (this file) — hand-off
├── routes.js                    Hapi plugin (was browser/plugin.js)
├── contract.js                  The seam (was browser/contract.js)
├── config.js                    Spike config wrapper (env flag reader)
├── dump.js                      Headless proof (was browser/dump.js)
├── obligations/                 Inlined from to-do 1
│   ├── obligations.js
│   ├── evaluator.js
│   ├── helpers.js
│   └── *.test.js
├── engine/                      Runtime primitives, per-concern files
│   ├── index.js                 Re-exports the public runtime API
│   ├── page-status.js
│   ├── container-status.js
│   ├── journey-state.js
│   ├── navigation.js            firstApplicable / firstUnfulfilled / firstPresenting
│   ├── expand-presents.js
│   ├── options.js               optionsFor()
│   └── *.test.js                Named per-concern
├── flow/                        Flow declarations + gate helpers
│   ├── flow.js                  Section/subsection/page tree
│   ├── section-status.js        Rollup helpers referenced by controllers
│   ├── navigation.js            Cross-section navigation glue
│   └── *.test.js
├── domain/                      Layer 1.25 — split by concern
│   ├── index.js                 Manifest keyed by obligation id
│   ├── enums.js                 staticEnum / computedEnum entries
│   ├── predicates.js            V4 predicates (dates, string lengths, arrays)
│   ├── labels.js                Domain-side labels (COUNTRY_LABELS etc.)
│   └── *.test.js
├── features/                    One folder per subsection
│   ├── index.js                 Registers every feature with the router
│   ├── country-of-origin/
│   │   ├── controller.js        The Hapi handler(s)
│   │   ├── obligations.js       Re-exports the obligations this feature presents
│   │   ├── page.js              Local flow declaration (presents entries)
│   │   ├── template.njk         Per-feature view when non-generic
│   │   └── *.test.js
│   ├── reason-for-import/
│   ├── purpose/
│   ├── transporter-type/
│   ├── transporter-details/
│   ├── transport-details/
│   ├── transited-countries/
│   ├── arrival-at-port/
│   ├── animals-certified-for/
│   ├── internal-reference/
│   ├── commodity-lines/         Bespoke Add-another UX lives here
│   │   ├── list.controller.js
│   │   ├── add.controller.js
│   │   ├── delete.controller.js
│   │   ├── list.njk
│   │   ├── obligations.js
│   │   ├── page.js
│   │   └── *.test.js
│   ├── hub/                     Task list
│   ├── check-your-answers/
│   ├── start/                   Landing redirect
│   └── reset/
├── lib/                         Utilities shared across features
│   ├── build-field-descriptors.js
│   ├── field-widgets.js
│   ├── format-domain-errors.js
│   ├── presentation.js
│   ├── state.js                 yar wrappers
│   └── *.test.js
├── shared/                      Templates + shared kit
│   ├── layout.njk
│   ├── error-summary.njk
│   ├── partials/
│   │   └── fields.njk
│   └── kit.js                   Nunjucks env helpers if any
├── fixtures/                    Named fulfilment fixtures for dump + snapshots
│   ├── empty.json
│   ├── internal-market-partial.json
│   └── transit-with-lines.json
└── docs/                        Topic-per-file — feeds to-do 5 & 6
    ├── README.md                Doc index + reading order
    ├── architecture.md          Three-layer + contract seam
    ├── obligation-model.md      Layer 1 explained (extracted from RECOMMENDATION.md)
    ├── domain-model.md          Layer 1.25 explained
    ├── flow-and-gates.md        Layer 2 explained + how subsections roll up
    ├── engine.md                Runtime primitives + reference
    ├── validation.md            Joi vs non-Joi + how predicates work
    ├── persistence.md           yar session shape + reset behaviour
    ├── analysis.md              Introspection primitives (data dictionary)
    ├── testing.md               Test taxonomy + mutation-walkthrough index
    ├── decisions.md             Design record (short entries per decision)
    ├── limits.md                Known gaps + explicit non-goals
    ├── features.md              Per-feature index (auto-generated by dump)
    ├── add-a-field.md           How-to (to-do 6)
    ├── add-a-page.md            How-to (to-do 6)
    └── add-a-subsection.md      How-to (to-do 6)
```

#### Adopt from v2-spike (structural)

1. **Feature-first co-location.** All four concerns of one user-facing
   thing (obligations declaration, page config, controller, template)
   live in the same folder. Add / rename / delete a feature = touch
   one folder. Directly attacks discoverability.
2. **`engine/` split per primitive.** Break `runtime.js` into named
   files under `engine/`. Each primitive is one file with its own
   test. `engine/index.js` exposes the public API so `contract.js`
   imports look the same.
3. **`docs/` as a first-class folder** with a `README.md` index. Each
   topic gets a short file (~200-500 lines max). No file mixes
   architecture with how-to.
4. **`shared/` + `lib/` split.** `shared/` = cross-feature templates
   and Nunjucks helpers. `lib/` = cross-feature JS (widgets, error
   mapping, state). Feature folders import from either freely.
5. **Test files named for behaviour** where it clarifies (e.g.
   `engine/resume-self-heal.test.js`), and test files mirroring
   source where the source is one unit (`engine/page-status.test.js`).
6. **`features/index.js` as a registry** — every feature module
   exports its route set; the router imports them via the index and
   composes. Adding a feature is one line in `index.js`.
7. **Contract tests at root level** (`contract.test.js`) that pin the
   seam's public shape independent of any feature.

#### Do NOT adopt from v2-spike

- **Domain content** — car-insurance-specific (claims, cover-type,
  no-claims-discount, quote). Our features come from the V4 spec.
- **`analysis/reachability` / `analysis/simulate`** — defer to a
  future ticket; not needed for the current spike shape.
- **`t1-*` / `t2-*` prefixed test files** — those look ticket-scoped
  and don't match our current naming convention. Skip until a real
  reason surfaces.
- **`registry.js` if `features/index.js` already covers it** — pick
  one convention.

#### Migration plan (one PR, one commit)

The move is mechanical — no behaviour change. Keep it in one commit
so `git log --follow` on any moved file gives a clean trail. Break the
164 tests only briefly (during the intermediate commit); the pre-push
tests must be green.

1. **Scaffold empty folders** — `mkdir -p engine flow domain features
lib shared/partials fixtures docs obligations` — in one step so
   nothing looks half-done.
2. **Move files with git mv** so history follows:
   - `browser/plugin.js` → `routes.js`
   - `browser/contract.js` → `contract.js`
   - `browser/dump.js` → `dump.js`
   - `runtime.js` → `engine/index.js` (initially a re-export shim;
     split later within the same commit into per-primitive files)
   - `flow.js` → `flow/flow.js`
   - `domain.js` → split into `domain/index.js` + `domain/enums.js` +
     `domain/predicates.js` + `domain/labels.js`
   - `browser/field-widgets.js` → `lib/field-widgets.js`
   - `browser/format-domain-errors.js` → `lib/format-domain-errors.js`
   - `browser/build-field-descriptors.js` → `lib/build-field-descriptors.js`
   - `browser/presentation.js` → `lib/presentation.js`
   - `browser/state.js` → `lib/state.js`
   - `browser/templates/*` → `shared/*` (layout, error-summary,
     partials/fields) and per-feature `template.njk` where the
     template is feature-specific.
   - `browser/fixtures/*` → `fixtures/*`
   - controllers → `features/<name>/controller.js` per subsection
     (see the target layout above).
3. **Split domain and runtime** into their per-concern sub-files
   in-commit. Keep `domain/index.js` and `engine/index.js` exporting
   the same public API.
4. **Rewrite imports** everywhere. Use `node --check` on every
   moved file plus `npx eslint prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
   to catch unresolved specifiers.
5. **Update three files outside the spike:**
   - `src/config/nunjucks/nunjucks.js` — swap the Vision + Nunjucks
     path from `browser/templates` to `shared` (plus per-feature
     folders if we teach it to walk `features/*/template.njk`; the
     simpler alternative is copying feature templates into a single
     `shared/features/<name>.njk` and using name-based lookup — pick
     the cleaner one during the move).
   - `src/server/router.js` — plugin file moved to `routes.js`; update
     the dynamic-import path.
   - `.claude/settings.local.json` / any local scripts referencing the
     old paths.
6. **Update RECOMMENDATION.md** file-map section with the new tree
   and every path reference. Update the paths in this NEXT.md too.
7. **Run the full test suite.** All 164 spike tests + 632 frontend
   tests green. Manual walk in browser at /prototype/eudpa-249/start.

#### Commit style

One commit: `refactor(EUDPA-249): feature-first folder layout inspired
by obligations-v2-spike`. Body enumerates the moves so `git log
--stat` on the commit shows the reshape at a glance. No behaviour
change.

#### Verification

- `npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/` → 164 green.
- `npx vitest run --exclude 'prototypes/**'` → 632 green.
- Manual walk of the browsable journey at
  http://localhost:3000/prototype/eudpa-249/start (same behaviour).
- `grep -rn "from '../runtime.js'\|from '../domain.js'\|from '../flow.js'"
prototypes/journey-config-spikes/EUDPA-249-flow-layer/features/` → zero
  hits (features go through `contract.js` only).

#### Design questions to resolve during this to-do

- **Per-feature templates vs generic + per-feature JSON copy.** The
  v2-spike puts a `template.njk` in each feature folder. We currently
  use one generic `page.njk` for every static form page. Options:
  - Keep the generic; move it to `shared/page.njk`. Feature folders
    only have `template.njk` if the feature is _bespoke_
    (commodity-lines list, hub, cya). Recommended — the generic path
    is a real invariant we don't want to give up.
  - Or duplicate the generic per feature. Simpler discovery but
    dilutes the "one place to change" story.
- **Whether to keep `browser/` as a folder name.** v2-spike does
  everything at the root. I'd drop `browser/` — it added a level
  without carrying meaning.
- **Whether `domain/` splits or stays as one file.** If the split
  drives duplication, keep the single `domain.js`. If it aids
  navigation (my expectation), keep the split.

### 3. Mutation walkthrough + coverage-gap closure ✅ DONE

Written up in [`docs/testing.md`](./docs/testing.md). Five mutations
applied, each with recorded diff, failing-test list, sample error
output, and invariant claim. Two of the five originally exposed
coverage gaps, which were closed in the same session by new test
files:

1. **Rename an obligation** → 9 test files fail with `ReferenceError`
   at module load.
2. **Change enum options** → 4 tests fail across model, integration,
   HTTP layers.
3. **Widen a whitelist** → NOW 1 test fails in
   [`obligations/whitelists.test.js`](./obligations/whitelists.test.js)
   (34 tests covering all 7 commodity-code-scoped whitelists).
4. **Flip a scope-gate predicate** → 15 tests fail across 6 files —
   the strongest evidence of "provable via tests".
5. **Add an unwired obligation** → NOW 1 test fails in
   [`obligations/coverage.test.js`](./obligations/coverage.test.js)
   (3 tests; a `KNOWN_UNWIRED` allow-list carries the 26 obligations
   that step 5 will wire during V4 buildout).

**Both round-1 coverage gaps closed** by
[`obligations/whitelists.test.js`](./obligations/whitelists.test.js) and
[`obligations/coverage.test.js`](./obligations/coverage.test.js).

**Round 2** ran six more mutations against deeper invariants:
category classifier, domain-manifest key alignment, structural
`within` references, page-`presents` alignment, `within` deletion,
duplicate obligation `name`. Five fired existing tests correctly; one
(duplicate name) exposed a new gap, closed by two new uniqueness
assertions in `coverage.test.js`. Two cross-mutation wins: the
round-1 closure tests independently caught round-2 mutations they
weren't designed for.

**Round 3** ran five more mutations against corners: duplicate page
name in flow, manifest reorder, circular `within` self-loop,
`allowListed` helper inversion, subtle presentation-copy change.
Findings:

- Circular `within` **hangs the test suite** rather than failing —
  worse than uncaught. Closed by a cycle-detection test in
  `coverage.test.js` that fires in 3 ms.
- Subtle presentation-copy change slips through (only obvious changes
  are caught). **Deferred as UX-review territory** — snapshot tests
  or per-entry equality would fire on false positives.
- Manifest reorder confirmed safe (no-op), matching the doc claim.

Baseline now **15 test files, 385 tests, all pass** (started at
13/345 before round 1, 15/382 after round 1, 15/384 after round 2,
15/385 after round 3). Full detail in
[`docs/testing.md`](./docs/testing.md). Across three rounds and 16
mutations, four gaps found, three closed, one deferred to UX review.

**Follow-on for step 5:** the `KNOWN_UNWIRED` allow-list in
`obligations/coverage.test.js` should shrink as V4 buildout adds
domain entries. Delete the entry, add the domain rule.

**Original detail — the 5 candidate mutations from planning stage —
preserved below in case future work wants to expand the walkthrough.**

---

**Original why (kept for context):** high-signal artifact for the
"provable via tests" claim. Cheap once (1) and (2) are settled — needs
stable file paths.

**Why third:** high-signal artifact for the "provable via tests"
claim. Cheap once (1) and (2) are settled — needs stable file paths.

**Deliverable:** `prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/mutation-walkthrough.md`
(new `docs/` subfolder — first doc lives there).

**Five mutations to record** (adjust to reality; these are candidates):

1. Rename `reasonForImport` in `obligations.js` → domain.js + flow.js
   fail at import; every test file that imports it fails; catches
   drift instantly. (Screenshot / paste the vitest error output.)
2. Change `PURPOSE_BY_REASON['internal-market']` value list in
   `domain.js` → `domain.test.js` "computedEnum — purpose" cases
   fail; `browser/plugin.test.js` option-filtering assertion fails.
3. Widen `PACKAGE_COUNT_COMMODITIES` whitelist in `obligations.js` →
   `browser/contract.test.js`, `integration.test.js`,
   `browser/dump.test.js` snapshot deltas.
4. Flip `purposeInInternalMarket` `applyTo` gate predicate (e.g.
   remove the "internal-market" branch) →
   `integration.test.js` "task-list rollup" and `browser/plugin.test.js`
   "page visibility" cases fail.
5. Add a new required singleton obligation with no domain entry, no
   presents entry, no presentation copy →
   `data-dictionary-sketch.js coverageReport()` shows it missing;
   `dump.test.js` snapshot missingRequired changes.

For each, record: mutation, expected failure output, one-liner
reasoning about what that proves. Aim for ~200 words per mutation.
Total document ~1200 words.

**Verification:** the doc's own claims are correct — apply each
mutation, run the tests, screenshot / paste the failure. Revert.

### 4. "How to add X" docs + coverage test — iterative

**Why fourth:** freezes the extension pattern (with the restructure's
target layout) before the V4 buildout scales it. Directly parallels
the `docs/add-a-collection.md`, `add-a-field.md`, `add-a-page.md` set
in the v2-spike reference.

**Step 4 is iterative, not a one-shot doc.** Each iteration:

1. Pick a real target — one new obligation, page, or subsection.
2. Follow the docs as they stand today (or write the first-cut skeleton
   if this is iteration 1).
3. Implement the target — obligation entry, domain, presentation,
   flow, tests.
4. Fold "what actually happened" back into the docs — worked example
   sections, gotchas, refinements.
5. Verify: `npx vitest run` + `npm run dev` and click through.
6. One atomic commit per iteration.

Iteration 2 finds where iteration 1's docs fell short. By ~iteration
3-4 the docs are honest; iteration 5+ is pure step-5 scale-up done
under docs that already work.

**Step 4 iterated enough delivers a substantial chunk of step 5.**
The line between them blurs. When the docs stabilise and the coverage
test's `KNOWN_UNWIRED` list has shrunk to zero (or to obligations
that legitimately need no domain entry), step 4 is complete and step
5's remaining scope is whatever full V4 hasn't been touched yet.

**Recommended first iteration:** add `containsUnweanedAnimals` as a
single page in a new subsection under the existing `arrival` section.

- Yes/No enum, notification-level, always-mandatory. Simplest domain
  shape (`staticEnum(['yes', 'no'], { labels: ... })`).
- Currently in `KNOWN_UNWIRED` — removing it is a satisfying exercise
  of step 3's coverage machinery.
- New subsection exercises subsection-level plumbing without also
  inventing top-level section copy.
- Docs land as first-cut `docs/add-an-obligation.md`.

**Suggested later iterations** (rough order of increasing complexity;
the docs get refined at each):

- 2 — obligation with a **predicate** (e.g. `regionCode` — max-5
  string, conditional on `regionCodeRequirement`).
- 3 — obligation with a **computed enum** (options depend on another
  obligation).
- 4 — obligation that **presents on an existing page** rather than a
  new one.
- 5 — full **address block** (composite widget — pressures the
  widget dispatch table).

By iteration 5 we'll have hit every current domain factory shape and
pressured the widget dispatch table, which is exactly the shape step
5 was going to be anyway. If a real certificate integration lands
before then, add a `lookup-result`-style iteration to design the
async-fetch pattern against the real API.

**Coverage test already partially exists.**
[`obligations/coverage.test.js`](./obligations/coverage.test.js)
(added in step 3) asserts every obligation is either wired to a
domain entry or on the `KNOWN_UNWIRED` allow-list. Step 4's coverage
test just extends it — currently the allow-list carries ~26 entries
for the V4 buildout to whittle down. Each iteration removes at least
one entry.

**Deliverables at the end of step 4 (however many iterations):**

- `docs/add-an-obligation.md` — refined by real use.
- `docs/add-a-page.md` — probably a shorter doc that references the
  obligation doc for the shared checklist steps.
- `docs/add-a-subsection.md` — likewise.
- ~5-10 new obligations properly wired, matching whichever iterations
  we ran.
- `KNOWN_UNWIRED` shrinking towards zero.

**Verification:** at each iteration, the browsable walk includes the
new page(s); every test file green; `KNOWN_UNWIRED` entry count
strictly decreases.

### 5. Build out the full V4 journey (was to-do 7)

**Why sixth:** the big scale-up. Pattern is settled by then; execution
is mechanical.

**Approach:** iterate the V4 spec (Confluence page 6497338582)
top-to-bottom. For each field:

1. Confirm it's already an obligation in `obligations.js` (many are).
2. Add a domain entry if there's non-trivial legality (max lengths,
   multi-select caps, date formats).
3. Add a `presents` entry on the right page + subsection in
   `flow.js`. Add presentation copy if the default humanised name
   doesn't cut it.
4. Update fixtures if needed for `dump.test.js` snapshots.

**Watch for design pressure:**

- **New widget shapes** — standard-address-block, file-upload,
  multi-line textarea, telephone. Extend `field-widgets.js` with a
  new rule per shape.
- **Cross-record predicates** — "≥ 1 animal identifier per unit" is
  the big one. Not a per-record predicate; a per-group one. Might
  require a small runtime extension (`validateGroup(group, state)`)
  or a new domain-entry shape (`groupPredicate`). Discuss before
  implementing — this is a real design decision.
- **Structural groups** — the parent branch has `presentsForEach`
  handling for user-driven-indexed groups; our v1 skips them. Line
  iteration is already deferred to v2 (see the "Commodity-lines UX"
  section in RECOMMENDATION.md). If the full V4 spec requires unit
  records (per-animal identifiers), we'll need to promote `presentsForEach`
  routing generation from bespoke `line-controllers.js` to a
  generalised `pagesForEach` primitive at the flow layer. That's the
  same v2 work; it becomes non-optional at this point.

**Verification:** every V4 field in the spec has a corresponding
obligation + domain entry + `presents` reference; the coverage test
from (5) passes; the browsable journey walks every subsection to F.

### 6. Code reviews (was to-do 8)

**Not a single event — stage them.** After each of (3), (4), and a
bigger review after (5). Each of those milestones is small and
self-contained. Trying to review the whole thing at the end guarantees
drift.

Suggested review checklist per milestone:

- Contract seam not bypassed — nothing in `features/*` or `lib/*`
  imports directly from `engine/index.js`, `domain/index.js`, or
  `flow/flow.js`; everything goes through `./contract.js`. Enforce via
  `grep -rn "from '../engine\|from '../domain\|from '../flow" features/ lib/ | grep -v contract`
  returning nothing.
- 345+ tests still green.
- New tests added for new behaviour.
- Prettier + eslint pass.
- RECOMMENDATION.md + docs updated to match reality.

## Parked — pick up after step 5 (V4 buildout)

Two items intentionally deferred until the V4 buildout has run and
its outcomes are visible.

### P1. Joi adoption for the domain-driven validation path

**Decision recorded:** Defra's preferred tooling is Joi. Domain-driven
validation _should_ route through Joi. Feature controllers _should_
be able to add bespoke Joi rules on top via a `preValidate` hook.

**Execution deferred until after step 5 (V4 buildout)** because two
design questions surface naturally in that scale-up and shape the
Joi refactor:

- **Cross-record predicates.** The V4 rule "≥ 1 animal identifier per
  unit-record" is per-_group_, not per-field. Joi handles per-field
  cleanly and per-group less cleanly. Design the primitive
  (`groupPredicate`? `Joi.custom()` at page level?) against a real
  requirement, not a guess.
- **Line-scoped fields under Joi's static-shape assumption.** Joi
  schemas want fixed keys; commodity-line fields want N instances of
  the same obligation. Solvable via per-request schema build, but the
  exact convention is easier to design when line iteration is fully
  wired in step 6.

**Scope when it's picked up** — approximately one focused day:

- Port a minimal `lib/validate/run.js` from v2-spike (~30 lines);
  adapt to our `{ code, obligation, path }` error shape.
- Add a `buildSchema(fulfilments, ctx) → Joi.Schema` method to each
  domain factory (`staticEnum`, `computedEnum`, `predicate`, plus the
  `transitedCountries` composite).
- Rewrite `engine/index.js validate()` to call `buildSchema` + run
  the Joi schema + translate error tree.
- Coercion parity check — Joi's default `convert: true` differs from
  our current strictness; either set `convert: false` or update tests.
- Add the `preValidate` hook to `lib/page-controller.js` and a
  `features/index.js` registry so feature controllers can extend
  with bespoke Joi.
- One worked example: pick a real V4 feature that needs a
  controller-side rule and demonstrate the `preValidate` extension.
- Update `RECOMMENDATION.md` + write `docs/validation.md`.

**Verification target:** 345+ tests still green (some coercion tweaks
expected). Browsable walk unchanged.

**Reference:** [`obligations-v2-spike/lib/validate/`](https://github.com/DEFRA/trade-imports-animals-frontend/tree/spike/EUDPA-249-prototype-layouts/prototypes/standalone/obligations-v2-spike/lib/validate)
on the parent-layouts branch — the Joi harness we adapt.

### P2. Data dictionary as a committed markdown artefact

**Why parked:** `data-dictionary-sketch.js` already builds the
dictionary programmatically; the coverage claim it supports (every
obligation is either wired to a domain entry or explicitly allow-
listed) can be exercised by the coverage test in step 4 without a
committed MD file. Waiting until the V4 buildout means the first
committed dictionary reflects the real V4 coverage, not the partial
slice we ship today.

**Scope when picked up** — approximately half a day:

- Extend `data-dictionary-sketch.js` with a `renderMarkdown()` export.
- Add an npm script:
  ```json
  "docs:data-dictionary": "node prototypes/journey-config-spikes/EUDPA-249-flow-layer/data-dictionary-sketch.js > prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/analysis.md"
  ```
- Commit the generated `docs/analysis.md`. Regenerate on obligation /
  domain changes.
- **Optional stretch:** an HTML view at
  `/prototype/eudpa-249/data-dictionary` that renders the same content.
  Do only if stakeholders ask for it.

**Verification:** the generated dictionary matches
`buildDictionary()` output; the MD passes `npx prettier --check`.

## Design questions to resolve before executing

- **(1) fork vs shim** — resolved (fork).
- **(2) three sub-calls during the restructure** — resolved (kept
  generic template, dropped `browser/`, kept single-file `domain/` and
  `engine/`).
- **(Parked Joi work) cross-record predicate shape + line-scoped
  Joi schema** — design these when step 6 forces the requirements.

## Conventions to follow

- **Do not push without a user go-ahead.** Local commits are fine.
- **`auth: false` on every prototype route.** Keep the demo public
  even when host auth is on.
- **Anything gated by `prototype.eudpa249.enabled`** — production ships
  nothing prototype-related. Any new files that need production reach
  must be added inside the gate too.
- **Templates go through `shared/` and `features/*/template.njk`** —
  never reach into `src/server/...` templates. Cherry-pick from
  parent-layouts if a pattern exists there.
- **Do not restate model rules in the browser layer.** Anything a
  controller / template needs to know about the model goes through
  `./contract.js`. If you have to reach past it, extend the contract
  instead.
- **Test the invariants, not just the happy path.** `dump.test.js`
  snapshots catch drift; extend them when you change fixtures.
- **Prettier + eslint pass** — husky pre-commit will enforce it, but
  spare yourself the retry loop.
- **Auth default:** `auth.enabled` in
  [`src/config/config.js`](../../../src/config/config.js) is now
  `!isDevelopment` — do not revert to `true` without a
  matching adjustment to the signout + context test suites.

## Reference material

- **Ticket:** <https://eaflood.atlassian.net/browse/EUDPA-249>
- **V4 spec:** Confluence page 6497338582 — Live Animals Data Fields
  V4. Fetch via `tools/confluence/page.sh 6497338582 summary` or
  `tools/confluence/page.sh 6497338582 json` from the workspace root.
- **Parent EUDPA-277 spike:**
  [`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)
  — obligations.md (150-page canonical doc), RECOMMENDATION.md,
  GAPS.md.
- **Parent-layouts branch:** `spike/EUDPA-249-prototype-layouts` on
  `DEFRA/trade-imports-animals-frontend`. Fetch specific files via
  `gh api repos/DEFRA/trade-imports-animals-frontend/contents/<path>?ref=spike/EUDPA-249-prototype-layouts --jq '.content' | base64 -d`.
  Notable paths on that branch:
  - `prototypes/model-spikes/shared/{controller,nav,domain,joi}.js`
  - `prototypes/standalone/obligations-standalone-spike/`
  - `prototypes/e2e/task-list-with-linear-tasks.spec.js`
- **This spike's RECOMMENDATION.md** — the design record. Update it
  whenever any of (1)-(6) changes the story.

## Where the current commits sit

```
* 3c1b066 fix(EUDPA-249): auth-off default in dev + Vision path + prototype docs
* 1191ce3 feat(EUDPA-249): browsable V4 journey on the three-layer model
* 67fed20 chore(EUDPA-249): flow-layer spike PLAN.md
* cc8135f docs(EUDPA-277): update obligations.md to reflect V4 spike changes
  ...
```

Pushed to origin/spike/EUDPA-249-flow-layer.
