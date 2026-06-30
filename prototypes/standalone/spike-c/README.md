# Spike C — standalone (requirement-graph rules engine)

A **fully self-contained, flattened** copy of one car-insurance "get a quote"
journey, built for readability. It shares **nothing** with the other spikes or
with the original prototypes (only the `govuk-frontend` framework is shared):
there is no generic `buildVariant`, no contract-blackbox indirection and no shape
registry. The single grouped journey (a task list whose tasks are short linear
runs) is spelled out directly in this folder.

This is a **gated throwaway prototype**. It exists to compare journey-model
paradigms, not to ship. It mounts behind the standalone prototype harness at
`/prototype-standalone/spike-c/task-list-with-linear-tasks` (the exported Hapi
plugin is `spikeC` in `routes.js`, registered as `standalone-spike-c`).

## The paradigm in three sentences

The **source of truth is split in two**: a typed answer-data model,
`model/fields.json` (flat fields, each with a `type` + constraints + which step
presents it), and a separate rules layer, `model/rules.json` (require / min-age /
lte rules, each carrying an **authored `reason`**). A **requirement-graph engine**
(`runtime/engine/`) folds the two together into a per-answers snapshot — which
fields are required, which steps are live, and _why_ (the authored `because`) —
and a thin **contract** (`runtime/contract/`) exposes that snapshot as the reads
the routes need (view, status, navigation, mutation, assembly). No code lives in
the model; a non-JS consumer could read the same two files.

The one-line mental model: **the model is data (fields + rules); the engine
derives required-ness and authored provenance from it; the contract is a thin
read; the routes are plumbing.**

## The signature: decompose the glue, keep the engine readable

