# EUDPA-249 — Flow-layer spike recommendation

_Spike branch:_ `spike/EUDPA-249-flow-layer` \
_Folder:_ `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` \
_Reads from:_ `prototypes/model-spikes/obligations-v4-model/` (EUDPA-277
outputs — obligations manifest + evaluator)

## Recommendation

Adopt a **three-layer architecture** for expressing journey
configuration keyed by commodity code and country of origin:

| Layer                                      | Owns                                                                                                                | Answers                                              |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------- |
| **1 — Obligations** (as-is from EUDPA-277) | identity, cardinality, **scope** (`applyTo`)                                                                        | "Does this data field apply, given current state?"   |
| **1.25 — Domain** (NEW)                    | per-obligation **value legality** — enum options (static / computed / lookup-driven), predicates, cross-field rules | "Is this proposed value legal, given current state?" |
| **2 — Flow** (NEW)                         | pages, sections, presents entries; page/section/journey status; navigation                                          | "What does the user see next?"                       |

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
  1. Contract seam (`browser/contract.js`) — the only place the browser
     layer reads model information; enforced by convention + tests.
  2. Tests at four levels — domain isolation, runtime primitives with
     synthetic fixtures, integration through the real V4 slice, and
     HTTP-level `server.inject` walks. See the Browsable prototype
     §How the logical model maps to controllers / HTML / JS below.
  3. Business-facing dictionary (`data-dictionary-sketch.js`) built by
     walking obligations + domain metadata.

The spike ships **164 passing tests** across ten files; the browsable
V1 mounts at `/prototype/eudpa-249/*` in the existing frontend
process.

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
     edit `PURPOSE_BY_REASON` in `domain.js`.
   - "This new commodity code needs a package count":
     edit `PACKAGE_COUNT_COMMODITIES` in the obligations manifest.
   - "This page shows one extra question":
     add a presents entry to `flow.js`.
     Nothing else moves.
4. **Correctness is enforced three ways** — contract seam
   (`browser/contract.js` is the only path from browser → model), tests
   (four levels: domain isolation, runtime primitives, integration,
   HTTP `server.inject`), dictionary (introspectable metadata).
5. **Async options work the same shape.** Lookup obligations
   (`lookup-result`) fulfil themselves via the orchestrator; domain
   entries read them like any other sibling. No special "async" path.
6. **Walk the browsable prototype live.** `npm run dev`,
   `http://localhost:3000/prototype/eudpa-249/start`. Show a stakeholder
   the flow, the task list, page + question visibility, option
   filtering, real V4 predicates, and CYA Change links.
7. **What's out of scope** (see below).

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

`staticEnum` and `lookupEnum` are 100 % introspectable — the data
dictionary can enumerate their outputs without executing code.
`computedEnum` and `predicate` are function-shaped but carry
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

### D5 — Lookup-result obligations are ordinary obligations

`certifiedForOptionsLookup` is a scalar obligation the orchestrator
fulfils by writing the fetched options into `fulfilments`. The
`animalsCertifiedFor` domain entry reads it via `lookupEnum`. The
evaluator treats it as `single` category — no bespoke async plumbing
in the evaluator or the runtime. Same shape as sub-journey obligations,
same shape as MDM-sourced enums.

## Trade-offs

| Trade-off                                                               | Accepted | Why                                                                                                                                                                                                                                                                                 |
| :---------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain entries can call code, not just data                             | ✅       | The alternative — a table with a bespoke DSL for cross-field rules — grows features every time a new predicate shape arrives. Keeping the escape hatch simple (a JS closure with a small `ctx`) preserves the "data-shaped where possible" property without capping expressiveness. |
| Two runtimes (JS evaluator + JS runtime) don't port to non-JS consumers | ✅       | The **contract** ports (obligations + domain + flow are declarative JSON-friendly modules); each language re-implements ~200 lines of pure functions. Same trade-off as EUDPA-277.                                                                                                  |
| Page-level `mandate` vs obligation-level `status` compose orthogonally  | ✅       | Documented in obligations.md's two-mandate composition table. This spike honours it: `pageStatus` filters on obligation-level status; `mandate: 'hard'` is a controller-side concern (page POST enforcement).                                                                       |
| Data dictionary can't fully enumerate computedEnum / predicate outputs  | ✅       | Metadata identifies which siblings a computedEnum reads and which failure codes a predicate emits. A stakeholder can spot missing coverage without running JS. If we ever need full enumeration, a symbolic-execution pass over the closures is a follow-on.                        |

## Open questions surfaced but not resolved

Same set as PLAN.md's open questions; the spike explored them but did
not decide them. These are the ones worth raising in playback:

1. **Cross-field error surfacing.** Predicate errors carry `path` and
   `code`; whether they render inline, page-summary, or submit-block
   is a renderer choice. Left as-is.
2. **Domain helper library.** We used four factories
   (`staticEnum`, `computedEnum`, `lookupEnum`, `predicate`). If a
   fifth shape recurs ≥ 3 times, extract it; not now.
3. **"Allow invalid submit" enforcement policy.** Business-side; sits
   at the controller, not in the model. Flagged for BA input.
