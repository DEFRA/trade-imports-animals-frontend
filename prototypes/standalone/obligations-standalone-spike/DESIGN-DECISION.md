# Design decision — obligations standalone spike

This document records which of the three candidate architectures we will build,
what we grafted in from the losing candidates, and why. It was produced by
synthesising three independent judge panels over three candidate designs.

Inputs:

- `prototypes/model-spikes/obligations.md` (the paradigm document, 2090 lines)
- `prototypes/standalone/obligations-standalone-spike/obligations-catalogue.json` (514 catalogued obligations)
- `prototypes/standalone/obligations-standalone-spike/synthesis.json` (45 themes, 19 ranked e2e edges, 41 open-for-human items)

---

## 1. Chosen architecture

**Name:** `obligations-engine` (declarative obligations + pure two-evaluator engine)

**Angle:** lowest e2e risk.

**Core idea:** design outward from the three shared Playwright specs rather than
inward from the paradigm document. The routes, templates and every pinned
heading, label and button match the existing standalone spikes' observable DOM
first. The obligations engine is layered underneath, and it is real machinery,
not a facade: a portable `model/obligations.json` + `model/flow.json` pair, a
pure sync ObligationEvaluator, pure JourneyEvaluator primitives over the
Container tree, and one side-effecting orchestrator that writes fulfilments,
mints stable indexed ids, wipes data on scope exit and re-evaluates to a fixed
point per request (obligations.md lines 237–410, §The evaluation engine).

All three judge panels voted for this candidate (totals 43, 43, 42 — summed
128, against 121 for contract-graft and 116 for purest-to-doc). The deciding
evidence was ground truth: it is the only candidate whose parity claims all
survive checking against the real spec files — the `emailHeading.or(hubHeading)`
race, `getByLabel('Yes')` on Choose your cover, `exact:true` radio collisions,
the `/Add a claim|Add another claim/` vs `Add claim` button distinction, the
'Change recent claims' link and 'Claim 1' summary keys. Its build order —
register the JOURNEYS entry from the first commit, go red-to-green page by
page, land the cross-cutting guards only after the three shared specs pass —
is also the most implementable sequence for agents working incrementally.

The three parity-critical behaviours map onto genuine engine mechanisms, so the
safety does not come from faking the paradigm:

- `fullName` is the sole hard page-mandate (mandatory-fields.spec) — the
  two-dimensional mandate composition of obligations.md lines 1047–1099.
- `hadClaims` is a controlling obligation whose No answer triggers the
  scope-exit wipe, actively deleting the claims indexed fulfilments
  (invalidation.spec). Yes–No–Yes cannot rehydrate because the data is gone,
  not hidden (obligations.md lines 199, 509–522).
- The claims loop is `presentsForEach` over a user-sourced indexed obligation
  (obligations.md lines 411–498, 988–1012).

---

## 2. Module map

### Folder tree

```
prototypes/standalone/obligations-standalone-spike/
  README.md                      — paradigm in three sentences; honesty ledger; contract table
  DESIGN-DECISION.md             — this document
  routes.js                      — one Hapi plugin, flat route-table assembly, auth:false
  dump.js                        — headless EvaluationResult + status dump for a fixture   [graft]
  synthesis.json                 — (existing) scope evidence
  obligations-catalogue.json     — (existing) requirement catalogue
  model/
    obligations.json             — obligations catalogue (pure data)
    flow.json                    — Container tree Flow definition (pure data)
    skeleton-flow.json           — single-Section skeleton Flow, test fixture only
    messages.en.json             — dotted reason-code → English copy
  engine/                        — pure ObligationEvaluator (sync, zero I/O)
    evaluate.js
    scope/                       — named appliesWhen predicate functions + registry
    mandates.js
    prune.js
    reasons.js
    load-model.js
    identifiers.js               — bidirectional name↔id resolution home        [graft]
    index.js                     — doc-shaped barrel: evaluateObligations(...)  [graft]
  flow-eval/                     — pure JourneyEvaluator primitives
    container-status.js
    presents.js
    applies-when.js              — Container-level gating (Flow concern)        [graft]
    navigation/                  — first-applicable-page, first-unfulfilled-page,
                                   first-page-presenting, next-after
    journey-state.js
    index.js
  orchestrator/                  — the only side-effecting layer
    apply-answers.js
    scope-exit-wipe.js
    fulfilment-ids.js            — id minting; importable only by orchestrator  [graft]
    system-handlers.js
    fixed-point.js               — tagged as realising the unreviewed EVAL-35 sketch [graft]
    index.js
  store/
    journey-repository.js        — in-memory Map behind a repo contract; write-freeze after submit
    index.js
  journey/                       — spike-a-mirroring journey shell               [graft]
    config.js                    — BASE path, layout, template roots
    paths.js                     — hubPath, pagePath, changePath(?change=1), resolveNav
    journey-context.js           — cookie-carried journeyId, load-or-create per request
    hub-view.js                  — task-list view-model from engine status
    index.js
  contract/                      — the runtime contract barrel routes consume
    view.js  status.js  navigation.js  mutation.js  submit.js  guards.js  index.js
  validation/
    save-check.js  field-errors.js  index.js
  i18n/
    resolve.js                   — throws on unknown reason codes               [graft]
    index.js
  lib/
    fields/                      — obligation type → govuk widget dispatch
    quote/                       — pure premium computation
  routes/
    shell.js                     — start page + hub
    page.js                      — one generic GET/POST handler per presents Page
    claims.js                    — claims manage-list + add sub-page (presentsForEach)
    endings/                     — quote-summary, check-your-answers, submit, confirmation
    guard.js                     — thin pre-handler delegating to contract/guards.js
    model-endpoints.js           — GET model/obligations.json + model/flow.json (interrogation L3)
  templates/
    layout.njk  start.njk  hub.njk  page.njk  claims-list.njk  claims-add.njk
    quote-summary.njk  check-your-answers.njk  confirmation.njk
    partials/ (fields.njk, error-summary.njk)
  tests/                         — cross-cutting tiers (units are colocated *.test.js)
    reachability.test.js  alignment-walker.test.js  completability.test.js
    flow-equivalence.test.js  rename-survival.test.js  fixtures/
```

