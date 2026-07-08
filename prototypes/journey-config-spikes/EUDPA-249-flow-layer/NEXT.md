# EUDPA-249 — what's next

This file is a hand-off for whoever picks up next (human or fresh
agent). It captures where the spike is, the eight agreed to-do items,
the recommended order, and the design calls that need resolving before
you can execute each.

---

## Where we are

- **Branch:** `spike/EUDPA-249-flow-layer`, pushed to
  `DEFRA/trade-imports-animals-frontend`.
- **Commits** on top of the flow-layer PLAN commit (`67fed20`):
  - `1191ce3` — `feat(EUDPA-249): browsable V4 journey on the three-layer model`
  - `3c1b066` — `fix(EUDPA-249): auth-off default in dev + Vision path + prototype docs`
  - `f47b7c3` — `docs(EUDPA-249): hand-off doc — eight to-dos incl. folder restructure`
  - (plus the step-1 inline commit — will be here once pushed)
- **Step 1 status:** DONE. Obligations spike forked into
  `./obligations/`; `grep -rn 'obligations-v4-model'` returns only
  historical doc pointers.
- **Tests:** 345 spike tests (164 spike + 181 forked obligation tests)
  - 632 existing frontend tests, all green.
    Run `npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.
- **Browsable demo:** `npm run dev` (auth defaults off in dev now),
  then http://localhost:3000/prototype/eudpa-249/start.
- **The user reviews before pushing.** Local commits are fine, but do
  not push without a user go-ahead. The last push was explicitly
  requested.

Read [`RECOMMENDATION.md`](./RECOMMENDATION.md) end-to-end before doing
anything — it explains the three-layer architecture, the contract
seam, the browser layer, tests + convention that prove the mapping,
the env gate, and the v2 backlog. This NEXT.md assumes you have.

## Path map

```
prototypes/journey-config-spikes/EUDPA-249-flow-layer/
├── domain.js                        Layer 1.25 constraint declarations
├── flow.js                          Layer 2 section/subsection/page tree
├── runtime.js                       Pure primitives (pageStatus, etc.)
├── controller-sketch.js             JOI composition sketch (historical)
├── data-dictionary-sketch.js        Dictionary builder — feeds to-do 3
├── RECOMMENDATION.md                Design write-up
├── PLAN.md                          Original spike plan (historical)
├── NEXT.md                          This file
├── *.test.js                        Model-layer tests
└── browser/
    ├── plugin.js                    Hapi plugin
    ├── contract.js                  The seam — browser ↔ model
    ├── {page,hub,cya,line,misc}-controller[s].js
    ├── build-field-descriptors.js
    ├── field-widgets.js             Widget dispatch table
    ├── format-domain-errors.js
    ├── presentation.js              Human copy
    ├── state.js                     yar session wrappers
    ├── dump.js                      Headless proof
    ├── fixtures/*.json              Named fulfilment fixtures
    ├── templates/*.njk              Cherry-picked from prototype-layouts
    └── *.test.js                    Widget / contract / plugin / dump tests
```

The parent EUDPA-277 obligations model lives at
`prototypes/model-spikes/obligations-v4-model/`. Everything in
`domain.js`, `flow.js`, `browser/contract.js`, `browser/plugin.test.js`
imports from it via `../../model-spikes/obligations-v4-model/` — that
cross-folder import goes away in to-do 6.

The parent-layouts branch `spike/EUDPA-249-prototype-layouts` has the
14-function `contract` interface, four alternative model-spikes (a-d),
`obligations-standalone-spike`, and shared scaffolding. **Reference
only** — not a merge target, cherry-pick fragments as needed.

## The eight to-dos (in recommended order)

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

### 2. Restructure the folder layout for clarity and discoverability (NEW)

**Why second:** doing it before everything downstream (Joi call, docs,
V4 scale-up) means every follow-up references stable paths. Doing it
after (1) means the parent-spike files are already local and can be
moved cleanly.

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
│   ├── enums.js                 staticEnum / computedEnum / lookupEnum entries
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
│   ├── reset/
│   └── lookup/                  Seeded async lookup for certifiedFor
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

### 3. Settle Joi vs non-Joi for validation (was to-do 2 / originally to-do 4)

**Why second:** affects the shape of controllers (to-do 5), what "how
to add X" documentation says (to-do 3+), and whether the coverage
test in to-do 5 checks Joi schemas or domain entries.

**Not a code job — a team decision.** 20-minute conversation, then
one direction. See RECOMMENDATION.md Trade-offs table for the raw
comparison. My tentative preference (not decided):

- **Keep the internal predicate path as the source of truth** (domain
  entries stay JSON-portable, cross-record predicates stay clean).
- **Generate a Joi shape as a _view_ of the domain** — the
  `controller-sketch.js` approach — so downstream services or the
  admin UI can consume a Joi schema without duplicating the rules.
- Update `RECOMMENDATION.md`'s "Correctness" section with the settled
  answer.

If team lands on Joi-native, the reverse: domain entries become Joi
descriptors + custom rules, and `validate()` in runtime.js delegates
to `.validate()` on the schema. Bigger refactor, but tests stay
mostly intact because `format-domain-errors.js` becomes the mapping
layer.

**Verification:** whichever direction, 164 tests still green after.

### 4. Mutation walkthrough — "what tests fail if we change the obligations model" (was to-do 1)

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

### 5. Data dictionary as a committed artefact (was to-do 3)

**Why fifth:** `data-dictionary-sketch.js` already builds it; we just
need to publish it. Cheap. After the restructure, this doc lands in
`docs/analysis.md` alongside any other introspection material.

**Deliverable:** `docs/data-dictionary.md` generated by a small
extension to `data-dictionary-sketch.js` (add a `renderMarkdown()`
export), plus a script line in package.json:

```json
"docs:data-dictionary": "node prototypes/journey-config-spikes/EUDPA-249-flow-layer/data-dictionary-sketch.js > prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/data-dictionary.md"
```

The MD file gets checked in so PR reviewers see it in the diff.
Regenerate on obligation / domain changes.

**Optional stretch:** an HTML view at `/prototype/eudpa-249/data-dictionary`
that renders the same content. Nice for stakeholders. Do only if
there's demand.

**Verification:** the generated dictionary matches
`data-dictionary-sketch.js buildDictionary()` output; the MD parses
cleanly with `npx prettier --check`.

### 6. "How to add X" docs + coverage test (was to-do 2)

**Why sixth:** freezes the extension pattern (with the restructure's
target layout) before to-do 7 scales it. Directly parallels the
`docs/add-a-collection.md`, `add-a-field.md`, `add-a-page.md` set in
the v2-spike reference.

**Deliverables (all under `docs/`):**

- `docs/add-obligation.md` — the walkthrough for adding a new V4 data
  field. Steps: obligations.js entry (identity + applyTo + within if
  grouped) → domain.js entry (if it has legal-value semantics) →
  flow.js `presents` entry on a page → optional presentation.js copy
  → tests. Include a worked example (pick a real V4 field the current
  slice doesn't cover — e.g. `contactAddress` breakdown).
- `docs/add-page.md` — flow.js changes only; how presents / mandate /
  path work.
- `docs/add-subsection.md` — flow.js + hub tag consequences.

**Coverage test to promote:** `data-dictionary-sketch.js
coverageReport()` currently returns a `{ missing: [...] }` list. Turn
that into a _failing_ test (`data-dictionary-sketch.test.js`)
that asserts every obligation with an in-scope status in the current
V4 slice has either a domain entry OR is on an allow-list of "text
fallback OK" obligations (short strings, free-text). New obligations
without a domain entry fail the build until they're either wired or
allow-listed.

**Verification:** the coverage test fails when a required entry is
missing and passes when it's wired.

### 7. Build out the full V4 journey (was to-do 5)

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

### 8. Code reviews (was to-do 7)

**Not a single event — stage them.** After each of (3), (4), and (2)
if it involved code. Then a bigger review after (6). Each of those
milestones is small and self-contained. Trying to review the whole
thing at the end guarantees drift.

Suggested review checklist per milestone:

- Contract seam not bypassed (`grep -rn "from '../runtime.js'" browser/ | grep -v contract` should return nothing).
- 164+ tests still green.
- New tests added for new behaviour.
- Prettier + eslint pass.
- RECOMMENDATION.md + docs updated to match reality.

## Design questions to resolve before executing

- **(1) fork vs shim** — quick call. Fork is cleaner; shim is safer if
  parent might evolve.
- **(2) three sub-calls during the restructure** — see the "Design
  questions to resolve during this to-do" bullets under to-do 2:
  per-feature vs shared templates; keep or drop `browser/`; domain
  split vs single file. All low-risk; commit style is one PR so no
  design decision blocks the reshape.
- **(3) Joi vs non-Joi** — 20-minute team conversation. Blocks (6)+(7).
- **(7) cross-record predicate shape** — deferred; will surface when V4
  iteration hits identifier requirements. Design when it does.

## Conventions to follow

- **Do not push without a user go-ahead.** Local commits are fine.
- **`auth: false` on every prototype route.** Keep the demo public
  even when host auth is on.
- **Anything gated by `prototype.eudpa249.enabled`** — production ships
  nothing prototype-related. Any new files that need production reach
  must be added inside the gate too.
- **Templates go through `browser/templates/`** — never reach into
  `src/server/...` templates. Cherry-pick from parent-layouts if a
  pattern exists there.
- **Do not restate model rules in the browser layer.** Anything the
  browser needs to know about the model goes through `browser/contract.js`.
  If you have to reach past it, extend the contract instead.
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
