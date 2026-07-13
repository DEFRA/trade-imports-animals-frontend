# EUDPA-249 — Flow-layer spike recommendation

_Spike branch:_ `spike/EUDPA-249-flow-layer` \
_Folder:_ `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` \
_Reads from:_ `./obligations/` — obligations manifest + evaluator +
helpers forked from EUDPA-277's
[`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)
so the spike is self-contained. See §Obligations fork below.

## Recommendation

Adopt a **three-layer architecture** for expressing journey
configuration keyed by commodity code and country of origin:

| Layer                                      | Owns                                                                                                | Answers                                              |
| :----------------------------------------- | :-------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| **1 — Obligations** (as-is from EUDPA-277) | identity, cardinality, **scope** (`applyTo`)                                                        | "Does this data field apply, given current state?"   |
| **1.25 — Domain** (NEW)                    | per-obligation **value legality** — enum options (static / computed), predicates, cross-field rules | "Is this proposed value legal, given current state?" |
| **2 — Flow** (NEW)                         | pages, sections, presents entries; page/section/journey status; navigation                          | "What does the user see next?"                       |

Every AC bullet lands cleanly on this split:

- **Show/hide a page** — a page becomes NA when every presented
  obligation is out of scope. Driven purely by the obligation's own
  `applyTo`; the flow declaration is unchanged.
- **Show/hide a question** — a question is a presented obligation; its
  applicability inherits the same mechanism.
- **Show/hide an option** — `optionsFor(obligation, fulfilments, ids,
domain)` resolves the current legal option set from the domain
  entry. The browser layer uses the same call to build the widget
  (radios / select / checkboxes) and to derive validation.
- **Correctness** — three independent lines of defence:
  1. Contract seam (`contract.js`) — the only place the browser
     layer reads model information; enforced by convention + tests.
  2. Tests at four levels — domain isolation, runtime primitives with
     synthetic fixtures, integration through the real V4 slice, and
     HTTP-level `server.inject` walks. See the Browsable prototype
     §How the logical model maps to controllers / HTML / JS below.
  3. Business-facing dictionary (`data-dictionary-sketch.js`) built by
     walking obligations + domain metadata.

The spike ships **564 passing tests** across 23 files; the browsable
journey mounts at `/prototype/eudpa-249/*` in the existing frontend
process. Every V4 leaf obligation in the manifest that has a flow
presence (40 of 44) is wired to a domain entry, presentation copy,
and a flow page; the 4 exempt entries are the 2 structural group
containers (`commodityLine`, `unitRecord`) and 2 system-populated
fields (`poApprovedReferenceNumber`, `responsiblePersonForLoad`)
whose value legality is enforced upstream — see
`obligations/coverage.test.js` for the allow-list narrative. Step 4
completed across 10 iterations documented in
[`docs/add-an-obligation.md`](./docs/add-an-obligation.md); step 5
tightened the wired set against the V4 spec across 5 sub-steps
(identifier caps, group invariant, missing obligations + enum
expansions, `animalsCertifiedFor` semantic overhaul, and expanding
the standard address block from 4 sub-fields to 9).

## Playback script (5 minutes)

1. **The problem, in one line.** V4 journey config today would spread
   scope, option lists, predicates, and page composition across at
   least three unrelated code paths. Change management is hard.
2. **The three layers.** Obligations already exists (EUDPA-277). We
   add Domain (constraint declarations) and Flow (pages + presents).
   Everything is a plain JS module keyed by obligation id — same idiom
   as the parent spike.
3. **One change lands in one place.** Walk through:
   - "The purpose sub-values change when reason is transit":
     edit `PURPOSE_BY_REASON` in `domain/index.js`.
   - "This new commodity code needs a package count":
     edit `PACKAGE_COUNT_COMMODITIES` in the obligations manifest.
   - "This page shows one extra question":
     add a presents entry to `flow/flow.js`.
     Nothing else moves.
4. **Correctness is enforced three ways** — contract seam
   (`contract.js` is the only path from browser → model), tests
   (four levels: domain isolation, runtime primitives, integration,
   HTTP `server.inject`), dictionary (introspectable metadata).
5. **Walk the browsable prototype live.** `npm run dev`,
   `http://localhost:3000/prototype/eudpa-249/start`. Show a stakeholder
   the flow, the task list, page + question visibility, option
   filtering, real V4 predicates, and CYA Change links.
6. **What's out of scope** (see below).

## Key design decisions

### D1 — Domain is keyed by obligation id, not commodity code

The AC frames the problem "keyed by commodity code and country of
origin", but that's the _input_ dimension, not the _storage_ one.
Obligations already model the fan-out from commodity code + country
via `applyTo` (see EUDPA-277 `helpers.js` — `allowListed`,
`branchedGate`, etc.). Adding a second commodity-code-keyed lookup
layer for domain would duplicate that logic and create a
consistency-drift risk.

Instead: **each obligation has one domain entry**; the entry reads
whichever sibling obligations it needs to compute the current option
set. `purposeInInternalMarketDomain` reads `reasonForImport`; the
`arrivalDateAtPort` predicate parses DD/MM/YYYY per the V4 spec; the
`transitedCountries` entry caps selections at 12. Same idiom as
`applyTo`. One mechanism, one testing story.

### D2 — Data-shaped where possible; function escape hatch where computed

`staticEnum` is 100 % introspectable — the data dictionary can
enumerate its outputs without executing code. `computedEnum` and
`predicate` are function-shaped but carry
`metadata.readsFrom` and `metadata.reasons` respectively so the
dictionary can still report reachability and possible failure codes
statically. This mirrors the `helpers.js` "declare via helper,
introspect via `.metadata`" pattern from EUDPA-277.

### D3 — Runtime primitives are small pure functions, not one `evaluate`

The Flow layer exposes ~6 primitives (`pageStatus`, `containerStatus`,
`journeyState`, `firstApplicablePage`, `firstUnfulfilledPage`,
`firstPagePresentingObligation`) plus two domain primitives
(`optionsFor`, `validate`). Each answers one specific question. This
matches the JourneyEvaluator design agreed in EUDPA-277's obligations
doc and keeps each primitive independently unit-testable — no browser,
no orchestrator, no long fixtures.

### D4 — Predicate ctx carries `siblingValue(obligation)` scoped by path

Line-scoped obligations (`numberOfAnimals`, `species`) store as
`fulfilments[oblId] = { [lineId]: value }`. Predicates that need to
read sibling values at the same line do so via
`ctx.siblingValue(obligation)`, which resolves `fulfilments[obl.id]
[path]`. This lets predicates read cross-field state without any
knowledge of composite-key parsing. The V4 spec has no genuine
cross-field predicate at the singleton or single-line level today —
the real cross-record rule ("≥ 1 animal identifier per unit") sits
at the unit-record layer and is deferred to a follow-on ticket. The
`siblingValue` primitive is exercised via runtime unit tests using
synthetic obligations.

### D5 — Async / lookup-driven options deferred; static stub in the spike

`animalsCertifiedFor` uses a `staticEnum` with four hardcoded options
(`bovine` / `ovine` / `porcine` / `equine` with labels Cattle / Sheep
/ Pigs / Horses). In production these come from the certificate. An
earlier revision modelled the fetch as a `lookup-result` obligation
consumed via a `lookupEnum` domain factory, but the pattern was
removed to keep concept count down — it's materially the same as
`computedEnum` reading a sibling, with only the "populated
asynchronously" bit differing (a runtime plumbing concern, not a
model shape). When a real certificate integration lands, the fetch
pattern should be designed against that API rather than a fake
in-spike demo. Follow-on §Async / dynamic options for enums picks
this up.

## Trade-offs

| Trade-off                                                                             | Accepted | Why                                                                                                                                                                                                                                                                                                                                                                                             |
| :------------------------------------------------------------------------------------ | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain entries can call code, not just data                                           | ✅       | The alternative — a table with a bespoke DSL for cross-field rules — grows features every time a new predicate shape arrives. Keeping the escape hatch simple (a JS closure with a small `ctx`) preserves the "data-shaped where possible" property without capping expressiveness.                                                                                                             |
| Two runtimes (JS evaluator + JS runtime) don't port to non-JS consumers               | ✅       | The **contract** ports (obligations + domain + flow are declarative JSON-friendly modules); each language re-implements ~200 lines of pure functions. Same trade-off as EUDPA-277.                                                                                                                                                                                                              |
| Flow-level submit-mandate vs obligation-level completion-mandate compose orthogonally | ✅       | `pageStatus` / `containerStatus` / `journeyState` gate F on obligation-level `status` (completion-mandate). The flow-entry `mandatoryToProceed: true` gate is a separate controller-side check enforced in `validatePagePayload` (submit-mandate). The two are independent and can be combined per flow entry — see `docs/add-an-obligation.md` §Making a field mandatory-to-save-and-continue. |
| Data dictionary can't fully enumerate computedEnum / predicate outputs                | ✅       | Metadata identifies which siblings a computedEnum reads and which failure codes a predicate emits. A stakeholder can spot missing coverage without running JS. If we ever need full enumeration, a symbolic-execution pass over the closures is a follow-on.                                                                                                                                    |

## Open questions surfaced but not resolved

Same set as PLAN.md's open questions; the spike explored them but did
not decide them. These are the ones worth raising in playback:

1. **Cross-field error surfacing.** Predicate errors carry `path` and
   `code`; whether they render inline, page-summary, or submit-block
   is a renderer choice. Left as-is.
2. **Domain helper library.** We use three factories (`staticEnum`,
   `computedEnum`, `predicate`). If a fourth shape recurs ≥ 3 times,
   extract it; not now.
3. **"Allow invalid submit" enforcement policy.** Business-side; sits
   at the controller, not in the model. Flagged for BA input.
4. **Higher-order predicate helpers** (e.g. `whenSpecies(x, () => …)`).
   Not needed for the current V4 predicates; wait until the shape recurs.

## Out of scope — natural follow-ons

- **Flow-primitive Add-another.** Both commodity lines and per-unit
  records use bespoke controllers (`features/commodity-lines/`,
  `features/units/`). Turning either into a declarative
  `sectionForEach` / `pagesForEach` primitive at the flow layer
  would eliminate a controller pair per level. See the
  Browsable prototype §Commodity-lines UX + depth-2 unit-record UX
  section for the trade-off (bespoke controllers cost less than a
  generalised primitive at 2 depth levels; promote if a 3rd
  Add-another shape appears).
- **Async / dynamic options for enums.** `animalsCertifiedFor`
  currently uses a static stub; the real values come from the
  certificate. When integrated, design the fetch pattern (an
  orchestrator-resolved obligation? a synchronous per-request read
  in `contract.js`? a pre-hook on the page?) against the real API.
  Same shape applies to `commodityType` / `commodityCode` /
  `species` / `portOfEntry` once the MDM lists arrive.
- **Dynamic predicates via orchestrator resolution.** Same shape as
  the async-options question but for validation instead of options.
  Not needed for AC; revisit if a real V4 predicate needs it.
- **Playwright cross-variant harness landed as a self-contained
  suite** in this branch under `e2e/` — mirrors the parent-layouts
  branch's data-driven `JOURNEYS`-array shape but scoped to the V4
  variant. Adds real form events + real navigation + recorded video
  demos on top of the vitest+inject coverage. See `e2e/README.md`.
  A second variant (e.g. a Joi-adopted rerun) can be added by
  declaring one entry in `e2e/journey.js`.
- **Welsh locale threading.** i18n infrastructure is complete
  (`lib/i18n.js` + `locales/en.json` + `i18n-coverage.test.js`
  covering every declaration-site key). Threading a locale from
  the request through `t()` and adding `locales/cy.json` remains.
- **Joi adoption for domain-driven validation.** The domain layer
  currently runs bespoke predicates. Porting to Joi (with a
  `preValidate` hook for controller-side rules) is a post-step-5
  deliverable — see `NEXT.md` §P1 for the design questions the V4
  buildout sharpened.
- **Journey configuration** (flag-driven variance) — explicitly out of
  scope for this ticket per the retitle. A future concern; noted here
  so it does not creep in.

## How the artefacts hang together

```
             obligations/obligations.js (forked from EUDPA-277)
              ▲   ▲   ▲            ▲
              │   │   │            │
domain/index.js   │   │  flow/flow.js
      ▲       │   │   │    ▲       │
      │       │   │   │    │       │
      └───────┴───┴───┴────┴───────┘
              engine/index.js
              ▲            ▲              ▲
              │            │              │
     data-dictionary-sketch          contract.js
                                          ▲
                                          │
                                    features/*/controller.js
                                    lib/*.js
                                    shared/*.njk
```

- `domain/index.js` and `flow/flow.js` both import symbols from the
  forked obligations manifest — same source of truth for identity.
- `engine/index.js` reads all three plus the ObligationEvaluator's
  output; every primitive is a pure function of its inputs.
- `contract.js` is the seam — everything downstream (controllers +
  lib helpers + templates) only talks to `contract.js`; nothing in
  `features/*` or `lib/*` reaches into `engine/index.js` or
  `domain/index.js` directly. See the Browsable prototype §How the
  logical model maps to controllers/HTML/JS.
- `controller-sketch.js` (kept as a historical artifact — a JOI
  composition sketch) demonstrates that the same primitives can drive
  a JOI-schema shape. The real browser layer went with an internal
  validation path via `contract.validatePagePayload`, but the sketch
  documents that JOI is a straightforward alternative.
- `data-dictionary-sketch.js` walks obligations + domain metadata to
  emit a stakeholder-friendly view; declares no rules of its own.

## Browsable prototype

The spike ships with a real, clickable journey mounted at
`/prototype/eudpa-249/*`. Every controller reads scope from the
obligations model, options + validation from `domain/index.js`, and
page composition from `flow/flow.js` through the engine primitives —
nothing is restated in the browser layer.

### What you can walk

- `/prototype/eudpa-249/start` → redirects to the first unfulfilled page.
- `/prototype/eudpa-249/task-list` → 6 sections / 15 subsections with
  status tags.
- `/prototype/eudpa-249/pages/<pageName>` → the flow-driven form pages
  (single-obligation and multi-obligation, including the
  address-block composite widget and the 4-field
  accompanying-documents page).
- `/prototype/eudpa-249/lines` → commodity-lines index (add / list /
  delete + per-line Manage animals link).
- `/prototype/eudpa-249/lines/{lineId}/{pageName}` → per-line
  detail pages (commodity code, type, species, animal count,
  packages).
- `/prototype/eudpa-249/lines/{lineId}/units` → per-line units
  index (add / list / delete for depth-2 records).
- `/prototype/eudpa-249/lines/{lineId}/units/{unitId}/{pageName}`
  → per-unit detail pages (permanent address for pets;
  passport / tattoo / ear-tag / horse-name / identification
  details / description gated by commodity code).
- `/prototype/eudpa-249/check-your-answers` → CYA with Change links.
- `POST /prototype/eudpa-249/reset` → wipes session for the demo.

Every AC bullet is visible:

- **Page visibility** — set reason to "Transit through EU"; the
  purpose-details page collapses to Not Applicable and
  `firstUnfulfilledPage` skips it.
- **Question visibility** — choose Commercial on transporter-type;
  transporter-details asks for commercial fields. Flip to Private; the
  same page asks for private fields.
- **Option filtering** — purpose-details options only exist when reason
  is Internal Market; the domain entry reads reason at request time.
- **Task-list rollup** — each subsection's status derives from
  `containerStatus` on the fly.
- **Real V4 predicates** — arrival-details rejects `2026-12-12`
  ("must be DD/MM/YYYY"); transited-countries caps at 12.

### The contract seam (14-function shape, adapter pattern)

The parent-layouts branch (`spike/EUDPA-249-prototype-layouts`) hosts
four alternative model-spikes and one standalone obligations-spike, all
implementing the same **14-function `contract` interface**: `steps`,
`stepTitle`, `applicableSteps`, `status`, `next`, `prev`, `viewItems`,
`validate`, `applyAnswer`, `missingRequired`, `collect`, `firstStep`,
`allComplete`, `assembleQuote`. A shared controller
(`modelSectionHandlers`) reads that contract and drives every route —
so the same Playwright spec runs against every variant via a
`JOURNEYS` array.

None of those spikes model V4 fields. Rather than lift-and-shift, we
implemented [`contract.js`](./contract.js) as a **thin
adapter**: it exposes the same vocabulary (`statusOfContainer`,
`nextAfter`, `fieldsForPage`, `validatePagePayload`, etc.) on top of my
three-layer split. Controllers and templates only import from
`contract.js`; the underlying primitives (`pageStatus`,
`firstUnfulfilledPage`, `optionsFor`, …) can evolve without touching
the browser layer.

Why an adapter and not a 1:1 port of the 14-function contract:

- Our JourneyEvaluator vocabulary (from EUDPA-277's `obligations.md`
  §The JourneyEvaluator) reads more naturally than the parent's flat
  `contract.status(state, stepId, shape)` — sections/subsections carry
  status directly rather than being derived from a `shape` descriptor.
- Not every parent-branch function has a V4 analogue yet
  (`assembleQuote` is car-insurance-specific).
- The parent's `shape` descriptor mediates between three journey
  layouts (linear / hub / grouped) at runtime; the V4 slice needs only
  one shape (subsection-grouped hub), so shape-dispatch is unnecessary.

The adapter names deliberately overlap the parent branch where they
map cleanly — reviewers coming from that branch see the same idiom.

### How the logical model maps to controllers / HTML / JS

The AC asks for a mapping "provable via tests and convention". Three
mechanisms achieve that:

1. **Convention: the browser layer imports only from `contract.js`.**
   No controller reads `engine/index.js` or `domain/index.js`
   directly. Grep for
   `from '../engine/index.js'` or `from '../domain/index.js'` inside
   `features/*` or `lib/*` — only `contract.js` and `state.js` do. If
   a future controller needs model information the contract doesn't
   expose, the contract grows a function rather than the seam being
   bypassed.
2. **Convention: templates render `FieldViewItem`s only.** The
   [`field-widgets.js`](./lib/field-widgets.js) dispatch table is
   the _only_ place a govuk widget is chosen. Templates
   (`partials/fields.njk`) do a shape-based dispatch on
   `item.type`; they never look at obligations or domain entries. A
   new widget shape means one new rule in the table and one new branch
   in the partial — nothing else.
3. **Tests: three levels of coverage.**
   - Pure-model tests (`domain.test.js`, `runtime.test.js`) prove
     every primitive answers correctly on synthetic fixtures.
   - Contract tests (`contract.test.js`) prove every function
     on the seam returns the right shape for real V4 pages + states.
   - HTTP tests (`routes.test.js`) drive real routes via
     `server.inject` and a cookie jar and assert that page-level
     behaviour (visibility, option filtering, error rendering, redirect
     chains) matches the model.

Together they establish: change a `presents` entry in
`flow/flow.js` → controller + template output changes without
editing either; add a predicate to `domain/index.js` → error summary

- inline field error appear without editing any error-formatting
  code.

### Env gate + CDP production behaviour

Gated by convict entry
[`prototype.eudpa249.enabled`](../../../src/config/config.js) —
env `PROTOTYPE_EUDPA249_ENABLED`, defaults to `!isProduction`.

Three places consult the flag, all in `src/`:

- [`src/config/nunjucks/nunjucks.js`](../../../src/config/nunjucks/nunjucks.js)
  — adds the spike templates directory to both the Nunjucks search
  path and the Vision `path` array.
- [`src/server/router.js`](../../../src/server/router.js) — conditional
  `await import(...)` of the plugin.

When the flag is off, the plugin module is never loaded, the templates
are never on any search path, and no `/prototype/*` route exists on
the server. A CDP production build (with default env) ships nothing
prototype-related; a `docker exec ... env` check confirms
`PROTOTYPE_EUDPA249_ENABLED` is unset (and therefore false by default
in production).

Auth is opted-out per route (`options: { auth: false }` in
[`plugin.js`](./routes.js)) so the demo works whether or not
the host frontend has auth turned on.

### Commodity-lines UX (line-major) + depth-2 unit-record UX

Commodity lines and per-unit records are the two places bespoke
controllers live. Both feature folders host a small controller +
list template; the underlying model is unchanged (`presentsForEach`
in `flow.js` with `forEachOf` set to `commodityLine` or `unitRecord`),
and the plugin's route walker branches on the `forEachOf` obligation
to emit URLs at the right depth.

**Depth-1 — `features/commodity-lines/`:**

- `GET /lines` — one summary block per line with per-row Change
  links (to that line's specific per-line page) and a per-line
  Delete form. Emits a "Manage animals on this line" link
  conditionally on whether the line's commodity code opens any
  wired unit-scoped obligation.
- `POST /lines/add` — mints `line1`, `line2`, … via `addCommodityLine`
  in `lib/state.js`, seeds a placeholder record on `commodityCode`,
  and redirects straight into the new line's first per-line page.
- `POST /lines/{id}/delete` — clears the line's leaf records AND
  cascades into every unit fulfilment keyed by
  `${lineId}/...` (see below).

Per-line pages are registered at `/lines/{lineId}/{pageName}` via
`lib/line-page-controller.js`. Navigation uses the runtime primitive
`firstUnfulfilledPageForLine` and the contract seam `nextAfterForLine`.
`presentsForEach: { obligation, forEachOf: commodityLine }` in
`flow.js` drives the same URLs the router registers.

**Depth-2 — `features/units/`:**

- `GET /lines/{lineId}/units` — one summary block per unit that
  belongs to the line, with per-row Change links (to that unit's
  specific page) and a per-unit Delete form. Display labels use
  the ordinal position in the current list, not the internal id,
  so surviving units after a delete renumber cleanly (URLs still
  key on the internal id).
- `POST /lines/{lineId}/units/add` — mints `unit1`, `unit2`, …
  via `addUnitRecord`, seeds on the first WIRED unit-scoped
  obligation the line's commodity code opens (mandatory first,
  then optional), redirects straight into the new unit's first
  per-unit page.
- `POST /lines/{lineId}/units/{unitId}/delete` — drops every
  unit-scoped leaf keyed by the composite `${lineId}/${unitId}`.

Per-unit pages are registered at
`/lines/{lineId}/units/{unitId}/{pageName}` via
`lib/unit-page-controller.js`. Navigation uses the runtime
primitive `firstUnfulfilledPageForUnit` and the contract seam
`nextAfterForUnit`. Fulfilment storage uses the same flat
composite-key convention as the obligations evaluator (`{lineId}/
{unitId}` under the shared `/` delimiter).

**Session-monotonic ids on both levels.** Line ids and per-line
unit ids never recycle: separate yar keys track the next id
(`NEXT_LINE_ID_KEY`, `NEXT_UNIT_ID_BY_LINE_KEY`), and `Delete`
does not decrement them. Reason: silent rehydration of any
per-record state whose obligation was missed by the delete
sweep would otherwise be possible. Display labels track ordinal
position so this internal detail doesn't leak to users.

**Not adopted from v2 backlog.** The earlier "v2 backlog" bullet
list proposed a `sectionForEach` / `pagesForEach` primitive at the
flow layer to make Add-another declarative and retire the bespoke
controllers. That work was NOT taken; the bespoke controllers stayed
and the flow model kept `presentsForEach` as a page-level primitive.
The reason is scope: with two levels of Add-another to prove
(commodity lines and unit records), a bespoke controller pair per
level cost less than a generalised flow primitive that would have
needed to handle add/delete/list UX declaratively. If a third level
of Add-another appears, promote the pattern.

### Headless proof (dump.js)

[`dump.js`](./dump.js) is the parallel of the parent
branch's `dump.js`: given a fixture, print a JSON view of the logical
state. Nothing about rendering — every question a stakeholder can ask
in the browser (what's applicable, what's in progress, what's next,
what's missing, where does a Change link go) has a corresponding key
in the dump output.

```bash
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.js empty
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.js internal-market-partial
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.js transit-with-lines
```

Snapshots in [`dump.test.js`](./dump.test.js) pin the
output so a change to flow / domain / runtime that alters what the
stakeholder sees in the browser also alters the dump — and the
snapshot fails until the change is reconciled.

## Obligations fork

At the start of the browsable-prototype workstream we forked the
EUDPA-277 obligations model files (`obligations.js`, `evaluator.js`,
`helpers.js`, plus their tests) from
`prototypes/model-spikes/obligations-v4-model/` into
[`./obligations/`](./obligations/) so this spike stands alone. The
parent folder is unchanged and is kept as the historical EUDPA-277
output; any future evolution of the V4 obligations happens inside our
fork. The parent's `obligations.md`, `GAPS.md`, and `RECOMMENDATION.md`
are not forked — they document EUDPA-277 as it was at close and are
referenced by path in the References section below.

## Files

### Layer 1 — Obligations (forked from EUDPA-277)

| File                                                                           | Purpose                                              |
| :----------------------------------------------------------------------------- | :--------------------------------------------------- |
| [`obligations/obligations.js`](./obligations/obligations.js)                   | V4 obligations manifest (identity + `applyTo` scope) |
| [`obligations/evaluator.js`](./obligations/evaluator.js)                       | `createObligationEvaluator({ obligations })`         |
| [`obligations/helpers.js`](./obligations/helpers.js)                           | `allowListed` / `branchedGate` / etc.                |
| [`obligations/evaluator.test.js`](./obligations/evaluator.test.js)             | Evaluator integration tests                          |
| [`obligations/evaluator.units.test.js`](./obligations/evaluator.units.test.js) | Evaluator per-function isolation tests               |
| [`obligations/helpers.test.js`](./obligations/helpers.test.js)                 | Helper tests                                         |

### Layer 1.25 (Domain), Layer 2 (Flow), Engine (runtime primitives)

| File                                                       | Purpose                                            |
| :--------------------------------------------------------- | :------------------------------------------------- |
| [`domain/index.js`](./domain/index.js)                     | Layer 1.25 constraint declarations + factories     |
| [`flow/flow.js`](./flow/flow.js)                           | Layer 2 sections + subsections + pages + presents  |
| [`engine/index.js`](./engine/index.js)                     | JourneyEvaluator + domain primitives (runtime)     |
| [`controller-sketch.js`](./controller-sketch.js)           | JOI-shaped page schema composition sketch          |
| [`data-dictionary-sketch.js`](./data-dictionary-sketch.js) | Stakeholder dictionary + coverage report           |
| [`domain/index.test.js`](./domain/index.test.js)           | Domain unit tests (real V4 predicates)             |
| [`engine/index.test.js`](./engine/index.test.js)           | Runtime primitive tests over synthetic obligations |
| [`integration.test.js`](./integration.test.js)             | End-to-end V4 slice through all three model layers |
| [`sketches.test.js`](./sketches.test.js)                   | Sketches tests                                     |

### Browser layer (contract seam + Hapi plugin + features + shared)

| File                                                                                       | Purpose                                                                                                          |
| :----------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| [`routes.js`](./routes.js)                                                                 | Hapi plugin; walks `flow/flow.js` and registers routes                                                           |
| [`contract.js`](./contract.js)                                                             | Contract seam — every browser call to the model goes through here                                                |
| [`lib/page-controller.js`](./lib/page-controller.js)                                       | Generic GET/POST handler factory for a static page                                                               |
| [`features/hub/controller.js`](./features/hub/controller.js)                               | Task-list handler                                                                                                |
| [`features/check-your-answers/controller.js`](./features/check-your-answers/controller.js) | Check-your-answers handler                                                                                       |
| [`features/commodity-lines/controller.js`](./features/commodity-lines/controller.js)       | Bespoke commodity-lines index / add / delete (v2 backlog)                                                        |
| [`features/start/controller.js`](./features/start/controller.js)                           | Landing redirect                                                                                                 |
| [`features/reset/controller.js`](./features/reset/controller.js)                           | Session reset                                                                                                    |
| [`lib/build-field-descriptors.js`](./lib/build-field-descriptors.js)                       | Pure fn — page + state → field descriptors                                                                       |
| [`lib/field-widgets.js`](./lib/field-widgets.js)                                           | Data-shaped widget dispatch table                                                                                |
| [`lib/format-domain-errors.js`](./lib/format-domain-errors.js)                             | Domain-error → GOV.UK `{ errorList, fieldErrors }` mapper                                                        |
| [`lib/presentation.js`](./lib/presentation.js)                                             | Per-obligation `{ pageTitle, legend, hint }` copy                                                                |
| [`lib/state.js`](./lib/state.js)                                                           | `@hapi/yar` session wrappers + line-management helpers                                                           |
| [`dump.js`](./dump.js)                                                                     | Headless CLI proof + programmatic `report(fixture)`                                                              |
| [`fixtures/*.json`](./fixtures/)                                                           | Three named fulfilment fixtures                                                                                  |
| [`shared/layout.njk`](./shared/layout.njk)                                                 | Base layout — extends `govuk/template.njk`                                                                       |
| [`shared/page.njk`](./shared/page.njk)                                                     | Generic form page (used by every flow-driven page)                                                               |
| [`shared/partials/{fields,error-summary}.njk`](./shared/partials/)                         | Field-widget dispatch + GOV.UK error summary                                                                     |
| [`features/hub/template.njk`](./features/hub/template.njk)                                 | Task-list template                                                                                               |
| [`features/check-your-answers/template.njk`](./features/check-your-answers/template.njk)   | CYA template                                                                                                     |
| [`features/commodity-lines/list.njk`](./features/commodity-lines/list.njk)                 | Commodity-lines index template                                                                                   |
| Test files under `lib/`, `features/*/`, and root                                           | Widget dispatch, format-domain-errors, build-field-descriptors, contract, routes `server.inject`, dump snapshots |

**Total:** 564 tests passing across 23 files (spike + forked
obligations + step 4 iterations 1–10 + step 5 iterations a–e).

Not enumerated above but landed during the browsable prototype +
step-5 workstream: `features/units/` (depth-2 UX),
`lib/unit-page-controller.js`, `lib/is-blank-value.js`, additional
test files (`e2e-walk.test.js`, `e2e-commodity-lines.test.js`,
`e2e-units.test.js`, `lib/state.test.js`,
`format-domain-errors.test.js`), and the `locales/en.json` +
`i18n-coverage.test.js` pair. Step 5 added `groupInvariantErrors`
to the engine (first cross-record predicate) and `isComplete(value)`
to the address-block domain factory (structural completeness the
CYA and task list read to distinguish "in progress" from
"completed" for the composite widget).

## Running the spike

```bash
cd repos/trade-imports-animals-frontend

# Full test suite for the spike
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/

# Just the browser layer (lib + features + routes + contract + dump)
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/lib/ \
              prototypes/journey-config-spikes/EUDPA-249-flow-layer/features/ \
              prototypes/journey-config-spikes/EUDPA-249-flow-layer/routes.test.js \
              prototypes/journey-config-spikes/EUDPA-249-flow-layer/contract.test.js \
              prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.test.js

# Watch mode
npx vitest prototypes/journey-config-spikes/EUDPA-249-flow-layer/

# Boot the app for a manual walk
npm run dev
# then http://localhost:3000/prototype/eudpa-249/start

# Headless proof — no browser required
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.js internal-market-partial
```

`npm run dev` defaults auth off (see
[`src/config/config.js`](../../../src/config/config.js) — `auth.enabled`
default is `!isDevelopment`), so the Defra ID stub is not required.
Force auth on if you want to test it: `AUTH_ENABLED=true npm run dev`.

## References

- Parent obligations spike: [`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)
- Parent obligations doc: [`obligations.md`](../../model-spikes/obligations-v4-model/obligations.md)
  (Flow-layer design is described in §The JourneyEvaluator, §Runtime
  navigation primitives, §Status-propagation rules, and §The Flow's
  page model)
- Parent recommendation: [`RECOMMENDATION.md`](../../model-spikes/obligations-v4-model/RECOMMENDATION.md)
- Ticket: <https://eaflood.atlassian.net/browse/EUDPA-249>