### Module roles

| #   | Module                            | Role                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `model/`                          | Portable pure-data source of truth: obligations catalogue, Flow tree, message catalogue, skeleton-Flow fixture. Exempt from the 150-line cap.                                                                                                                                                                     |
| 2   | `engine/evaluate.js`              | `evaluateObligations(obligations, fulfilments)` → EvaluationResult keyed by UUID id: inScope, mandate, per-fulfilment states (indexed only), pruned fulfilments, authored dotted reasons (obligations.md lines 262–322).                                                                                          |
| 3   | `engine/scope/`                   | Named appliesWhen predicate functions and their registry. Scoping is functions, not a rule language (obligations.md lines 205–236). Predicates take `(fulfilments, externalState)`; an in-memory external-state fixture proves the expressiveness claims at unit level.                                           |
| 4   | `engine/mandates.js`              | Engine-level mandatory/optional plus the four-row page × engine composition table; most-restrictive-wins (lines 1062–1099, 197).                                                                                                                                                                                  |
| 5   | `engine/prune.js`                 | Reconcile-on-load: drop fulfilments that no longer map to the current model, log the drops, return the amended set (lines 690–720).                                                                                                                                                                               |
| 6   | `engine/reasons.js`               | Sole author of dotted, locale-agnostic reason codes with dev-only explanations and interpolation values (lines 1795–1838, §J).                                                                                                                                                                                    |
| 7   | `engine/load-model.js`            | Parse the model JSON once at plugin registration; assert obligation-name uniqueness and the type-companion registry convention.                                                                                                                                                                                   |
| 8   | `engine/identifiers.js`           | The explicit home of bidirectional name↔id resolution. Translation happens at this boundary; evaluators only ever see ids (lines 721–761).                                                                                                                                                                        |
| 9   | `flow-eval/container-status.js`   | Four-status taxonomy (Not Applicable, Not Started, In Progress, Fulfilled) with the NA-filtered recursive roll-up pinned by the seven-row truth table (lines 1154–1238).                                                                                                                                          |
| 10  | `flow-eval/presents.js`           | Expand `presents` + `presentsForEach` into ordered slots, one per in-scope fulfilment, with per-slot mandates; read-only by absence (lines 966–1046).                                                                                                                                                             |
| 11  | `flow-eval/applies-when.js`       | Container-level gating: Sections/Pages carrying `appliesWhen` in flow.json report Not Applicable until the named condition (evaluated over ObligationEvaluator output) fires (lines 1169–1197).                                                                                                                   |
| 12  | `flow-eval/navigation/`           | The three pure rooted depth-first primitives — firstApplicablePage, firstUnfulfilledPage, firstPagePresentingObligation — plus next-after for post-POST advance (lines 1287–1319).                                                                                                                                |
| 13  | `flow-eval/journey-state.js`      | `journeyState(flow, obligationState, submitted)`: Not Started / In Progress / Fulfilled / Submitted; Fulfilled iff every top-level Section is Fulfilled (lines 1198–1211, 1424–1443).                                                                                                                             |
| 14  | `orchestrator/apply-answers.js`   | Canonicalise POST values, decode form field names (obligation name + encoded fulfilmentId) to ids, write fulfilments.                                                                                                                                                                                             |
| 15  | `orchestrator/scope-exit-wipe.js` | Actively delete out-of-scope data; spawn/drop derived fulfilments when a controlling obligation changes (lines 509–522).                                                                                                                                                                                          |
| 16  | `orchestrator/fulfilment-ids.js`  | Mint opaque stable per-row ids. Importable only by the orchestrator; a unit test asserts evaluator output never contains freshly minted ids.                                                                                                                                                                      |
| 17  | `orchestrator/system-handlers.js` | Handler registry; the one sync quote handler writes into the shared fulfilments map when its obligation enters scope, with in-flight dedupe (lines 499–508, 1881–1911).                                                                                                                                           |
| 18  | `orchestrator/fixed-point.js`     | Re-evaluate until stable within the request; yield reinterpreted as render-and-end-request. Carries a header comment tagging it as realising the unreviewed EVAL-35 "TODO review with Sam" pseudocode sketch.                                                                                                     |
| 19  | `store/journey-repository.js`     | Minimal Journey envelope `{journeyId, flowId, status, createdAt, updatedAt, submittedAt, fulfilments}` (lines 651–689) behind a thin repo contract over an in-memory Map, explicitly non-precedential; rejects all writes once submitted.                                                                         |
| 20  | `journey/config.js`               | BASE = `/prototype-standalone/obligations-standalone-spike/task-list-with-linear-tasks`; layout and template roots. Mirrors spike-a's shell so route code diffs line-for-line across paradigms.                                                                                                                   |
| 21  | `journey/paths.js`                | URL builders: hubPath, pagePath, changePath (`?change=1`), resolveNav (page id or hub sentinel → URL).                                                                                                                                                                                                            |
| 22  | `journey/journey-context.js`      | Cookie-carried journeyId; load-or-create the Journey document per request. The single seam where journey isolation lives.                                                                                                                                                                                         |
| 23  | `journey/hub-view.js`             | Task-list view-model from contract status: Email plus the six pinned task rows; per-section visibility (see §4, graft 10). No CYA hub row — CYA is reached through the Get your quote flow, matching spike-a's real hub.                                                                                          |
| 24  | `contract/`                       | The runtime contract barrel — the only surface routes touch, decomposed spike-c-style by concern (view / status / navigation / mutation / submit / guards). `contract/index.js` doubles as the interrogation Level-1 module API.                                                                                  |
| 25  | `validation/`                     | Save-time hard-mandate enforcement producing GDS error-summary view-models: `govuk-error-summary`, `#fieldId-error`, `a[href="#fieldId"]`. Server-side only — no `required` attribute, so the round trip always renders the mandated markup.                                                                      |
| 26  | `i18n/resolve.js`                 | Dotted reason code + values → messages.en.json copy. Throws on unknown keys, so a raw code can never leak into the DOM (rank-14 edge as a build-time guarantee).                                                                                                                                                  |
| 27  | `lib/fields/`                     | Obligation type → govuk widget dispatch registry: one logical input per presents slot, widgets derived from type — generator-shaped per TOOL-3..TOOL-15.                                                                                                                                                          |
| 28  | `lib/quote/`                      | Pure premium computation invoked only by the system quote handler.                                                                                                                                                                                                                                                |
| 29  | `routes/shell.js`                 | Start page + hub GET.                                                                                                                                                                                                                                                                                             |
| 30  | `routes/page.js`                  | One generic GET/POST pair over every presents Page, driven by flow.json through the contract.                                                                                                                                                                                                                     |
| 31  | `routes/claims.js`                | Claims manage-list and add sub-page. Pushed through the generic projection as far as possible; every bespoke bypass carries a comment naming the model feature it bypasses.                                                                                                                                       |
| 32  | `routes/endings/`                 | Quote summary, Check your answers (soft prompts + Change links + Accept and get quote), submit, confirmation.                                                                                                                                                                                                     |
| 33  | `routes/guard.js`                 | Thin pre-handler. All decision logic lives in `contract/guards.js` as unit-testable queries: deep-link redirect via firstApplicablePage; post-submit freeze resolving every journey route to read-only CYA. Path-scoped; landed only after the three shared specs are green.                                      |
| 34  | `routes/model-endpoints.js`       | Interrogation Level 3: auth-free GETs serving obligations.json and flow.json verbatim (lines 1666–1718; TOOL-23).                                                                                                                                                                                                 |
| 35  | `routes.js`                       | Single Hapi plugin export, registered from `prototypes/standalone/index.js` alongside spikes A–D.                                                                                                                                                                                                                 |
| 36  | `dump.js`                         | Headless JSON dump of EvaluationResult + statuses for a fixture, mirroring the other spikes' dump.js.                                                                                                                                                                                                             |
| 37  | `templates/`                      | Own namespaced Nunjucks, govuk-frontend components only; markup lifted from the pinned specs' selectors.                                                                                                                                                                                                          |
| 38  | `tests/`                          | The browserless tiers (lines 1444–1588): static reachability, model↔template alignment walker (Nunjucks rendered with neutral context, forward + reverse), bounded-enumeration completability/dead-mandate checks, skeleton-Flow equivalence script-runner (canonical values only), and the rename-survival test. |