The structural choice that defines this spike is an **asymmetry**. The engine —
where required-ness and the authored `because` reasons are derived — is the IP and
is kept as one readable story (`runtime/engine/evaluation.js` builds the snapshot;
`runtime/engine/missing-required.js` reads it into "what is still required and
why"). Everything else — the `contract/` reads, the route handlers — is treated as
plumbing and decomposed by concern into small thin modules. Read the engine to
understand the paradigm; the contract is mechanical.

The provenance is the showcase. A conditional requirement's reason is **authored
once** in the rule (`model/rules.json` `reason`) and surfaced verbatim as
`because` by `runtime/engine/missing-required.js` — it is a first-class output,
not synthesised from the condition shape. That is the difference from spike-a,
where the reason is _derived_ from the `{ field, eq }` condition data.

## Folder and file map

Each line names what the module _owns_. Logic files are small (≤ ~128 lines —
the smallest max-logic-file of the four spikes); the only large file is the
declarative `lib/sections` catalogue, kept whole on purpose.

### `model/` — the source of truth (portable data, no code)

- `model/fields.json` — the **typed answer-data model**: `steps[]` (id, title,
  optional `kind` of `loop`/`subtasks`, `done`/`arrayKey` for loops, `itemsFrom`
  for option steps) and a flat `fields{}` map keyed by field id, each
  `{ step, type, required?, min?, max?, pattern?, options? }`. `required: "always"`
  is the only _unconditional_ requirement expressed here. Plus regex `patterns`.
- `model/rules.json` — the **rules layer**, separate from the data model:
  `rules[]` of three kinds — `require` (conditional requiredness: a `when`
  condition plus either `require: [fieldId]` or `appliesStep`, with an authored
  `reason`), `min-age` and `lte` (holistic business assertions, also with authored
  `reason`).

### `runtime/` — the adapter (the paradigm's IP — the part worth reading)

- `runtime/model.js` — loads both JSON files through `fs` (not `import`, to keep
  the data/adapter split honest) and exposes `steps`, `fields`, `patterns`,
  `rules`, `stepById`.
- `runtime/engine/evaluation.js` — **the engine core**. `evaluate(answers)` folds
  the rules + the data model into a memoised snapshot
  `{ requiredByField, liveStepReasons, satisfied }`: `alwaysRequiredFields()`
  seeds `requiredByField` from every `required: "always"` field (no reason);
  `accumulateRuleEffects()` folds in each firing `require` rule, pushing its
  authored `reason` onto the required field or the live step.
- `runtime/engine/missing-required.js` — the read side of the snapshot:
  `applicableSteps` (steps that currently apply — normal steps always, loops only
  when a rule made them live), `requiredFieldsOfStep`, and `missingRequired` —
  each unsatisfied requirement as `{ stepId, fieldId, because: [{ reason }] }`,
  the authored-provenance showcase — plus `missingRequiredErrors`.
- `runtime/engine/assertions.js` — `assertionErrors`: the holistic `min-age` /
  `lte` rules, each error message being the rule's authored `reason`.
- `runtime/engine/index.js` — barrel re-exporting the engine surface.
- `runtime/contract/view.js` — `fieldsFor(stepId)` (the field specs of a step,
  with `required` from the `"always"` flag and `requiredWhen` mapped from a
  matching `require` rule's `when`) and `viewItems` (option lists for radio/multi).
- `runtime/contract/status.js` — `status` (per-step complete/partial/not-started,
  a dispatcher over loop / subtasks / field steps) and `allComplete`.
- `runtime/contract/navigation.js` — `next`/`prev`: a thin consequence of step
  order within the current task group, filtered to the live steps.
- `runtime/contract/mutation.js` — `collect` (normalise a step's payload from the
  model) and `applyAnswer` (merge, then cascade-clear any step that stopped
  applying).
- `runtime/contract/assembly.js` — `assembleQuote` (whole-object validate using
  the engine's authored-reason `missingRequiredErrors` + `assertionErrors`, plus
  the shared `transform`) and `validate` (page-slice validation derived from the
  field constraints via the shared `page-validator`).
- `runtime/contract/index.js` — assembles the single `contract` object (see "The
  contract surface" below).

### `journey/` — the journey shell (specialised to the one shape we ship)

- `journey/config.js` — `BASE` mount path, `LAYOUT`/`TEMPLATES` roots, and the
  literal `grouped` task-group shape (a hub of three tasks, each a short linear
  run).
- `journey/paths.js` — URL building (`hubPath`, `addonStepPath`, `breadcrumbs`,
  `pathForStep`) and `resolveNav` (turns a contract `next`/`prev` result — a step
  id or a `{ terminal }` sentinel — into a real URL).
- `journey/hub-view.js` — `hubViewModel`: the task-list presentation, status tags
  per task and per group, all from `contract.status` / `contract.allComplete`.
- `journey/index.js` — barrel for the shell.

### route registrars — thin Hapi route builders (one concern each)

- `shell-routes.js` — the start page + the task-list hub.
- `section-routes.js` — the generic question pages: one GET/POST pair per plain
  (non-`loop`, non-`subtasks`) step. Every decision — page-slice validation, the
  answer cascade, option lists, Back/Save — comes from the `contract`.
- `claims-routes/` — the conditional claims add-another loop (`handlers`,
  `view-models`, `index`).
- `addons-routes/` — the add-on subtask fan-out (`handlers`, `navigation`,
  `view-model`, `index`).
- `endings-routes/` — the closing pages: quote summary, check your answers (the
  interesting one — soft prompts with authored provenance on load, hard assemble
  on submit) and confirmation (`handlers`, `view-models`, `paths`, `index`).
- `routes.js` — assembles every registrar into the one exported Hapi plugin
  (`spikeC`).

### `lib/` — duplicated helpers, each pointed at this folder

- `lib/conditions.js` — `evalCondition` (does a `{ field, eq }`/`{ all }`/`{ any }`
  condition hold?) and `provenance` (flatten to leaf entries). The engine uses
  `evalCondition` to decide whether a rule fires.
- `lib/fieldutil.js` — leaf helpers: `isEmpty`/`isSatisfied` (completeness),
  `humanize` (field id → label for derived messages), `ageInYears`.
- `lib/page-validator/` — page-slice validation **derived from declared field
  constraints**: `index.js` `makePageValidator` (used by `contract.validate`),
  `schema-builders.js` (`SCHEMA_BUILDERS` — per-type Joi base schemas:
  `numberSchema` reads `min`/`max`, etc.), `custom-field-errors.js`.
- `lib/assembler/` — whole-object validate + transform: `index.js` `makeAssembler`,
  `transform.js` (`toDomain` field coercion), `errors.js`, `business-rules.js`.
  Spike C wires it with **empty** provenance/rules — it supplies its own
  authored-reason errors from the engine.
- `lib/validate/` — the standalone Joi factories grouped by field family behind a
  barrel (`date-of-birth/`, `numeric`, `currency`, `contact`, `text`,
  `run-payload`). Used by the section catalogue's (vestigial — see the note)
  `schema` entries.
- `lib/field-view/` — the field-view engine (`to-view/*` spec → GOV.UK macro args,
  `collect`, `errors`) used by the **claims / add-on** pages, not the generic
  section page (which hand-renders its inputs in a per-step partial).
- `lib/sections/` — `definitions.js` (the **presentation catalogue**: per-section
  `rows(quote)` for Check Your Answers, plus legacy `schema`/`collect`/`isComplete`
  carried over from the shared origin) and `index.js` (query helpers:
  `sectionBySlug`, `hasOwnRoutes`, `applicableSections`, `answerRows`).
- `lib/addons/` — the add-on catalogue + state/view (`catalog`, `state`, `view`,
  `index`).
- `lib/store.js` / `lib/quote.js` / `lib/premium.js` / `lib/claims.js` — the quote
  store, reference data + formatters, premium calc, claims helpers.
- `lib/data/quotes.json` — this spike's own quote store (generated).

### `templates/` — this spike's own Nunjucks

- `templates/layout.njk`, `start.njk`, `hub.njk`, `section-page.njk`,
  `check-your-answers.njk`, `quote-summary.njk`, `confirmation.njk`, the claims +
  add-on pages, and `partials/<step>.njk` — **one partial per step**, which
  hand-renders that step's inputs (the section page `{% include %}`s the partial
  by `section.slug`; the vehicle step slug is `your-vehicle`).

### `dump.js`

- `dump.js` — headless JSON dump of the journey state for a fixture
  (`node prototypes/standalone/spike-c/dump.js with-claims`).

## The contract surface

`runtime/contract/index.js` exports one `contract` object. It is the whole
adapter API; routes consume nothing else from the runtime. The keys, grouped by
concern (the concern module each lives in is named):

| Concern       | Keys                                              | What they do                                                                                                                                        |
| ------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape         | `steps`, `firstStep`                              | The step id order and the first step. From `index.js` (model reads).                                                                                |
| View          | `stepTitle`, `stepKind`, `fieldsFor`, `viewItems` | Title, kind (`loop`/`subtasks`/`undefined`), field constraints (with rule-derived `requiredWhen`), and option lists. From `view.js` (+ `index.js`). |
| Applicability | `applicableSteps`                                 | The step ids that apply for the current answers (loops only when a rule made them live). From the engine via `index.js`.                            |
| Status        | `status`, `allComplete`                           | Per-step status tag and whole-journey completeness. From `status.js`.                                                                               |
| Navigation    | `next`, `prev`                                    | The next/previous step id (or a `{ terminal }` sentinel) within the current task group. From `navigation.js`.                                       |
| Provenance    | `missingRequired`                                 | Each still-missing required field/step with its **authored** `because` reasons. From the engine (`missing-required.js`).                            |
| Mutation      | `collect`, `applyAnswer`                          | Normalise a step's payload; merge + cascade-clear. From `mutation.js`.                                                                              |
| Validation    | `validate`                                        | Page-slice `{ ok, errors, errorSummary }` derived from field constraints. Is `assembly.js`'s `validateStep`.                                        |
| Assembly      | `assembleQuote`                                   | Whole-object validate (authored-reason errors) + transform → `{ ok, quote, errors }`. From `assembly.js`.                                           |
| Add-ons       | `getSelectedAddons`                               | The selected add-on values.                                                                                                                         |

**How routes consume it.** `section-routes.js` is the clearest example: its `GET`
renders with `contract.stepTitle` / `contract.viewItems`; its `POST` calls
`contract.validate(stepId, payload)`, and on success `contract.applyAnswer(...)`
then redirects via `resolveNav(updated, contract.next(updated, stepId, grouped))`.
The Back link comes from `contract.prev(...)`. `endings-routes/view-models.js`
uses `contract.applicableSteps` + `contract.missingRequired` (the latter's
authored `because` becomes the soft-prompt reason text) on load and
`contract.assembleQuote` as the hard gate on submit. No route reads `fields.json`
or `rules.json` directly — they only talk to the contract.

## Data flow for one request

A `POST` of the vehicle page, `POST /prototype-standalone/spike-c/task-list-with-linear-tasks/{id}/your-vehicle`:

1. **URL → route.** `section-routes.js` registered this path because
   `contract.stepKind('your-vehicle')` is `undefined` (a plain step).
   `postHandler('your-vehicle')` runs, loading the quote from `lib/store.js`.
2. **Route → contract (validate).** `contract.validate('your-vehicle', payload)`
   → `runtime/contract/assembly.js`'s `makePageValidator`. It reads the step's
   field specs via `fieldsFor` (which reads `fields.json`), compiles a Joi schema
   per type from `schema-builders.js` (e.g. `numberSchema` honours `min`/`max`),
   and adds the required/`requiredWhen` rules. On failure it returns
   `{ ok:false, errors }` and `renderInvalid` re-renders with the messages.
3. **Contract → model (mutate).** On success `contract.applyAnswer(quote,
'your-vehicle', payload)` → `runtime/contract/mutation.js` `collect`s the
   step's fields from the model, merges them, and cascade-clears any step that
   `applicableSteps` says stopped applying. `lib/store.js` persists the merged
   answers.
4. **Contract → navigation.** `contract.next(updated, 'your-vehicle', grouped)`
   → `runtime/contract/navigation.js` returns the next live step id in the task
   group (or a `{ terminal: 'hub' }` sentinel); `journey/paths.js` `resolveNav`
   turns that into a URL and the handler redirects.
5. **Render (a later GET).** `templates/section-page.njk` `{% include %}`s
   `templates/partials/your-vehicle.njk`, which hand-renders the inputs reading
   `quote.<field>`, and `contract.viewItems` supplies any option lists.

The closing flow is the mirror image: Check Your Answers calls
`contract.assembleQuote`, which runs `runtime/engine` —
`missingRequiredErrors` (with their authored `because`), `assertionErrors`
(min-age / lte), and the shared `transform.toDomain` — to produce the final quote.

## Paradigm-specific vs the shared harness

**Genuinely paradigm-specific to spike C** (this is the IP):

- The **two-part model** — the typed `model/fields.json` and the separate
  `model/rules.json` rules layer — and the **requirement-graph engine**
  (`runtime/engine/`) that folds them into a per-answers snapshot. Required-ness,
  applicability, status and the assembled quote are all _derived_ from that
  snapshot; nothing is hand-coded per step.
- **Conditional requiredness as rules** (`model/rules.json` `require` rules):
  `accumulateRuleEffects` in `runtime/engine/evaluation.js` makes a field/step
  required only when its rule's `when` holds.
- **Authored provenance** — the rule's `reason` is surfaced verbatim as `because`
  by `runtime/engine/missing-required.js`. The reason is written _once_ in the
  rule and carried through as a first-class output. This is the paradigm's
  signature trait: **provenance is authored in the rules layer, not synthesised.**

**Shared across all four spikes (the harness), just duplicated here:** the Hapi
plugin/route shape, the GOV.UK Nunjucks templates and per-step partials, the
quote store, premium calc, the claims loop and add-on fan-out, the shared
`page-validator` / `assembler`, and the standalone chooser that mounts the plugin.
These differ only trivially between spikes; the interesting difference is always
the `model/` + `runtime/engine/` pair.

> **Note on `lib/sections/definitions.js`.** In this standalone copy the live path
> derives `validate`, `collect` and `status` from `fields.json` + `rules.json`
> through the contract (`section-routes.js` and `journey/hub-view.js` call
> `contract.*`, never the catalogue). The only parts of the section catalogue
> still exercised at runtime are `rows(quote)` (Check Your Answers, via
> `endings-routes/view-models.js`) and the `loop`/`subtasks` flags
> (`hasOwnRoutes`). The per-section `schema`/`collect`/`isComplete` are vestigial,
> carried over from the shared origin — harmless but not on the live path. See
> `EXTENDING.md`.

## Run

```bash
npm run prototype                                        # serve the whole prototype app incl. standalone
node prototypes/standalone/spike-c/dump.js with-claims   # headless model dump
npm run test:spike-c                                     # 11 unit tests (engine + contract)
npm run test:prototype                                   # fast e2e across every journey (~20s)
```