4. **Higher-order predicate helpers** (e.g. `whenSpecies(x, () => …)`).
   Not needed for the current V4 predicates; wait until the shape recurs.

## Out of scope — natural follow-ons

- **Flow-driven line iteration.** V1 has bespoke
  `browser/line-controllers.js` for Add / list / delete of commodity
  lines. Turning that into a `sectionForEach` / `pagesForEach`
  primitive at the flow layer is the biggest v2 job — details in the
  Browsable prototype §Commodity-lines UX section above.
- **`validation-result` obligations** (dynamic predicates via an
  orchestrator-resolved obligation, parallel to `lookup-result`).
  Natural scale-out; not needed for AC.
- **Complete V4 coverage.** Prototype exercises a slice (origin, reason,
  transporter, arrival, references, commodity lines). Extending is
  mechanical; the pattern doesn't change.
- **Playwright cross-variant harness.** The parent-layouts branch runs
  one Playwright spec against every model-spike variant via a
  `JOURNEYS` array. Adding our V4 variant to that harness is a natural
  next step.
- **Journey configuration** (flag-driven variance) — explicitly out of
  scope for this ticket per the retitle. A future concern; noted here
  so it does not creep in.

## How the artefacts hang together

```
              obligations.js (EUDPA-277 spike output)
              ▲   ▲   ▲            ▲
              │   │   │            │
    domain.js │   │   │  flow.js   │
      ▲       │   │   │    ▲       │
      │       │   │   │    │       │
      └───────┴───┴───┴────┴───────┘
              runtime.js
              ▲            ▲              ▲
              │            │              │
     data-dictionary-sketch          browser/contract.js
                                          ▲
                                          │
                                    browser/*-controller.js
                                    browser/templates/*.njk
```

- `domain.js` and `flow.js` both import symbols from the parent
  obligations manifest — same source of truth for identity.
- `runtime.js` reads all three plus the ObligationEvaluator's output;
  every primitive is a pure function of its inputs.
- `browser/contract.js` is the seam — everything downstream (controllers
  - templates) only talks to `contract.js`; nothing in `browser/*`
    reaches into `runtime.js` or `domain.js` directly. See the
    Browsable prototype §How the logical model maps to controllers/HTML/JS.
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
obligations model, options + validation from `domain.js`, and page
composition from `flow.js` through the runtime primitives — nothing
is restated in the browser layer.

### What you can walk

- `/prototype/eudpa-249/start` → redirects to the first unfulfilled page.
- `/prototype/eudpa-249/task-list` → sections + subsection status tags.
- `/prototype/eudpa-249/pages/<pageName>` → the flow-driven form pages.
- `/prototype/eudpa-249/lines` → commodity-lines index (add / list).
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
implemented [`browser/contract.js`](./browser/contract.js) as a **thin
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
   No controller reads `runtime.js` or `domain.js` directly. Grep for
   `from '../runtime.js'` or `from '../domain.js'` inside `browser/*` —
   only `contract.js` and `state.js` do. If a future controller needs
   model information the contract doesn't expose, the contract grows a
   function rather than the seam being bypassed.
2. **Convention: templates render `FieldViewItem`s only.** The
   [`field-widgets.js`](./browser/field-widgets.js) dispatch table is
   the _only_ place a govuk widget is chosen. Templates
   (`partials/fields.njk`) do a shape-based dispatch on
   `item.type`; they never look at obligations or domain entries. A
   new widget shape means one new rule in the table and one new branch
   in the partial — nothing else.
3. **Tests: three levels of coverage.**
   - Pure-model tests (`domain.test.js`, `runtime.test.js`) prove
     every primitive answers correctly on synthetic fixtures.
   - Contract tests (`browser/contract.test.js`) prove every function
     on the seam returns the right shape for real V4 pages + states.
   - HTTP tests (`browser/plugin.test.js`) drive real routes via
     `server.inject` and a cookie jar and assert that page-level
     behaviour (visibility, option filtering, error rendering, redirect
     chains) matches the model.

Together they establish: change a `presents` entry in `flow.js` →
controller + template output changes without editing either; add a
predicate to `domain.js` → error summary + inline field error appear
without editing any error-formatting code.

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
[`plugin.js`](./browser/plugin.js)) so the demo works whether or not
the host frontend has auth turned on.

### Commodity-lines UX (bespoke — v2 backlog)

Commodity lines are the one place a bespoke controller lives.
`browser/line-controllers.js` handles:

- `GET /lines` — list existing lines (a summary-list of line ids +
  chosen commodity codes).
- `POST /lines/add` — mint `line1`, `line2`, … via `addLine` in
  `state.js`, seed a placeholder record on `commodityCode` so the
  evaluator recognises the line, redirect back to `/lines`.
- `POST /lines/{id}/delete` — clear the line's leaf records.

This is the equivalent of the parent branch's hand-written
`claimsRoutes`. It exists because the flow layer doesn't yet model an
"Add-another" primitive. Each per-line detail page (`commodity-details`,
`species-details`, `number-of-animals`, `number-of-packages`) is
declared with `presentsForEach` in `flow.js` but the plugin skips
them from route generation in v1.