**Module count: 38.**

### Contract surface

The contract barrel exposes (concern file in brackets):

1. `evaluate(journey)` — run both evaluators over `(model, journey.fulfilments)`; returns `{ obligationState, fulfilments (pruned), containerStatuses, journeyState }`. The one entry point every route calls per request. [status]
2. `hubViewModel(evaluation)` — Email + six pinned task rows with engine-derived tags and entry hrefs. [view]
3. `pageViewModel(pageId, evaluation, errors?)` — presents/presentsForEach expanded into ordered govuk widget view-items with pinned labels, prefill and GDS error wiring. [view]
4. `cyaRows(evaluation)` — summary-list rows including per-claim 'Claim 1..n' rows and 'Change recent claims' accessible names; rows drop when scope wipes. [view]
5. `checkSave(pageId, payload, evaluation)` — hard-mandate save-time gate returning `{ ok, errorSummary, fieldErrors }`. [mutation → validation]
6. `applyAnswers(journey, pageId, payload)` — write, wipe on scope exit, re-evaluate to fixed point, persist. [mutation]
7. `addFulfilment(journey, obligationName)` / `removeFulfilment(journey, obligationName, fulfilmentId)` — claims loop; opaque stable ids. [mutation]
8. `nextAfter(pageId, evaluation)` — post-POST advance: next applicable non-Fulfilled page in the Section subtree, else hub. [navigation]
9. `sectionEntry(sectionId, evaluation)` — sectionEntryMode resolution with the null fallback for fully-Fulfilled Sections (lines 1320–1351). [navigation]
10. `firstApplicablePage` / `firstUnfulfilledPage` / `firstPagePresentingObligation` — the bare primitives, also exported plain for interrogation Level 1. [navigation]
11. `changeTarget(obligationName)` — Change-link href + `?change=1` return-to-CYA mode (lines 1394–1410). [navigation]
12. `guardPage(request, evaluation)` — deep-link and post-submit routing decision as a pure query: null (allow) or a redirect target. [guards]
13. `journeyState(evaluation)` / `canSubmit(evaluation)` — lifecycle state and the Accept-and-get-quote gate. [status]
14. `submit(journey)` — server-side re-check of Fulfilled (never trusting the button); on pass flip status + `submittedAt`; on fail return the stale-recheck result so CYA re-renders with the missing items called out (rank-4 edge, first-class). [submit]
15. `resolveReasons(reasons)` — dotted codes + values → English copy; throws on unknown keys. [view → i18n]
16. `modelJson()` — verbatim obligations.json / flow.json for the Level-3 endpoints. [index]

