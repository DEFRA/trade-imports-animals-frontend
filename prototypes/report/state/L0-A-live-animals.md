# L0 Inventory — SIDE A "live-animals" (Sam's)

Clone: `/Users/samfarrington/git/defra/trade-imports-animals-workspace/workareas/model-comparison/clone-live-animals` (HEAD `b6ac2ed`)
Primary root: `prototypes/standalone/live-animals/`
Secondary surface (E2E, lives OUTSIDE the root): `prototypes/e2e/live-animals.spec.js`, `prototypes/e2e/skeleton-vs-prototype-mongo.spec.js`, `prototypes/e2e/journey.js`

All paths below are relative to `<clone>/prototypes/standalone/live-animals/` unless stated.

---

## 0. Headline architecture (from DESIGN-DELTA.md, docs/architecture.md, docs/obligation-model.md, docs/limits.md)

**"Obligations-v2 page-owned-spine".** The design deliberately INVERTS the config-engine paradigm. Three layers, one dependency direction:

```
features/  →  flow/  →  engine/
```

- **features/** are the spine. Each feature is a vertical slice: `controller.js` (+ extra controllers), `template.njk`, a `page.js` identity leaf, and (for collecting pages) an `obligations.js` model file. The slice owns its copy, its validation and its rendering. **Nothing central projects a page.** There is no generic renderer, no type-to-widget registry, no config schema. `docs/architecture.md:210-218` states the trade explicitly: "There is no free rendering and no free Check your answers row."
- **The model is inert plain-JS data.** An obligation is an object with AT MOST 10 keys (`docs/obligation-model.md:16-28`): `id`, `required`, `requiredAtLeastOne`, `requiredOneOf`, `collection`, `item`, `system`, `renderOnly`, `activatedBy`, `wipeOnExit`, `maxEntriesFrom` — plus `enforcedAt` (added at DESIGN-DELTA #6). Relationships are **data literals over real JS object references** to other obligations — never strings, never closures, never UUIDs (`registry.js:1-28`; rationale at `docs/obligation-model.md:75-98`: greppable / navigable / fail-loud).
- **`registry.js` assembles, never defines** (81 LOC). It concatenates every feature's `obligations` array and exposes `all`, `byId`, `byPath`, `walkObligations()` (structural catalogue, answer-independent) and `walk(answers)` (per-instance catalogue that materialises the tree against a concrete answers map and yields the innermost-first `frames` chain).
- **engine/** is a pure state core: read/write/reconcile/completeness/status + the two persistence ports. It imports ZERO `flow/` modules; the one flow-shaped need (submit readiness) is injected downward at boot (`engine/read.js#configureReadyForCheckYourAnswers`), and the unconfigured default **throws**.
- **The seam is one-directional and derived.** Pages declare what they `collect`; `flow/dispatch.js#buildDispatch` INVERTS those declarations at boot into an obligation→page index, so the model never names a page. Data crosses down (`state.commit`); scope/wipe/status are derived and handed up read-only. **There is no `setScope` and no per-key delete anywhere in the stack** — a page physically cannot hand-roll a wipe (`docs/architecture.md:41-45`).
- **Two boot-time totality guards, both fail-loud** (`routes.js:19-25`):
  1. `assertObligationPurity()` — reads the SOURCE TEXT of every `features/*/obligations.js` and rejects any import that is not another `obligations.js`. Text-scan, not module-graph, deliberately (`docs/obligation-model.md:68-73`).
  2. `buildDispatch(dispatchPages)` — coverage-asserts every non-`system` obligation **at every tree depth** is collected by **exactly one** page. A forgotten or duplicated `collects` is a startup crash.
- **`contract.test.js` (328 LOC)** is the third totality guard, at test time: for each collecting page it drives the REAL POST handler and asserts the set of obligation ids the handler commits **equals** the page's declared `collects` (minus `renderOnly`/`system`).

**Activation vocabulary — exactly four operators**, interpreted in one place, `engine/evaluate/predicate.js` (69 LOC):
`equals` (scalar equality) · `includes` (set-intersection: "answer is one of these", works for scalar or multi-select) · `present` (answered/non-blank; currently NO live carrier) · `notInUnionOf` (answered AND in NONE of the named obligations' `includes` lists — the complement expressed BY REFERENCE, so it cannot drift from the positive gates it negates).

**Frame vocabulary — an OPT-IN `frame` key on `activatedBy`** (DESIGN-DELTA #3, `predicate.js:31-69`):
- absent → sibling-identity inference: if the referenced obligation is in the node's own `siblings` list, resolve inside this entry's frame; otherwise resolve as a top-level answer.
- `frame: "enclosing"` → walk strictly OUTWARD (nearest first) to the first ancestor frame whose obligation list holds the reference. Works two frames out (depth-2).
- `frame: "anyItem"` → the reference lives in the ITEMS of a collection; predicate holds if ANY item satisfies it.

**The resolver-unity invariant** (`docs/obligation-model.md:243-256`): `evalPredicate` (scope) and `entryComplete` (completeness) must resolve references identically, or an obligation could be in scope yet not counted as owed. DESIGN-DELTA #5 threads an opt-in enclosing `ctx` through `complete.js` so the invariant holds at depth.

**What was DROPPED from v1, with reasons** (`docs/architecture.md:186-206`): UUID identifiers, model-owned copy, the generic renderer, the 21-export contract barrel, the scope-predicate registry, dotted reason codes, the mandate composition table, the obligation `type` taxonomy and constraint metadata. Rationale for the last: a usage trace found **no runtime code read them** — every widget and value-domain was already re-declared page-side.

**Honestly-declared limits** (`docs/limits.md`) — important for the comparison:
- Ownership at depth is DERIVED, not declarable: a sub-field silently inherits its nearest collection ancestor's page. You cannot redirect ownership of one field at depth to a different page (`docs/limits.md:48-52`).
- Derived gates bake in ANY-in-scope semantics; a section mixing conditional and unconditional obligations gets an always-true derived gate and needs an authored override (`docs/limits.md:60-64`).
- Two identity vocabularies (template addresses `commodityLines.commoditySelection` vs instance path keys `commodityLines[0].commoditySelection`), bridged not unified (`docs/limits.md:39-46`).
- No i18n/localisation layer at all. Copy is hardcoded English in `.njk` templates and controllers.
- No field-widget derivation. No `type` on an obligation.
- "Add a field touches five places" (`docs/add-a-field.md:16`).
- Review coverage was JavaScript only — `.njk` templates never got a best-practice sweep (`docs/limits.md:86-88`).

---

## 1. Totals

| Metric | Value |
|---|---|
| Files under the root (excl. node_modules) | **248** |
| Total LOC under the root | **27,514** |
| Source JS files / LOC | **124 / 8,323** |
| Test JS files (`*.test.js`) / LOC | **64 / 10,320** |
| Unit/integration test CASES (`it(` / `test(`) | **526** |
| Nunjucks templates / LOC | **32 / 1,499** |
| Docs (`*.md`) / LOC | **22 / 4,288** |
| JSON (spec + fixtures) / LOC | **6 / 3,084** |
| E2E outside the root (`prototypes/e2e/`) | 3 files / **3,612** LOC |
| — `live-animals.spec.js` | 2,917 LOC, **33 tests** |
| — `skeleton-vs-prototype-mongo.spec.js` (Mongo parity pin) | 399 LOC, **1 test** |
| — `journey.js` (page-object/journey helper) | 296 LOC |
| **Grand total attributable to A** | **31,126 LOC** |
| Test-to-source ratio (unit only) | 10,320 : 8,323 = **1.24 : 1** |

Test count note: unit-suite entry point is `npm run test:live-animals` → `TZ=UTC vitest run prototypes/standalone/live-animals --no-coverage` (`<clone>/package.json:45`).

---

## 2. Domain scale — the source of truth, counted

Two sources of truth exist. **The spec is upstream of the code; the code is what actually runs.**

### 2a. The RUNNING model — `features/*/obligations.js` (12 files, ~300 LOC total)

| Fact | Count |
|---|---|
| Obligations declared (all depths) | **44** |
| Collections (`collection: true`) | **3** — `commodityLines`, `animalIdentifiers` (nested inside it → depth 2), `documents` |
| Max nesting depth | **2** (`commodityLines[i].animalIdentifiers[j].<field>`) |
| `required: true` | **32** |
| `activatedBy` (conditional obligations) | **15** |
| `wipeOnExit: true` | **15** (every `activatedBy` carrier — the spec defaults it on) |
| `enforcedAt: 'continue'` | **2** (`countryOfOrigin`, `commoditySelection`) |
| `requiredAtLeastOne` | **2** (`commodityLines`, `animalIdentifiers`) |
| `requiredOneOf` | **1** (`animalIdentifiers` → the 6-member animal-identifier group) |
| `maxEntriesFrom` | **1** (`animalIdentifiers` → `numberOfAnimalsQuantity`) |
| `system` / `renderOnly` carriers | **0** each (flags supported, dormant) |
| Cross-feature obligation references | **0** (`docs/obligation-model.md:79`) |
| `frame: "enclosing"` carriers | 7 (`animalIdentifierPassport/Tattoo/EarTag`, `horseName`, `animalIdentifierIdentificationDetails`, `animalIdentifierDescription`, `permanentAddress`) |
| `frame: "anyItem"` carriers | 2 (`countyParishHoldingCph`, `containsUnweanedAnimals`) |
| `notInUnionOf` carriers | 2 (the two free-text fallback identifiers) |

Per-feature obligation counts: commodities 13 (`features/commodities/obligations.js`), transport 9, addresses 5, documents 5, origin 4, additional-details 2, import-purpose 1, import-reason 1, contact 1, cph-number 1, declaration 1, import-type-filter 1.

### 2b. Pages and flow

| Fact | Count | Source |
|---|---|---|
| Flow sections | **10** (`start`, `origin`, `commodities`, `animalIdentification`, `consignment`, `documents`, `addresses`, `transport`, `contact`, `review`) | `flow/flow.js:27-75` |
| Flow pages | **20** | `flow/flow.js` |
| Dispatch (collecting) pages | **18** | `features/index.js:27-46` |
| Route modules assembled | **24** | `features/index.js:48-73` |
| Feature directories | **16** | `features/` |
| Controllers (`*.controller.js` + `controller.js`) | **22** | |
| Templates (`.njk`) | **32** (incl. 3 shared, 4 `_partials`) | |
| Hub task rows | **11** answer rows + review | `flow/task-rows.js:24-51` |
| AUTHORED gates in the whole flow | **1** — `review`: `(scope) => scope.readyForCheckYourAnswers` | `flow/flow.js:72` |

### 2c. The SPEC — `spec/journey-spec.json` (2,014 LOC) + `spec/conflicts.json` (378 LOC)

The machine-readable spec is the build loop's input, distilled from Confluence "Live Animals Data Fields V4", the `src/server` skeleton journey, the interaction-design canvas and a 39-page Figma export.

| Fact | Count |
|---|---|
| Spec obligations (`"appliesAt"`) | **49** (44 built + system/deferred: `referenceNumber`, `responsiblePersonForLoad`, `typeSelection`, `destinationCountry`, `exitBcp`) |
| Spec pages (`"slug"`) | **27** |
| Spec sections | 10 |
| Spec behaviours (named journey behaviours) | ~23 |
| Spec sources | 5 (confluence-v4, skeleton, ixd-canvas, figma, heroku-prototype) |
| Conflicts logged (`conflicts.json`) | **40** (`c-001`…`c-040`) — every one carries a ruling |
| Field groups | 1 (`address`, a 9-field reusable block) |

Every spec obligation carries `mandate` + `mandateRaw` (the verbatim V4 wording) + `provenance` (source + ref, e.g. `src/server/origin/controller.js:98`).

**Supporting material OUTSIDE the clone**: `workareas/journey-builder/EUDPA-249/` — `extract.figma.json`, `figma-digest/journey-map.md`, `figma-digest/gap-register.md`, `figma-digest/M3-PLAN.md` (§2.4 is the ruling log for c-029…c-040).

---

## 3. Module responsibilities — every top-level directory

### `/` (spike root) — 10 source files, 8 scenario-test files
| File | LOC | Responsibility |
|---|---|---|
| `routes.js` | 37 | THE ENTRY POINT. One Hapi plugin. Boot sequence: purity guard → buildDispatch → configure readiness → configure records port → configure session port → register journey cookie → `onPreHandler` entry guard → (real mode) prime countries+ports → `server.route(allRoutes)`. |
| `registry.js` | 81 | Assembling barrel over the 12 feature obligation slices. Defines nothing. Exports `all`/`byId`/`byPath` + the two generators `walkObligations()` and `walk(answers)` (the latter yields the `frames` chain). |
| `obligation-purity.js` | 46 | Source-text purity guard for `features/*/obligations.js`. |
| `config.js` | 15 | Shell identity: BASE mount path, template root, breadcrumbs. |
| `dump.js` | 89 | Headless state dump — prints derived scope, wipes, section statuses, submit readiness for an editable fixture. `npm run dump:live-animals`. |
| `contract.test.js` | 328 | **The safety net.** Per collecting page: drive the real POST handler, assert committed ids == declared `collects`. |
| `store-ops.test.js` | 542 | Cross-layer store-op scenarios: append/update/remove at path, batch reconcile, cardinality cap, depth-2 wipe. |
| `t2-hub-copy.test.js` | 220 | Hub rendering: GDS tag vocabulary, groups, "Cannot start yet" rows have no link. |
| `indexed.test.js` | 182 | Indexed collection status walk (OPTIONAL/IN_PROGRESS/FULFILLED). |
| `item-conditional.test.js` | 60 | Sibling-identity gate resolution inside a collection item (synthetic). |
| `nested.test.js` | 29 | Depth-2 nested-collection completeness (synthetic). |
| `obligation-purity.test.js` | 49 | The purity guard's own test. |
| `t1-currency-persist.test.js` | 65 | Handler-level guarantee: persist the CLEANED value, re-render the RAW input on error. Synthetic (no live currency field). |

### `engine/` — the pure state core. 12 source files (~750 LOC) + 12 test files (~1,200 LOC)
| File | LOC | Responsibility |
|---|---|---|
| `index.js` | 14 | The facade barrel controllers import as `import * as state`. Exports exactly: `get`, `makeScope`, `commit`, `appendEntry(At)`, `updateEntry(At)`, `removeEntry(At)`, `reconcileEntriesAt`, `submitJourney`, `collectionView`, `collectionCapAt`. |
| `read.js` | 44 | `get`, `makeScope` (+ `configureReadyForCheckYourAnswers` — the downward injection of the one flow-shaped fact; unconfigured default throws). `makeScope` also exposes instance-aware `answered(id)` — true if ANY instance at ANY depth is answered. |
| `write.js` | 95 | The ONLY side-effecting surface. All write ops + `submitJourney` (a status flip, freeze-enforced by the records adapter). `appendEntryAt` consults `collectionCapAt` and rejects at the cap. |
| `status.js` | 79 | The five-status roll-up: NOT_APPLICABLE / OPTIONAL / NOT_STARTED / IN_PROGRESS / FULFILLED. `statusOf` takes **status parts** — an id OR a **collection facet** `{collection, only|except}` (DESIGN-DELTA #13). |
| `journey.js` | 104 | Journey-isolation seam: cookies, load-or-create, the dashboard verbs (`listKnownJourneys`, `selectJourney`, `amendJourney`, `startJourney`). |
| `store.js` | 12 | Compat shim over the records port for pre-reshape consumers. |
| `test-support.js` | 68 | Shared fakes for engine + controller specs. |
| `evaluate/predicate.js` | 69 | **The activation interpreter.** 4 operators × 3 frame modes. Exports `includesUnion` for `notInUnionOf` reuse. |
| `evaluate/reconcile.js` | 48 | Derives scope + the wipe set from the answers on EVERY read and write. Has a test-only `forest` seam for synthetic cross-frame specs. |
| `evaluate/complete.js` | 93 | `satisfied` / `collectionComplete` / `entryComplete`. Carries the opt-in enclosing `ctx` (DESIGN-DELTA #5), the `requiredOneOf` group check (#4) and the `includesMember` facet filter (#13). |
| `evaluate/collection-view.js` | 17 | Read view over a collection's entries for templates. |
| `evaluate/cardinality.js` | 31 | `collectionCapAt` — resolves `maxEntriesFrom` in the frame that holds the collection. Unanswered or non-integer count ⇒ no cap. |
| `persistence/records.js` | 48 | The RECORDS port contract (durable journey record). `configureRecords`, `assertWritable` (the freeze), `SUBMITTED`, `amend`, `list({journeyIds})`. |
| `persistence/session.js` | 51 | The SESSION port contract (identity + presentation state): active journey id, known-journeys list, opening-run record. |
| Tests | | `store-contract`, `read`, `status`, `journey`, `journey-user-assoc`, `one-load-per-request`, `write-through-per-commit`, `submit-is-finalise`, `resume-self-heal`; `evaluate/{reconcile, cross-frame (348), enclosing-complete (151), sibling-at-least-one (141), collection-view}` |

### `flow/` — sequence, gating, presentation mode. 9 source files (~410 LOC) + 5 test files (~1,366 LOC)
| File | LOC | Responsibility |
|---|---|---|
| `flow.js` | 86 | The ordered `sections` → `pages` spine. Owns no copy, no validation, no templates. `allFlowPages`, `sectionOfPage`, `answerSections`. |
| `gates.js` | 37 | The derived-default / authored-override gate seam. Derived gate = (some collected obligation in scope) AND (all strictly-earlier `enforcedAt:'continue'` prereqs answered). `assertDispatchBuilt` fail-loud guard. |
| `dispatch.js` | 74 | `buildDispatch` — inverts the page-side `collects` into an obligation→page index at boot AND coverage-asserts totality. `ownerOfObligation` strips instance indices (the two-vocabulary bridge). |
| `prerequisites.js` | 31 | Derives, for any page/section, the set of `enforcedAt:'continue'` obligation ids owned by a STRICTLY-EARLIER flow step. **No hand-authored prerequisite graph** — it falls out of flow order + the dispatch index + the obligation's own `enforcedAt`. |
| `navigation.js` | 28 | `sectionEntry`, `nextInSection` (else back to the hub), `rowGatePasses`, `rowEntry`. |
| `section-status.js` | 15 | The flow-aware roll-ups: `sectionStatus`, `readyForCheckYourAnswers` (now over task rows). |
| `task-rows.js` | 59 | The hub's unit of status: 11 page-level task rows, two of them carrying **collection facets** (`{collection:'commodityLines', except:['animalIdentifiers']}` / `{only:[...]}`) so ONE stored collection splits across TWO hub rows without moving any data. |
| `run.js` | 51 | `RUN_STEPS` — the pre-hub linear opening run as CONFIG, not redirects. Each step resolves its own target from scope; `null` skips. `nextRunTarget(stepId, scope)`. |
| `run-state.js` | 29 | Session-side presentation state for the run (`inOpeningRun`). |
| `entry-guard.js` | 50 | `onPreHandler` deep-link guard: a fresh journey that never went through the filter is redirected to the filter. |
| Tests | | `opening-run.test.js` (526), `task-rows.test.js` (319), `gates.test.js` (218), `dispatch.test.js` (200), `run.test.js` (103) |

### `features/` — THE SPINE. 16 feature dirs, 22 controllers, 32 templates, 12 obligation files
| Feature | Key files (LOC) | Responsibility |
|---|---|---|
| `index.js` | 73 | Assembles `dispatchPages` (the `collects` declarations) and `allRoutes`. |
| `dashboard/` | controller 125, template 59, test 283 | The notifications list (session-scoped): Draft/Submitted tags, Resume / View / Amend row actions, Start a new notification. |
| `import-type-filter/` | controller 88, 2 templates | Service entry filter (live animals / POAO / HRFNAO / plants). Opens the linear run. |
| `hub/` | controller 208, template 51 | The task-list hub. Owns the GDS presentation mapping: 6 numbered groups of `govukTaskList` rows, tag vocabulary, "Cannot start yet" grey text with no link. |
| `origin/` | controller 95, obligations 26, test 147 | Country of origin (+ progressive-enhancement accessible-autocomplete over the select), region-of-origin conditional reveal, internal reference. |
| `commodities/` | **search.controller 147, consignment-details.controller 207, animal-identification.controller 566**, obligations 126, 5 templates, 3 tests (613) | The biggest feature. Batch commodity SEARCH (checkboxes, server round-trip, hidden selected/shown carry), the consolidated CONSIGNMENT DETAILS page (per-species quantity blocks, count-drop block), and the SINGLE ANIMAL-IDENTIFICATION surface (one card per species line, counter-driven "Enter details for {species} N of M", Save-and-add-another / Save-and-finish, max-reached state). |
| `import-reason/` | controller 62 | Reason for import. |
| `import-purpose/` | controller 80 | Conditional follow-up when reason = internal market. |
| `additional-details/` | controller 88, obligations 17 | `animalsCertifiedFor` + `containsUnweanedAnimals` (an `anyItem` cross-frame gate). |
| `documents/` | controller 358, upload-config 55, test 247 | Accompanying documents collection loop + **cdp-uploader file upload** integration. |
| `addresses/` | controller 55, party-picker.controller 183, create-address.controller 165, `_address-picker.njk` 119, 3 tests (513) | The 5 party roles (consignor/consignee/importer/placeOfOrigin/placeOfDestination) over an address-book service: pick-or-create sub-journey. |
| `cph-number/` | controller 74, obligations 15 | County-Parish-Holding, gated `anyItem` across commodity lines. |
| `transport/` | 5 controllers (466), 5 templates, obligations 59, 2 tests (220) | Port of entry, transit countries (conditional collection), transporter type → commercial/private branches. |
| `contact/` | controller 68 | Consignment contact select. |
| `check-answers/` | **controller 495**, template 76, test 391 | The bespoke CYA page. Hand-composed rows + per-collection cards with `?change=1` Change links. |
| `declaration/` | controller 70 | The submit action. Validator enforces `declaration === 'confirmed'` BEFORE `submitJourney`. |
| `confirmation/` | controller 30, template 40 | govukPanel with the reference. |

### `services/` — 12 service dirs, ~2,300 source LOC + ~1,850 test LOC
Every service is a `index.js` port + `stub.js` and (where real) `real.js` / `client.js`, selected by `services/mode.js` (3 LOC — the `LIVE_ANIMALS_MODE=stub|real` global switch).

| Service | Files (LOC) | Responsibility |
|---|---|---|
| `persistence/records/` | `real.js` 153, `stub.js` 95, **`notification-mapper.js` 507**, `mapper.js` 20, + 6 tests (1,531) | The durable-record port. **TWO mappers**: Mapper A (skeleton-exact — proven byte-identical to what the legacy `src/server` skeleton POSTs, `skeleton-equivalence.test.js` 238) and Mapper B (lossless — per-group commodityCode + full per-species identifier arrays). Real adapter strips backend nulls BEFORE mapping. `amend` (the sanctioned unfreeze) + session-scoped `list`. |
| `persistence/session/` | `real.js` 46 (yar/Redis), `stub.js` 48 (base64json cookies), + 3 tests (459) | Active journey id, known-journeys list, opening-run record. |
| `address-book/` | `stub.js` 416, `index.js` 72, test 125 | Address book (the largest stub). |
| `commodities/` | `stub.js` 99, `index.js` 67 | Commodity search + the identifier-type commodity lists (`passportCommodities()`, `earTagCommodities()`, `packageCountCommodities()` …) that the obligation model's `includes` gates read. |
| `document-uploads/` | `real.js` 89 (cdp-uploader), `stub.js` 30, 2 tests (185) | File upload. |
| `countries/`, `ports/` | `client.js` 18 each, `stub.js` 33/80 | Reference-data clients (primed at boot in real mode). |
| `document-types/`, `certification-purposes/`, `import-reason-purpose/`, `transport-reference/` | small stubs (~20-27 each) | Lookup lists. |
| `_capture/` | `capture.js` 52 + 3 JSON fixtures (566) | Records real reference-data responses into canned fixtures. |
| `run-mode.test.js` | 114 | Pins the stub/real switch. |

### `lib/` — context-free helpers. 6 source files (~275 LOC) + 2 tests (377)
`path.js` (63 — path maths, `valueAt`, `pathKey`), `answered.js` (10 — the `isAnswered` predicate), `validate/{validators.js 157, run.js, index.js, calendar.js}` — Joi-backed validators. **Validation is a CONTROLLER concern, not a model concern** — no obligation carries a validator.

### `shared/` — the page KIT (a library, not a framework — see `docs/kit-library-not-framework.md`)
`kit.js` (100) — `journeyStrip`, `collectsFrom`, `errorSummary`, `fieldError`, `hubExitTarget`, `changeContext`/`withChangeContext`, `exitTarget`, `runTarget`, **`nextTarget`** (the whole navigation precedence chain: hub exit > change context > run sequence > `nextInSection`), `base`, `pageRoutes`, `readDate`, `dateField`. Plus `layout.njk` (60), `save-actions.njk` (14), `error-summary.njk` (5), and 3 tests (551).

### `analysis/` — model-level tooling, no browser
`reachability.js` (215) — **a dead-end prover**: enumerates scope states, scaffolds witness journeys (seeding `anyItem` and `enclosing` frame gates), proves every obligation is reachable and that no root is orphaned. `simulate.js` (15) — headless journey simulator. 2 tests (121).

### `spec/` — the machine-readable requirement
`journey-spec.json` (2,014), `conflicts.json` (378), `fixtures/happy-path.json` (126).

### `docs/` — 18 files, 3,412 LOC
`README.md` (index), `architecture.md` (223), `obligation-model.md` (327), `engine.md` (206), `flow-and-gates.md` (124), `scope-and-wipe.md` (156), `persistence.md` (240), `validation.md` (181), `features.md` (373), `testing.md` (183), `analysis.md` (87), `limits.md` (88), `decisions.md` (309), `services.md` (72), `add-a-page.md` (285), `add-a-field.md` (219), `add-a-collection.md` (260), `kit-library-not-framework.md` (6).
Root: `DESIGN-DELTA.md` (761 — **15 numbered engine divergences from the vendored obligations-v2 spike, each with carrier, backwards-compat argument and the test that proves it**), `PROVENANCE.md` (18), `TODO.md` (92), `README.md` (5).

---

## 4. Entry points

1. **HTTP / app boot** — `prototypes/standalone/index.js:7` imports `{ liveAnimals } from './live-animals/routes.js'`. `routes.js` is a single Hapi plugin registered into the frontend's prototype server (`prototypes/index.js`). Mount path from `config.js` (BASE). Run with `npm run prototype` from the frontend repo root; open `http://localhost:3000/prototype-standalone/live-animals/...`.
2. **The model, consumed** — controllers do `import * as state from '../../engine/index.js'` (a 10-export facade) and read the model through the engine only. Nothing imports `registry.js` except the engine, `flow/dispatch.js` and the contract test.
3. **Unit suite** — `npm run test:live-animals` → vitest over `prototypes/standalone/live-animals`.
4. **E2E** — `npm run test:prototype` (Playwright, needs the workspace stack up). `prototypes/e2e/live-animals.spec.js` (33 tests) + `skeleton-vs-prototype-mongo.spec.js` (the dual-journey Mongo parity pin).
5. **Headless model interrogation, no server** — `npm run dump:live-animals` → `dump.js` prints derived scope, wipe set, section statuses and submit readiness for `spec/fixtures/happy-path.json`. Plus `analysis/reachability.js` (the dead-end prover) and `analysis/simulate.js`.
6. **Reference-data capture** — `npm run capture:live-animals` → `services/_capture/capture.js`.

---

## 5. What is genuinely load-bearing here (for the later comparison layers)

Flag these to the model-comparison agents as A's candidate ASYMMETRIC capabilities — each is a fact A's model can express and evaluate:

1. **`frame: "enclosing"` / `frame: "anyItem"` cross-frame conditionality** (`engine/evaluate/predicate.js:31-69`) with the resolver-unity invariant threaded through completeness (`engine/evaluate/complete.js`). Live carriers: 7 enclosing, 2 anyItem.
2. **`notInUnionOf` — complement-by-reference** (`predicate.js:20-24`, `includesUnion`). The negated gate cannot drift from the positive gates it negates because the union is derived at runtime.
3. **`requiredOneOf` — sibling-at-least-one group mandate over a NAMED subset of a collection's item fields** (`complete.js`; DESIGN-DELTA #4). Composes orthogonally with `requiredAtLeastOne` (which counts ENTRIES).
4. **`maxEntriesFrom` — collection cardinality linked to a sibling count field** (`engine/evaluate/cardinality.js`; DESIGN-DELTA #15). Enforced in exactly one place (`appendEntryAt`).
5. **`enforcedAt: 'continue' | 'submit'` → DERIVED flow prerequisites** (`flow/prerequisites.js`). No hand-authored prerequisite graph: it falls out of flow order + dispatch index + the obligation's own fact.
6. **Collection facets in the status roll-up** (`engine/status.js`; `flow/task-rows.js:29,36`) — ONE stored collection split across TWO hub task rows without moving data.
7. **Boot-time TOTALITY guards**: dispatch coverage (every obligation at every depth collected by exactly one page) + obligation purity (source-text scan) + the commit contract test.
8. **Wipe is engine-owned and unbypassable** — no `setScope`, no per-key delete in the whole stack.
9. **The reachability prover** (`analysis/reachability.js`) — proves no obligation is unreachable and no root is orphaned, recomputed on every test run.
10. **Real persistence**: two mappers, byte-exact skeleton equivalence, amend-and-resubmit, freeze via the records adapter, session/Redis, cdp-uploader upload.

And A's honest structural GAPS (candidate places B may win):
- No i18n layer; copy is hardcoded in templates. No `locales/`.
- No `type` on an obligation; **no field-widget derivation** — every widget is re-declared page-side.
- No copy/label/hint in the model at all — CYA rows are hand-composed (`features/check-answers/controller.js`, 495 LOC of hand-written rows).
- Ownership at depth is derived, not declarable (`docs/limits.md:48-52`).
- Derived gates bake in any-in-scope semantics; mixing conditional and unconditional obligations in one section needs an authored override.
- Adding a field touches **5 places** (`docs/add-a-field.md:16`): obligations.js, controller schema, controller commit, template, CYA row (the 5th is named by a failing contract test).
- The obligation model has NO evaluator abstraction as a separable artefact — `predicate.js` is 69 LOC of `if ('equals' in …)`. Expressiveness is bounded by those 4 operators; anything more (arithmetic, multi-condition, external state) is deliberately pushed into a controller (`docs/obligation-model.md:139-143` calls this "the pressure valve").
- No coverage/whitelist test over the model. No contract.js. No formal domain module.