**V2 backlog for lines** (single natural extension):

1. Extend the flow layer with a `sectionForEach` / `pagesForEach`
   primitive that expands per-line pages generically.
2. Move Add-another / delete into the flow model as user-driven-group
   affordances, so `line-controllers.js` disappears.
3. Wire per-line routes at `/lines/{id}/{pageName}` via a generalised
   `makePageController(page, { path })`.
4. Add Playwright coverage that walks a two-line scenario end-to-end.

None of these change the three-layer thesis; they scale it.

### Headless proof (dump.js)

[`browser/dump.js`](./browser/dump.js) is the parallel of the parent
branch's `dump.js`: given a fixture, print a JSON view of the logical
state. Nothing about rendering — every question a stakeholder can ask
in the browser (what's applicable, what's in progress, what's next,
what's missing, where does a Change link go) has a corresponding key
in the dump output.

```bash
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/browser/dump.js empty
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/browser/dump.js internal-market-partial
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/browser/dump.js transit-with-lines
```

Snapshots in [`browser/dump.test.js`](./browser/dump.test.js) pin the
output so a change to flow / domain / runtime that alters what the
stakeholder sees in the browser also alters the dump — and the
snapshot fails until the change is reconciled.

## Files

### Logical model (Layers 1.25 + 2 + runtime)

| File                                                       | Purpose                                            |
| :--------------------------------------------------------- | :------------------------------------------------- |
| [`domain.js`](./domain.js)                                 | Layer 1.25 constraint declarations + factories     |
| [`flow.js`](./flow.js)                                     | Layer 2 sections + subsections + pages + presents  |
| [`runtime.js`](./runtime.js)                               | JourneyEvaluator + domain primitives               |
| [`controller-sketch.js`](./controller-sketch.js)           | JOI-shaped page schema composition sketch          |
| [`data-dictionary-sketch.js`](./data-dictionary-sketch.js) | Stakeholder dictionary + coverage report           |
| [`domain.test.js`](./domain.test.js)                       | Domain unit tests (real V4 predicates)             |
| [`runtime.test.js`](./runtime.test.js)                     | Runtime primitive tests over synthetic obligations |
| [`integration.test.js`](./integration.test.js)             | End-to-end V4 slice through all three model layers |
| [`sketches.test.js`](./sketches.test.js)                   | Sketches tests                                     |

### Browser layer (contract seam + Hapi plugin + templates)

| File                                                                         | Purpose                                                                                                        |
| :--------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| [`browser/plugin.js`](./browser/plugin.js)                                   | Hapi plugin; walks `flow.js` and registers routes                                                              |
| [`browser/contract.js`](./browser/contract.js)                               | Contract seam — every browser call to the model goes through here                                              |
| [`browser/page-controller.js`](./browser/page-controller.js)                 | Generic GET/POST handler for a static page                                                                     |
| [`browser/hub-controller.js`](./browser/hub-controller.js)                   | Task-list handler                                                                                              |
| [`browser/cya-controller.js`](./browser/cya-controller.js)                   | Check-your-answers handler                                                                                     |
| [`browser/line-controllers.js`](./browser/line-controllers.js)               | Bespoke commodity-lines index / add / delete (v2 backlog)                                                      |
| [`browser/misc-controllers.js`](./browser/misc-controllers.js)               | start / reset / seeded async lookup                                                                            |
| [`browser/build-field-descriptors.js`](./browser/build-field-descriptors.js) | Pure fn — page + state → field descriptors                                                                     |
| [`browser/field-widgets.js`](./browser/field-widgets.js)                     | Data-shaped widget dispatch table                                                                              |
| [`browser/format-domain-errors.js`](./browser/format-domain-errors.js)       | Domain-error → GOV.UK `{ errorList, fieldErrors }` mapper                                                      |
| [`browser/presentation.js`](./browser/presentation.js)                       | Per-obligation `{ pageTitle, legend, hint }` copy                                                              |
| [`browser/state.js`](./browser/state.js)                                     | `@hapi/yar` session wrappers + line-management helpers                                                         |
| [`browser/dump.js`](./browser/dump.js)                                       | Headless CLI proof + programmatic `report(fixture)`                                                            |
| [`browser/fixtures/*.json`](./browser/fixtures/)                             | Three named fulfilment fixtures                                                                                |
| [`browser/templates/*.njk`](./browser/templates/)                            | layout / page / hub / cya / lines-list / partials                                                              |
| Test files under `browser/`                                                  | Widget dispatch, format-domain-errors, build-field-descriptors, contract, plugin server.inject, dump snapshots |

**Total:** 164 tests passing across 10 files.

## Running the spike

```bash
cd repos/trade-imports-animals-frontend

# Full test suite for the spike
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/

# Just the browser layer
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/browser/

# Watch mode
npx vitest prototypes/journey-config-spikes/EUDPA-249-flow-layer/

# Boot the app for a manual walk
npm run dev
# then http://localhost:3000/prototype/eudpa-249/start

# Headless proof — no browser required
node prototypes/journey-config-spikes/EUDPA-249-flow-layer/browser/dump.js internal-market-partial
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