### Model files

- **`model/obligations.json`** — one record per user-submitted field plus the
  system-handled quote-result obligation. Each record: pre-generated committed
  UUID `id` (sole persistence key, never rendered), unique meaningful `name`
  (the form-input/template/i18n binding string, uniqueness asserted at load),
  open-ended `type`, `cardinality` single|indexed, `indexedBy {source,
mutability}` for claims (user, edit-add-remove) and the derived follow-ups
  (derived, edit-only), constraints, and bundled static option lists. No page
  membership, no mandate status, no presentation, and **no scoping** — scoping
  is computed by the evaluation engine, not declared on the obligation
  (obligations.md line 196).
- **`model/flow.json`** — the recursive Container tree of Sections and Pages
  referencing obligations by id (lines 929–965): ordered `presents
[{obligation, mandate?}]` (fullName the only hard mandate) and/or
  `presentsForEach` (claims), 1:1 page-to-template keys, exact pinned
  headings/labels/buttons as authored copy, Flow-level `sectionEntryMode`,
  Container-level `appliesWhen` names for gated Sections (email gate, claims,
  Get your quote), and CheckYourAnswers as a top-level construct outside the
  tree. Labelled provisional per open Container-schema questions (OPEN2-1,
  OPEN2-2, ARCH-22).
- **`model/messages.en.json`** — English copy keyed by the evaluator's dotted
  reason codes (codes double as i18n keys; Welsh would be a drop-in sibling).
- **`model/skeleton-flow.json`** — single-Section skeleton Flow over the same
  obligations, same schema; data-only fixture for the cross-Flow equivalence
  harness (lines 1494–1555). Never mounted as routes.

### Scoping placement (judge-flagged conflict, resolved)

Two judges flagged opposite defects here, so we pin the split explicitly:

- **Obligation scoping** (in-scope/out-of-scope, mandate, reasons) is computed
  by the ObligationEvaluator via named predicate functions registered in
  `engine/scope/`. It is not declared on obligation records (fixes this
  candidate's original `scopeWhen`-on-the-record, which brushed against
  obligations.md line 196: "Scoping … NOT on the obligation") and it is not
  read from flow.json (which was contract-graft's defect: feeding the
  Service-scoped, Flow-ignorant evaluator from Flow data).
- **Container gating** is a Flow concern: `appliesWhen` names live on Sections
  and Pages in flow.json and are resolved by the JourneyEvaluator against
  ObligationEvaluator output (`flow-eval/applies-when.js`), per the catalogue's
  "gated Sections carry appliesWhen" (STATUS-7, OPEN2-5, OPEN2-6).

---

## 3. How each synthesis theme is handled

