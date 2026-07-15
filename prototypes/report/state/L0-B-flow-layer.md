# L0 Inventory — SIDE B ("flow-layer", Paul Hodgson)

Clone: `/Users/samfarrington/git/defra/trade-imports-animals-workspace/workareas/model-comparison/clone-flow-layer` (HEAD `d59b432`)
Branch of origin: `spike/EUDPA-249-flow-layer`

Two roots:

- `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` — **the live spike** (25,950 LOC)
- `prototypes/model-spikes/obligations-v4-model/` — **superseded ancestor** from EUDPA-277 (7,087 LOC)

**Headline structural fact, established by diff, that every later agent must internalise:**
`obligations-v4-model/evaluator.js` and `EUDPA-249-flow-layer/obligations/evaluator.js` are **byte-identical** (`diff` → empty). `helpers.js` differs by exactly **6 lines** (`helpers.js:83-88` in the fork — exposes `predicate` on the metadata sidecar). So `model-spikes/obligations-v4-model/` is not a second model; it is the **frozen parent** of the live one. 7,087 LOC (21% of Side B's total) is a historical artefact kept for provenance. **When comparing models, compare against `EUDPA-249-flow-layer/obligations/`, not `model-spikes/`.** The manifest DID move on (843 vs 698 LOC — the fork added the 2 system-populated obligations, the `unitRecord.requires` group invariant, and expanded whitelists).

---

## 1. Totals

| Metric | Value |
|---|---|
| **Total LOC (both roots, all file types)** | **33,037** |
| Live spike LOC (`EUDPA-249-flow-layer/`) | 25,950 |
| Superseded ancestor LOC (`model-spikes/`) | 7,087 |
| **Source JS LOC** (non-test, both roots) | **9,323** (7,897 live + 1,426 ancestor) |
| **Test JS LOC** (both roots, incl. e2e harness) | **12,089** (9,953 live + 2,136 ancestor) |
| **Doc LOC (.md)** | **10,713** (7,188 live + 3,525 ancestor) |
| Template LOC (.njk) | 299 |
| JSON LOC (locales + fixtures) | 613 |
| **Total files** | **82** |
| Source JS files | 32 (29 live + 3 ancestor) |
| Test JS files | 27 (24 live incl. 1 Playwright spec + 3 ancestor) |
| `.njk` files | 8 |
| `.json` files | 4 |
| `.md` files | 11 |
| **Test cases (grep `it(`/`test(` at 2-space indent)** | **649** declarations (493 live + 156 ancestor) |
| Runtime test count claimed by the spike | **566 across 23 files** (`NEXT.md:17`) — gap vs 493 is `it.each` expansion |
| **Test:source LOC ratio (live spike)** | **1.26 : 1** |
| **Doc:source LOC ratio (live spike)** | **0.91 : 1** |

Docs are a genuine first-class deliverable here, not an afterthought: `obligations.md` alone is **3,010 lines** and is written as a canonical spec of the model's *shape* (explicitly not its content), with a TypeScript-ish type vocabulary and a settled/deferred register.

### Doc inventory (live spike)

| File | LOC | Role |
|---|---|---|
| `obligations.md` | 3,010 | Canonical model spec — 18 top-level sections, from `## Working definition` through `## What's still open`. **The single most important document on Side B.** |
| `docs/add-an-obligation.md` | 1,164 | Change-recipe: how to add an obligation across all three layers |
| `NEXT.md` | 1,367 | Living handoff — session state, what landed, deferred items |
| `docs/testing.md` | 644 | Test strategy incl. a mutation-testing register (mutations 1–11) |
| `RECOMMENDATION.md` | 614 | Spike ADR — the three-layer split, D1–D5, trade-offs, playback script |
| `PLAN.md` | 311 | Original spike plan |
| `e2e/README.md` | 78 | Playwright harness notes |

### Ancestor docs (`model-spikes/obligations-v4-model/`)

| File | LOC | Role |
|---|---|---|
| `obligations.md` | 2,940 | The parent (EUDPA-277) version of the canonical spec |
| `RECOMMENDATION.md` | 297 | EUDPA-277 recommendation |
| `GAPS.md` | 219 | **High-value:** the gap-log from modelling V4 against the model. Records the `gatedBy` DSL → `applyTo`+helpers decision and *why the DSL lost* |
| `TODO.md` | 69 | Residual EUDPA-277 to-dos |

---

## 2. Module map — live spike

### Layer 1 — Obligations (`obligations/`) — the model under test

| File | LOC | Responsibility |
|---|---|---|
| `obligations/obligations.js` | 843 | **The manifest.** 44 obligation records — identity (`id` UUID + `name`), structure (`within`), completion-mandate (`status`), scope (`applyTo`). Plus 7 exported commodity-code whitelists and the `groups` derivation. |
| `obligations/evaluator.js` | 519 | `createObligationEvaluator({obligations})` → pure sync `evaluate(fulfilments)`. 7-step pipeline (drop-unknown → pre-purge enumerate → run applyTo → effective inScope → purge → post-purge enumerate → build implications). Byte-identical to the ancestor. |
| `obligations/helpers.js` | 215 | The 4 gate-shape factories that build `applyTo` closures: `allowListed`, `allowListedByPredicate`, `anyAllowListed`, `branchedGate` — each attaching a `.metadata` sidecar for introspection. Plus `matches` / `present`. |

### Layer 1.25 — Domain (`domain/`) — NEW in this spike

| File | LOC | Responsibility |
|---|---|---|
| `domain/index.js` | 1,194 | **Value-legality declarations keyed by obligation id.** 4 factories (`staticEnum`, `computedEnum`, `predicate`, `addressBlock`) + 40 domain entries + a `reasons` code registry + the stub MDM option lists (countries, commodity codes, ports, species). Exports the `domain` Map (`domain/index.js:1150-1194`). |

### Layer 2 — Flow (`flow/`) — NEW in this spike

| File | LOC | Responsibility |
|---|---|---|
| `flow/flow.js` | 667 | **Page composition.** Section → SubSection → Page tree. Each page has `presents: [{obligation, mandatoryToProceed?, errors?}]` or one `presentsForEach: {obligation, forEachOf}`. Plus 4 walker exports (`walkPages`, `walkSubsections`, `sectionOfSubsection`, `subsectionOfPage`). |

### Engine (`engine/`) — runtime primitives

| File | LOC | Responsibility |
|---|---|---|
| `engine/index.js` | 601 | **15 exported pure primitives, no orchestrator object.** Domain: `optionsFor`, `validate`. Navigation: `firstApplicablePage`, `firstUnfulfilledPage`, `firstUnfulfilledPageForLine`, `firstUnfulfilledPageForUnit`, `firstPagePresentingObligation`. Status: `pageStatus`, `containerStatus`, `journeyState`, `effectiveStatus`. Structure: `expandPresents`. Cross-record: `groupInvariantErrors`, `groupInvariantErrorsForContainer`. |

### Contract seam (root)

| File | LOC | Responsibility |
|---|---|---|
| `contract.js` | 338 | **The only path from browser layer → model.** 20 exports: `evaluateState`, `sections`/`subsections`/`pages`, `findPage`/`findSubsection`/`findSection`, `subsectionOf`/`sectionOf`, `statusOfPage`/`statusOfContainer`/`statusOfJourney`, `startPage`, `nextAfter`/`nextAfterForLine`/`nextAfterForUnit`, `changeLinkFor`, `groupInvariantErrorsForState`, `fieldsForPage`, `validatePagePayload`. Constructs the evaluator once at module load. |

### Browser layer — Hapi plugin + controllers

| File | LOC | Responsibility |
|---|---|---|
| `routes.js` | 210 | Hapi plugin `journeyConfigFlow`. **Routes are generated at register time by walking `pages()`** and branching on `presentsForEach.forEachOf` (`commodityLine` → `/lines/{lineId}/{page}`; `unitRecord` → `/lines/{lineId}/units/{unitId}/{page}`; else `/pages/{page}`). Plus 10 hand-declared meta/CRUD routes. All routes `auth: false`. |
| `lib/page-controller.js` | 111 | Generic GET/POST factory for a static (notification-level) page |
| `lib/line-page-controller.js` | 141 | Same, depth-1 (per commodity line) |
| `lib/unit-page-controller.js` | 179 | Same, depth-2 (per unit record) |
| `lib/state.js` | 232 | `@hapi/yar` session wrappers (`readFulfilments`/`writeFulfilments`/`readState`/`writeAnswer`) + `addCommodityLine`/`addUnitRecord`/delete-cascade + monotonic id minting |
| `lib/build-field-descriptors.js` | 110 | Pure fn: (page, state) → field descriptors |
| `lib/field-widgets.js` | 343 | **Data-shaped, ordered widget dispatch table.** First-match-wins rules → `FieldViewItem {type: radios\|select\|checkboxes\|date\|input\|address, args}`. The only place a govuk widget is chosen. |
| `lib/presentation.js` | 433 | Per-obligation copy — stores **message keys**, resolves via `t()` |
| `lib/format-domain-errors.js` | 158 | Domain error records → GOV.UK `{errorList, fieldErrors}` |
| `lib/i18n.js` | 82 | `t()` / `tOrNull()` / `hasKey()` over `locales/en.json`. Missing key → renders the dotted path (visible failure). |
| `lib/is-blank-value.js` | 39 | Shared blank semantics (`''`, `null`, `undefined`, `[]`, all-blank composite) |
| `lib/chrome.js` | 51 | Nav/header view-model |
| `features/hub/controller.js` | 141 | Task list — resolves `statusOfContainer` per subsection on the fly |
| `features/check-your-answers/controller.js` | 351 | CYA + Change links + group-invariant + address-incompleteness prompts |
| `features/commodity-lines/controller.js` | 227 | **Bespoke** depth-1 Add-another (index/add/delete + cascade) |
| `features/units/controller.js` | 308 | **Bespoke** depth-2 Add-another (index/add/delete + composite-key cascade) |
| `features/start/controller.js` | 26 | Landing redirect → `startPage(state)` |
| `features/reset/controller.js` | 17 | Session wipe |

### Templates (299 LOC total)

`shared/layout.njk` (51), `shared/page.njk` (27, generic form page — used by EVERY flow-driven page), `shared/partials/fields.njk` (50, shape-dispatch on `item.type`), `shared/partials/error-summary.njk` (11), `features/hub/template.njk` (34), `features/check-your-answers/template.njk` (36), `features/commodity-lines/list.njk` (47), `features/units/list.njk` (43).

Note the ratio: **8 templates for 31 pages.** Page rendering is fully generic.

### Tooling / sketches / fixtures

| File | LOC | Responsibility |
|---|---|---|
| `dump.js` | 138 | Headless CLI + programmatic `report(fixture)` — prints the whole logical state as JSON. Snapshot-pinned by `dump.test.js`. |
| `data-dictionary-sketch.js` | 98 | Walks obligations + domain `.metadata` → stakeholder-facing dictionary + coverage report |
| `controller-sketch.js` | 125 | Historical artefact — proves the same primitives can drive a Joi schema |
| `locales/en.json` | 584 | **362 message keys.** Every user-facing string. |
| `fixtures/*.json` | 29 | 3 named fulfilment fixtures (`empty`, `internal-market-partial`, `transit-with-lines`) |
| `e2e/journey.js` | 331 | Playwright page-object / data-driven journey declaration |
| `e2e/walk.spec.js` | 210 | 2 Playwright specs (full-journey walk + variant) |

---

## 3. Entry points

**There is no standalone app.** The spike is a **Hapi plugin mounted into the existing `trade-imports-animals-frontend` process** — no `package.json`, no server bootstrap, no `index.js` under `prototypes/`.

Four integration points, all in the host `src/`, all gated by one convict flag:

1. **`src/config/config.js:345-347`** — convict entry `prototype.eudpa249.enabled`, env `PROTOTYPE_EUDPA249_ENABLED`, defaults to `!isProduction`.
2. **`src/server/router.js:68-70`** — conditional `await import('../../prototypes/journey-config-spikes/EUDPA-249-flow-layer/routes.js')`. Flag off → module never loaded, no `/prototype/*` route exists.
3. **`src/config/nunjucks/nunjucks.js:24-28, 48-52`** — conditionally adds the spike dir to both the Nunjucks search path and the Vision `path` array.
4. **`vitest.config.js:15`** / **`playwright.config.js:23`** — test-runner wiring (vitest excludes `e2e/**`; playwright's `testDir` IS `e2e/`).

Runtime entry: `GET /prototype/eudpa-249/start` → `startController` → `contract.startPage(state)` → redirect.

Model consumption entry: `contract.js:50` `evaluateState(fulfilments)` — the single call every controller makes.

Headless entry: `node prototypes/journey-config-spikes/EUDPA-249-flow-layer/dump.js <fixture>`.

**Retrofit implication:** the plugin mount is 4 small touch-points in `src/`, cleanly flag-gated. Lifting Side B's model out is a matter of moving 6 directories; lifting Side B's *browser layer* out means bringing the contract seam + 3 page-controller factories + the widget table.

---

## 4. Domain scale — the source of truth, counted

**Source of truth: `obligations/obligations.js` (the manifest array, lines 793-838), `flow/flow.js` (the tree), `domain/index.js` (the Map, lines 1150-1194).**

| Thing | Count | Evidence |
|---|---|---|
| **Obligations in the manifest** | **44** | `obligations/obligations.js:793-838` |
| — of which structural groups | 2 | `commodityLine` (`:405`), `unitRecord` (`:563`) |
| — of which system-populated (declared, not presented) | 2 | `poApprovedReferenceNumber` (`:152`), `responsiblePersonForLoad` (`:163`) |
| — of which **wired end-to-end** (obligation + domain + flow + copy) | **40** | enforced by `obligations/coverage.test.js:80-97`; `KNOWN_UNWIRED` set has exactly the 4 above |
| **Domain entries** | **40** | `domain/index.js:1150-1194` (the Map) |
| **Obligations with a conditional `applyTo`** | **13** | `regionCode`, `purposeInInternalMarket`, `commercialTransporter`, `privateTransporter`, `transitedCountries`, `numberOfPackages`, `cph`, `containsUnweanedAnimals`, `passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`, `description`, `permanentAddress` + the 4 accompanying-document fields sharing one gate |
| **Gate-shape helper factories** | **4** | `allowListed`, `allowListedByPredicate`, `anyAllowListed`, `branchedGate` — `obligations/helpers.js:39,65,101,132` |
| **Commodity-code whitelists** | **7** | `PACKAGE_COUNT_COMMODITIES` (8 codes), `CPH_REQUIRED_COMMODITIES` (17), `PASSPORT_COMMODITIES` (3), `TATTOO_COMMODITIES` (3), `EAR_TAG_COMMODITIES`, `HORSE_NAME_COMMODITIES` (1), `PERMANENT_ADDRESS_COMMODITIES` (1) |
| **Group invariants** | **1** | `unitRecord.requires.anyOf` (≥1 of 6 animal identifiers) — `obligations/obligations.js:581-593` |
| **Sections** | **6** | `flow/flow.js` — `kind: 'section'` ×6 |
| **SubSections** (the task-list unit) | **16** | `kind: 'subsection'` ×16 |
| **Pages** | **31** | `page:` ×31. 20 static, 10 `presentsForEach`, 1 read-only intro (`commodity-lines-intro`) |
| — depth-1 `presentsForEach` (per commodity line) | 5 | commodity-details, commodity-type, species-details, number-of-animals, number-of-packages |
| — depth-2 `presentsForEach` (per unit record) | 7 | permanent-address, passport, tattoo, ear-tag, horse-name, identification-details, description |
| **Domain-entry shapes in use** | 4 | `staticEnum` (12), `computedEnum` (2 — `purposeInInternalMarket`, `species`), `predicate` (17), `addressBlock` (9) |
| **Rendered form inputs (leaf fields)** | **~113** | 31 simple + 9 address blocks × 9 sub-fields (commercialTransporter has 10) = 31 + 82 |
| **Address sub-fields** | 9 (+1) | `domain/index.js:839-849`; `commercialTransporter` adds `transporterAuthorisationNumber` (`:877-888`) |
| **i18n message keys** | **362** | `locales/en.json`; coverage-tested by `i18n-coverage.test.js` (11 cases) |
| **Max group nesting depth exercised** | **2** | `unitRecord within commodityLine`; composite key `line1/unit1` |

**Depth is data-driven, not hard-coded, in the MODEL** (`within` chain + composite `/`-delimited keys). But it IS hard-coded in the BROWSER LAYER: three separate controller factories (`page-controller`, `line-page-controller`, `unit-page-controller`), three separate `nextAfterFor*` contract functions, three separate `firstUnfulfilledPageFor*` primitives, and `routes.js:154` branches on `=== unitRecord` by identity. A depth-3 group needs a 4th controller, a 4th `nextAfterFor*`, a 4th `firstUnfulfilledPageFor*`, and another `routes.js` branch. The spike knows this — `RECOMMENDATION.md:180-188` explicitly declines to generalise ("bespoke controllers cost less than a generalised primitive at 2 depth levels; promote if a 3rd Add-another shape appears").

---

## 5. Architecture summary

Side B is a **three-layer separation-of-concerns argument, prosecuted rigorously and documented at length**, mounted as a flag-gated Hapi plugin inside the real frontend. The layers are:

- **Layer 1 — Obligations** (`obligations/obligations.js`, 44 records). Owns *identity* (stable UUID `id` + renameable `name`), *cardinality* (`single` / `indexed` via `within`), *completion-mandate* (`status: mandatory|optional`), and *scope* — `applyTo(fulfilments, fulfilmentIdsByObligationId) → Decision`. The obligation record is otherwise pure data. Scope is a **function, not a DSL**: the spike prototyped a declarative `gatedBy` DSL and explicitly rejected it (`GAPS.md:62-86`) on idiomatic-JS, obligation-level-testability, and cross-sibling-ergonomics grounds. Introspection is clawed back selectively via a `.metadata` sidecar on each helper-built closure — so `applyTo` is a *function at runtime* and a *data structure for tooling*. Four helper factories cover every gate shape V4 needs.

- **Layer 1.25 — Domain** (`domain/index.js`, 40 entries). Owns *value legality only* — "is this proposed value legal, given current state?" Keyed by obligation id, not by commodity code, on a deliberate design call (`RECOMMENDATION.md:87-102`, D1): obligations already model the commodity-code fan-out via `applyTo`, so a second commodity-keyed lookup layer would duplicate it and create drift risk. Four entry shapes: `staticEnum` (fully introspectable), `computedEnum` (function + `metadata.readsFrom`), `predicate` (function + `metadata.reasons` enumerating every failure code it can emit), and `addressBlock` (a composite widget factory with per-sub-field rules and an `isComplete` structural check). D2 is the explicit "data-shaped where possible, function escape hatch where computed" position.

- **Layer 2 — Flow** (`flow/flow.js`, 6 sections / 16 subsections / 31 pages). Owns *page composition and navigation only*. A page declares `presents: [{obligation, mandatoryToProceed?, errors?}]` or one `presentsForEach: {obligation, forEachOf: <group>}`. Crucially, **the flow declares no visibility rules at all** — a page becomes Not Applicable automatically when every obligation it presents is out of scope. Show/hide-a-page, show/hide-a-question and show/hide-an-option all ride the *same single mechanism* (`applyTo` + `optionsFor`), which is the spike's central claim.

The **engine** (`engine/index.js`) is deliberately NOT an orchestrator object — it is **15 standalone pure functions**, each answering one question, each independently unit-testable against synthetic fixtures with no browser and no long setup (D3). The status alphabet is **5-way** (Not Applicable / Optional / Not Started / In Progress / Fulfilled, + Submitted at journey level), and container status is **re-derived from the subtree's in-scope entries rather than rolled up from child statuses** (`engine/index.js:449-474`) — a specific choice to avoid fiddly roll-up precedence for mixed cases.

The **contract seam** (`contract.js`, 20 functions) is the sole path from browser → model, enforced by convention + grep + tests; no controller or template imports `engine/`, `domain/` or `flow/` directly. Routes are **generated by walking the flow tree** at plugin-register time, so adding a page adds a URL with no route edit. Templates render only `FieldViewItem`s produced by a single data-shaped widget dispatch table.

**What Side B deliberately does NOT have** (and this is the honest counterweight to its rigour): **no persistence beyond `@hapi/yar` session** — `lib/state.js` is the entire persistence story, there is no backend call, no Mongo, no notification mapper, no submit. **No file upload.** **No auth** (routes are explicitly `auth: false`). **No amend-and-resubmit.** **No Welsh** (the i18n *infrastructure* is complete — 362 keys, `t()`, a coverage test — but no `cy.json` and no locale threading). **No progressive enhancement / client JS.** **No cross-variant harness beyond 2 Playwright specs.** The Add-another UX at both depths is bespoke controller code, not a flow primitive. Async / MDM-backed option lists are stubbed as static enums with a documented "design against the real API when it lands" deferral (D5). Three obligations' option lists (`commodityCode`, `species`, `portOfEntry`, `animalsCertifiedFor`) are in-spike stubs, not real MDM.

Correctness is defended three ways, and the mechanisms are worth stealing regardless of which model wins: (1) the **contract seam** as a grep-enforceable convention; (2) **four test levels** — domain isolation, engine primitives on synthetic obligations, integration through the real V4 slice, and HTTP-level `server.inject` walks with a cookie jar; (3) **`obligations/coverage.test.js`** — a whitelist test asserting *every* obligation is either wired to a domain entry or explicitly on a `KNOWN_UNWIRED` allow-list with a written reason, plus cycle-detection on the `within` chain and id/name uniqueness. That coverage test is the anti-add-and-forget gate and it is the single cheapest idea on this side to port.

`obligations.md` (3,010 lines) also carries a **settled/deferred register** (`§What's still open`, lines 2685-2888) that is effectively a ready-made gap list for the third-option shopping exercise: submission-blocks / "Cannot Submit" journey state (R, extension point only), staleness (K, deferred), cross-obligation references (N, deferred), failure policies for orchestrator-handled obligations (M, deferred), async/dynamic enum options (deferred), cross-record predicates other than the one group invariant (deferred), and flow-primitive Add-another (deferred).