The 45 themes in synthesis.json split implement / reduce / defer as the
synthesis itself scoped them; this design changes none of the scope verdicts,
only where they land. Themes are referenced by name (the earlier candidate
draft used numbers, which one judge flagged as off-by-one).

### Implement (built fully, on the parity path)

| Theme                                                                  | Where it lands                                                                                                                                                                  | Representative ids            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Portable declarative obligations catalogue                             | `model/obligations.json` + `engine/load-model.js`                                                                                                                               | DEF-2, ARCH-8, SHAPE-5        |
| Dual identifiers: opaque UUID id vs meaningful name                    | model + `engine/identifiers.js` + `tests/rename-survival.test.js`                                                                                                               | SHAPE-6, PERSIST-24, SHAPE-11 |
| Container tree schema and runtime representation                       | `model/flow.json` + flow-eval; picks labelled provisional                                                                                                                       | DEF-23, ARCH-23, OPEN2-1      |
| Page presents model and presentsForEach projection                     | `flow-eval/presents.js`                                                                                                                                                         | ARCH-24, ARCH-25, ARCH-31     |
| Two-dimensional mandates, save-time enforcement, completion policy     | `engine/mandates.js` + `validation/`; unexercised table rows unit-only                                                                                                          | FLOW-1..FLOW-8, ARCH-37       |
| EvaluationResult contract and authored reason codes                    | `engine/evaluate.js` + `engine/reasons.js` + `i18n/`                                                                                                                            | EVAL-10..EVAL-16, OPEN1-8     |
| Cardinality and fulfilment identity                                    | fulfilments map + `orchestrator/fulfilment-ids.js`                                                                                                                              | DEF-12, INDEX-1, FULF-9       |
| Indexed and derived fulfilment lifecycle (spawn, wipe, no rehydration) | `orchestrator/scope-exit-wipe.js` — the Yes–No–Yes parity mechanism                                                                                                             | FULF-8, INDEX-19, INDEX-21    |
| Unified fulfilments store and vocabulary                               | store shape + naming discipline (Fulfilled/Submitted, never Complete)                                                                                                           | DEF-38, OPEN1-22, SHAPE-21    |
| Pure two-evaluator engine plus side-effecting orchestrator             | `engine/` + `flow-eval/` + `orchestrator/`                                                                                                                                      | DEF-X2_1, EVAL-5, ARCH-9      |
| Model-change tolerance: reconcile-on-load pruning                      | `engine/prune.js`, thin (filter, write back, log)                                                                                                                               | PERSIST-15..17, EVAL-19       |
| Journey document and store                                             | `store/journey-repository.js`, envelope verbatim, derived state recomputed                                                                                                      | FULF-1, PERSIST-5, PERSIST-2  |
| Submit lifecycle and post-submit freeze                                | `contract/submit.js` + repo write-block + `contract/guards.js` (rank-1 edge)                                                                                                    | SUBMIT-4..9, NAV-37           |
| Journey lifecycle states and Submit gating                             | `flow-eval/journey-state.js`                                                                                                                                                    | NAV-33..35, DEF-30            |
| Check your answers: change links, gating, soft prompts                 | `changeTarget` + `?change=1` + stale-recheck submit (rank-3, rank-4 edges)                                                                                                      | NAV-16, NAV-26..30, STATUS-34 |
| Deterministic navigation primitives                                    | `flow-eval/navigation/` (rank-2, rank-7 edges)                                                                                                                                  | NAV-1..6, EVAL-24..26         |
| Section entry modes                                                    | `sectionEntry` + flow.json config (rank-8 edge)                                                                                                                                 | NAV-8, NAV-9, NAV-13          |
| POST lifecycle and page advancement                                    | `nextAfter` + `applyAnswers`                                                                                                                                                    | STATUS-30, EVAL-31            |
| Rendering dispatch and presentation containment                        | `lib/fields/` registry + Flow-furniture rule                                                                                                                                    | SHAPE-2, ARCH-32              |
| Task List hub rendering, NA visibility and signposting                 | `journey/hub-view.js`; hide/signpost branch unit-only                                                                                                                           | DEF-26, STATUS-14, STATUS-22  |
| Status taxonomy, Fulfilled derivation and propagation                  | `flow-eval/container-status.js` + seven-row truth table (rank-6 edge)                                                                                                           | STATUS-2..6, STATUS-15..20    |
| Layered browserless test tiers                                         | `tests/` + colocated units                                                                                                                                                      | TEST-1, TEST-2, TEST-7..14    |
| Interrogation ladder Levels 1 + 3                                      | contract barrel + `routes/model-endpoints.js` (rank-17 edge); Levels 2 and 4 deferred per TOOL-25's own sequencing (TOOL-22's tim-CLI wrap would breach spike self-containment) | TOOL-21, TOOL-23              |

### Reduce (real mechanism, shrunk inputs — never faked)

| Theme                                    | Reduction                                                                                                                                                               | Representative ids         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Service / Flow / Journey layering        | one Service, one Flow, one JS evaluator set; multi-Flow shown structurally (id-referencing, evaluators parameterised on (model, state)) plus the skeleton-flow fixture  | DEF-17..20, ARCH-13..15    |
| indexedBy taxonomy (source × mutability) | user + derived implemented; `seeded` stays a validated schema value with a unit-level fake seed                                                                         | INDEX-4..15, FULF-13       |
| Open type space and kind-collapse        | open `type` field, canonical-form storage, only the journey's types used                                                                                                | SHAPE-13, FLOW-17..24      |
| System-handled obligations               | one in-process, synchronously resolved quote handler through the real registry + shared-map write (rank-16 edge)                                                        | DEF-16, EVAL-8, OPEN1-21   |
| Scoping-rule expressiveness              | named predicates + injected in-memory external-state fixture, unit tests only                                                                                           | SHAPE-29, EVAL-40, FULF-16 |
| Fixed-point orchestration loop           | loop shape kept; converges immediately per request; yield = render-and-end-request; EVAL-35 tag                                                                         | EVAL-33, EVAL-36, FLOW-33  |
| Blocked-work-as-NA                       | appliesWhen-to-NA fully built (email gate, claims, quote gating); async blockers as synchronous stand-ins in unit tests (rank-9 edge)                                   | STATUS-7, OPEN2-5, OPEN2-6 |
| Staleness                                | store shape avoids precluding per-record metadata; no mechanism, per the doc's own deferral (lines 1839–1880)                                                           | DEF-15, FULF-19, OPEN1-16  |
| Escape routes and contextual Back        | change/source query param, no referrer history; affordances match existing DOM only                                                                                     | STATUS-25, NAV-31          |
| Resume shortcut                          | firstUnfulfilledPage implemented and tested; widget deliberately unrendered (parity forbids new hub chrome)                                                             | STATUS-26, NAV-15          |
| Cross-Flow evaluator-equivalence harness | script-runner + skeleton fixture diffing canonical fulfilment values; demonstrated structurally, not proven — the writeup says so                                       | ARCH-3, TEST-16..30        |
| Datastore decision                       | repository contract over in-memory Map, framed non-precedential so the urgency is not defused                                                                           | SUBMIT-1..3, PERSIST-10    |
| Code-generation pipeline                 | no generator built; hand-written templates/routes obey the generator-shaped mapping conventions — the spike is the hand-built reference implementation TOOL-28 asks for | TOOL-1..TOOL-15, TOOL-28   |

### Defer (logged in the README, zero code)

| Theme                                                              | Why deferral costs nothing                                                                                          | Representative ids        |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Post-submit lifecycle extensions                                   | only the freeze ships; amendment/PDF/withdrawal/events have no counterpart in the mirrored journeys                 | SUBMIT-11..16, NAV-38     |
| Audit trail and deterministic replay                               | pure recompute-on-load keeps replay architecturally possible                                                        | EVAL-39, EVAL-41, OPEN1-7 |
| Model evolution and rename open items                              | one hand-authored model version; ids stay stable and unexposed                                                      | PERSIST-21, PERSIST-35    |
| Deferred evaluator and record extension points                     | signature stays bare until real config exists, per the doc's own gate (lines 1765–1794)                             | EVAL-9, OPEN1-15          |
| Deferred indexed machinery: seeding, recovery, hybrids, references | nothing external exists to seed from; nothing can fail in-process                                                   | INDEX-10, INDEX-16..18    |
| Deferred renderer/UX affordances and navigation generality         | primitives already accept arbitrary root Containers, so engine-side generality is free                              | STATUS-10, OPEN2-17..22   |
| Orchestrator failure policies                                      | the split leaves an opaque slot for a later policy field                                                            | OPEN2-23, OPEN2-24        |
| Spike A–D retrofit commentary                                      | documentation context, not modules                                                                                  | FLOW-29..32               |
| Meta-goals and human review checkpoints                            | the spike as a whole is the evidence artefact; the EVAL-35 tag routes the orchestrator into the Sam review as input | DEF-X2_3, EVAL-35         |

---

## 4. Grafts from the runners-up

Each graft is attributed to the losing candidate it came from and the judge(s)
who called for it.

From **"obligations two-evaluator engine" (purest-to-doc)**:

1. **`engine/identifiers.js`** — an explicit, named home for bidirectional
   name↔id resolution at the runtime boundary; evaluators only ever see ids.
   Resolves the open_for_human item "no obligation says which component owns
   name-to-id resolution" (FULF-5, FULF-15, DEF-10). (Judge 1.)
2. **Honesty ledger and provisional labels** — the README carries a
   per-reduction honesty ledger (mechanism kept, inputs shrunk, never faked),
   and every provisional settlement of a doc contradiction (multi-tab vs
   pinned URLs, optional-only-page NA-vs-Fulfilled, email-gate journey-state
   counting) is labelled in code comments and the writeup. (Judges 1, 2, 3.)
3. **Stale-recheck branch as first-class contract behaviour** —
   `contract/submit.js` returns a distinguishable stale-recheck result so CYA
   re-renders with missing items called out (rank-4 edge; STATUS-X1_5).
   (Judge 1.)
4. **Enforced determinism seam** — `orchestrator/fulfilment-ids.js` is
   importable only by the orchestrator, with a unit test asserting evaluator
   output never embeds freshly minted ids (open item on DEF-3 vs FULF-8).
   (Judges 1, 2, 3.)
5. **Injected external-state fixture** in `engine/scope/` unit tests, proving
   the quantifier/interval/external-state expressiveness claims. (Judge 1.)
6. **EVAL-35 tag on `orchestrator/fixed-point.js`** — a header comment
   marking it as realising the unreviewed "TODO review with Sam" pseudocode
   sketch, so the human review treats it as input, not fait accompli.
   (Judges 1, 3.)
7. **Throwing i18n resolver** — `i18n/resolve.js` throws on unknown reason
   codes, turning the rank-14 no-leaked-codes edge into a build-time
   guarantee. (Judge 3.)
8. **Doc-shaped barrel narrative** — `engine/index.js` reassembles
   `evaluateObligations(obligations, fulfilments) → EvaluationResult` as one
   readable call, and we accept a slightly-over-150-line engine file rather
   than smearing the prune/derived/mandate interplay across five files (the
   spike-c REFACTOR-NOTES lesson). (Judges 2, 3; also judge 1 via
   contract-graft.)
9. **Generic-renderer discipline** — claims, quote and CYA are pushed through
   the model-driven page projection as far as possible before conceding a
   bespoke template; every special-cased page carries a comment naming the
   model feature it bypasses, partially recovering the demonstration score
   this candidate traded away. (Judge 2.)

From **"contract-graft" (closest-to-contract)**:

10. **Per-section hub visibility, matching spike-a's real baseline** — 'Get
    your quote' is always visible and inert ('Cannot start yet' style) rather
    than doc-default NA-hidden, with the open_for_human item 3 citation
    (STATUS-22, OPEN2-X2_1); addon-dependent rows appear only after
    selection. This replaces the winner's original blanket always-visible
    override, which over-showed the addon rows and overstated the baseline.
    Documented as a parity-driven deviation from NA-hiding. (Judges 1, 3.)
11. **Guards as unit-testable contract queries** — `contract/guards.js` owns
    the deep-link and post-submit routing decisions as pure functions;
    `routes/guard.js` is a thin, path-scoped pre-handler landed only after the
    shared specs are green. Directly de-risks the winner's own last-listed
    risk. (Judges 1, 2.)
12. **`journey/` shell mirroring spike-a** — config.js, paths.js, hub-view.js,
    journey-context.js (the load-or-create cookie seam as its own module),
    plus `dump.js`, so reviewers can diff route and shell code line-for-line
    across all five spikes. Comparability is the point of the exercise.
    (Judges 1, 3.)
13. **Rename-survival unit test** — rename an obligation `name` while
    fulfilments stay keyed by UUID; the flagship dual-identifier proof.
    (Judges 1, 3.)
14. **README contract table and IP framing** — a table mapping the obligations
    vocabulary onto the spike-a/c concern taxonomy
    (shape/view/status/navigation/mutation/validation/submission), plus an
    explicit statement that the engine, not the contract, is the advertised
    IP. (Judge 2.)
15. **Pending specs for open human rulings** — new specs for post-submit
    freeze scope, early CYA access and mandate-composition parity are written
    but marked pending the flagged rulings, turning open_for_human items into
    executable questions. (Judge 2.)
16. **appliesWhen gating in flow.json** — Container gating declared Flow-side
    and resolved by the JourneyEvaluator, replacing the winner's
    `scopeWhen`-on-the-obligation-record (see §2, Scoping placement). This
    also avoids contract-graft's own defect of feeding the Service-scoped
    evaluator from Flow data. (Judge 3, with judge 1's counter-flag resolved.)

---

## 5. Rejected alternatives

### "Obligations engine behind the proven contract" (contract-graft) — closest-to-contract

**Fair summary.** Keep everything the four existing spikes proved — thin Hapi
route registrars, the journey shell, one-partial-per-page templates, and a
single contract object grouped by the spike-a/c concern taxonomy — and swap
only the model and the runtime behind the contract. Route code reads almost
line-for-line like spike-a's, minimising risk to the parity-pinned
route/template layer. The most conventional design, with a complete theme
mapping and verified spike-a claims.

**Why rejected.** Scores: 42, 39, 40 (summed 121). Zero winner votes. It fails
the demonstration axis on its own admission: wrapping the engine in
spike-a-shaped contract keys (`tasks`/`nextPage`/`validate`) so route code
reads like the old paradigm hides exactly what a paradigm-comparison spike
exists to show — judge 1 scored demonstration 6/10 and noted "its own first
risk concedes this". It also carried the one outright doc violation (scope
predicates referenced by name from flow.json, feeding the Service-scoped,
Flow-ignorant ObligationEvaluator from Flow data), and two verified parity
wrinkles: the quote handler fired inside `submit()` when the spec renders
'Your quote' and clicks 'Accept and continue' **before** CYA and submit
(judge 2), and a CYA-as-hub-task-row that spike-a's real hub-view-model does
not produce (judges 2, 3). Its best assets — the journey shell, dump.js, the
contract table, guard-as-query, the rename-survival test — are grafted in
(§4, items 10–16).

### "obligations two-evaluator engine" (purest-to-doc)

**Fair summary.** Transcribe the doc into code with as little interpretation
as possible: the two portable data artefacts verbatim, the exact
three-component engine split, one generic pageView renderer driven entirely by
flow.json so parity is a model-authoring exercise, and the fullest
theme-by-theme honesty arguments. The best demonstration of the paradigm
(judge scores 9, 9, 10 on that axis) and the most complete transcription.

**Why rejected.** Scores: 40, 38, 38 (summed 116). Zero winner votes. Its
architecture concentrates parity risk exactly where the hard gate sits:
e2e-risk scored 6, 5 and 5 across the three panels. One generic renderer must
reproduce structurally bespoke pages ('Claims you have added', 'Your quote',
CYA), so a single slot-expansion bug breaks every page at once; its doc-default
NA-hiding hubView would delete the pinned 'Get your quote' task link (the
parity-breaking default that open_for_human item 3 flags); it adds the same
forbidden CYA hub row; the engine-driven advance rule needs an invented
forward rule for already-Fulfilled pages before the happy path can pass; and
the whole engine-mandate set must be reverse-engineered before anything
renders — a big-bang shape agents cannot verify incrementally (implementability
7, 7, 7). Judge 2 also noted it showed "zero grounding in the actual spec
selectors". Its best assets — identifiers.js, the honesty ledger, the
determinism seam, the EVAL-35 tag, the throwing resolver, the barrel
discipline — are grafted in (§4, items 1–9).

---

## 6. Risks accepted

Carried over from the winning candidate's own register, plus synthesis
residue:

1. **Accessible-name parity traps** remain the top e2e killer: 'Change recent
   claims' visually-hidden text, exactly one 'Yes' label on Choose your cover
   (govuk conditional reveal), `exact:true` radio collisions on Driving
   history, 'Add a claim|Add another claim' vs 'Add claim' as distinct
   buttons, unambiguous Day/Month/Year labels. Mitigation: build in spec
   order, red-to-green, with the alignment walker as insurance.
2. **Model-carried copy is a single point of failure**: a presents-expansion
   bug breaks all pages at once. The alignment-walker tier mitigates but is
   itself new code.
3. **Claims manage-list furniture** may pull glue into `routes/claims.js` that
   bends the projection mechanism. Accepted, with the graft-9 discipline
   (comment every bypass) as the honesty control.
4. **Quote timing**: the sync system handler must fire when its obligation
   enters scope during the fixed-point pass, not at submit. Pinned by a unit
   test on the in-scope trigger.
5. **Parallel Playwright workers vs one in-memory Map**: a cookie-scoping
   mistake bleeds state across tests as intermittent flake. The
   journey-context seam is the single audited entry point.
6. **The engine-mandatory set must be reverse-engineered** from the existing
   journey's completion behaviour before flow.json is complete (open_for_human
   item 4); a wrong mandate shows up as wrong hub tags or wrong quote gating.
7. **Yes–No–Yes wipe on the change-mode path**: if any POST path skips the
   orchestrator, invalidation fails only on the second round trip. Unit-tested
   specifically on the `?change=1` path.
8. **Open human rulings block three new specs** (post-submit freeze scope,
   early CYA access, mandate-composition parity). Written but marked pending
   (graft 15); the shared specs do not depend on them.
9. **Doc contradictions are settled provisionally**, not resolved: multi-tab
   isolation vs pinned URLs (FULF-2 vs STATUS-X1_5), optional-only-page NA vs
   vacuously Fulfilled (STATUS-3/STATUS-11), email-gate journey-state
   (NAV-33 vs NAV-34). Each pick is labelled provisional (graft 2).
10. **The fixed-point orchestrator is demonstrated in degenerate form** (one
    sync handler, immediate convergence). Accepted for a stateless
    request/response app; the EVAL-35 tag routes it into human review.

---

## 7. Framing

This spike is a **gated throwaway prototype**. It exists to produce one
comparable data point in the paradigm comparison alongside spikes A–D
(declarative selectors, statechart, rules engine, schema-first) — precise
enough to judge paradigm fit, never to be productionised. Nothing in it sets
precedent: the in-memory Map is not a datastore decision (that is flagged
urgent and belongs to decision-makers with Defra-wide input), the orchestrator
realises an unreviewed sketch, the Container schema picks are provisional, and
the code is disposable once the comparison writeup has consumed it. The engine
— not the contract, not the routes — is the artefact under evaluation.
