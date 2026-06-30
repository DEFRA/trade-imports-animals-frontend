# Spike B — standalone (statechart / FSM)

A **fully self-contained, flattened** copy of one car-insurance "get a quote"
journey, built for readability. It shares **nothing** with the other spikes or
with the original prototypes (only the `govuk-frontend` framework is shared):
there is no generic `buildVariant`, no contract-blackbox indirection and no shape
registry. The single grouped journey (a task list whose tasks are short linear
runs) is spelled out directly in this folder.

This is a **gated throwaway prototype**. It exists to compare journey-model
paradigms, not to ship. It mounts behind the standalone prototype harness at
`/prototype-standalone/spike-b/task-list-with-linear-tasks`.

## The paradigm in three sentences

The **source of truth is a statechart as portable data**, `model/machine.json`:
named `states` (the steps), guarded `on` transitions between them, a shared
`context.fields` schema (each field's type + constraints) and the holistic
`rules`/`patterns`. No code lives in the model — a non-JS consumer could read the
same file. A tiny **journey-agnostic interpreter** (`runtime/interpreter.js`)
executes the machine: it walks guarded transitions over the current answers, so
**navigation falls out of the machine** rather than being hand-coded — `next` is
the chosen transition's target, `prev` is resolved through a reverse index, and
"which steps apply" is the realised path (reachability under the guards). What the
FSM does _not_ give for free — per-step status, page-slice validation and the
final assembled quote — is _layered on_ `context.fields` by the concern modules in
`runtime/`, behind one thin `runtime/contract.js`.

The one-line mental model: **the machine is data; the interpreter walks it for
navigation; everything else is derived over `context.fields`; the routes are
plumbing.**

## Folder and file map

Each line names what the module _owns_. Logic files are small (≤ ~141 lines);
the only large file is the declarative `lib/sections` catalogue, kept whole on
purpose.

### `model/` — the source of truth (portable data, no code)

- `model/machine.json` — the statechart: `initial`, a shared `context.fields`
  map (each field's `type` + constraints — `required`, `min`/`max`, `pattern`,
  `options`, `requiredWhen`), `states` (each with a `title`, the `fields` ids it
  owns, optional `kind` of `loop`/`subtasks`, optional `itemsFrom`, and the
  guarded `on` transitions), holistic `rules[]` (`min-age`, `lte`) with authored
  `reason` text, and named regex `patterns`. Guards/`requiredWhen` are condition
  objects, so they double as provenance.

### `runtime/` — the adapter (the paradigm's IP — the part worth reading)

- `runtime/model.js` — loads `machine.json` through `fs` (not `import`, to keep
  the data/adapter split honest) and exposes `machine`.
- `runtime/interpreter.js` — the **tiny, journey-agnostic statechart
  interpreter**. Knows nothing about njk, routes or this journey: `transition`
  (the chosen target under the guards), `realizedPath` (initial → final under the
  current answers), `reverseIndex` (target id → source ids), `prevState` (the
  source whose _realised_ transition targets a state) and `incomingGuard` (the
  guard on that realised transition — its provenance).
- `runtime/steps.js` — step metadata over `machine.states`, independent of
  answers: `stepIds` (every non-final state), `stepKind`, `stepTitle`,
  `fieldSpec` (a field id → `{ id, ...context.fields[id] }`), `fieldsFor` (a
  step's field specs) and `getStep`.
- `runtime/navigation.js` — machine-derived `next`/`prev` (target/ source clipped
  to the current task group), `applicableSteps` (`realizedPath`) and
  `provenanceForStep`. Holds the module-level reverse index. **This is the heart
  of the FSM paradigm** — "where the machine says to go" lives here.
- `runtime/status.js` — per-step + whole-journey status, _layered on_
  `context.fields`: `requiredFields` filters by `required`/`requiredWhen`, then a
  small dispatcher over `loopStatus`/`subtasksStatus`/`fieldsStatus` decides the
  tag; `allComplete` over the realised path.
- `runtime/mutation.js` — `collect` (normalise a step's fields from the raw
  payload, including the date-triple and multi-select shapes) and `applyAnswer`
  (merge, then clear any step that drops off the realised path so stale answers
  cannot linger).
- `runtime/view.js` — `viewItems`: the option-list view model for a step with an
  `itemsFrom` source (radio/checkbox items, marking the selected ones).
- `runtime/assembly.js` — whole-object wiring: builds the page validator
  (`makePageValidator`) and the assembler (`makeAssembler`) once over the machine,
  and exposes `validate` (page slice), `assembleQuote` and `missingRequired`.
- `runtime/contract.js` — the thin assembler composing all of the above into the
  one `contract` object (see "The contract surface" below).

### `lib/` — validators, catalogues and helpers, each pointed at this folder

- `lib/page-validator/` — **page-slice validation derived from the field
  constraints**: `index.js` (`makePageValidator` → `validateStep` returning
  `{ ok, errors, errorSummary }`), `schemas.js` (per-type Joi builders —
  `numberSchema` reads `min`/`max`, `fieldToJoi` reads `required` — bound to the
  named `patterns`), and `date-rules.js` (day/month/year realness + the
  `requiredWhen` conditional-required check Joi can't express off the shape).
- `lib/assembler/` — **whole-object validation + transform**: `index.js`
  (`makeAssembler` → `toDomain` / `missingRequiredErrors` / `assembleQuote` over a
  small model _view_), `transform.js` (`transformStepFields` / `transformField`
  type coercion + the loop projection) and `errors.js` (missing-required per step
  kind + the `min-age`/`lte` business rules, each carrying provenance).
- `lib/validate/` — the standalone Joi factories grouped by field family behind a
  barrel (`date/`, `number`, `currency`, `phone`, `text`), used by the
  `lib/sections` catalogue.
- `lib/fields/to-view/` — the field-view engine (spec → GOV.UK macro args:
  `inputs`, `choices`, `hint`, `errors`, `registry`) used by the claims/add-on
  pages.
- `lib/sections/` — the **presentation catalogue**: `data.js` (per-section
  `rows(quote)` used by Check Your Answers, plus `slug`/`title` and legacy
  `schema`/`collect`/`isComplete` carried over from the shared origin — see the
  note below) and `queries.js`/`index.js` (query helpers — `answerRows`,
  `applicableSections`, `hasOwnRoutes`).
- `lib/conditions.js` — `evalCondition` (does a `{ field, eq }` / `{ all }` /
  `{ any }` condition hold?) and `provenance` (flatten it to the leaf
  `{ field, eq }` entries that justify it). The same object gates guards _and_
  explains them.
- `lib/fieldutil.js` — leaf helpers: `isEmpty`/`isSatisfied` (completeness),
  `humanize` (field id → label for derived messages), `ageInYears`.
- `lib/addons/` — the add-on catalogue + selection/state.
- `lib/store.js` / `lib/quote.js` / `lib/premium.js` / `lib/claims.js` — the quote
  store, reference data + formatters, premium calc, claims helpers.
- `lib/data/quotes.json` — this spike's own quote store (generated).

### `journey/` — the journey shell (specialised to the one shape we ship)

- `journey/config.js` — `BASE` path, `LAYOUT`, `TEMPLATES`, and the literal
  `grouped` task groups (the three hub tasks, each a list of `stepIds`).
- `journey/links.js` — URL/nav resolution: `hubPath`, `addonStepPath`,
  `breadcrumbs`, `pathForStep` and `resolveNav` (turns a contract `next`/`prev`
  result — a step id or a `{ terminal }` sentinel — into a concrete URL).
- `journey/hub.js` — the task-list presentation (status tag per task).
- `journey/index.js` — barrel + the two shell routes (the start page and the
  hub/task list).

### route files — thin Hapi route builders (one concern each)

- `section-routes.js` — the generic question pages: one GET/POST pair per plain
  (non-`loop`, non-`subtasks`) step. Every decision (validation, cascade, option
  lists, Back/Save) comes from the `contract`.
- `claims-routes/` — the conditional claims add-another loop (`handlers`,
  `view-models`, `index`).
- `addons-routes/` — the add-on subtask fan-out (`step-view`, `index`).
- `endings/` — the closing pages: `check-answers.js` (the interesting one — soft
  prompts on load via `missingRequired`, hard assemble on submit) plus the quote
  summary, confirmation and `index`.
- `routes.js` — assembles every route builder into the one exported Hapi plugin
  (`spikeB`), mounted by `prototypes/standalone/index.js`.

### `templates/` — this spike's own Nunjucks

- `templates/layout.njk`, `start.njk`, `hub.njk`, `section-page.njk`,
  `check-your-answers.njk`, `quote-summary.njk`, `confirmation.njk`, the claims +
  add-on pages, and `partials/<step>.njk` — **one partial per step**, which
  hand-renders that step's inputs (the section page `{% include %}`s the partial
  by `section.slug`).

### `dump.js`

- `dump.js` — headless JSON dump of the journey state for a fixture
  (`node prototypes/standalone/spike-b/dump.js with-claims`).

## The contract surface

`runtime/contract.js` exports one `contract` object. It is the whole adapter API;
routes consume nothing else from the runtime. The keys, grouped by concern:

| Concern       | Keys                                              | What they do                                                                                                                                                  |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape         | `steps`, `firstStep`                              | The step id order (`stepIds`) and the machine's `initial` state. From `runtime/steps.js` / `model.js`.                                                        |
| View          | `stepTitle`, `stepKind`, `fieldsFor`, `viewItems` | Title, kind (`loop`/`subtasks`/plain), field specs for a step, and option lists. From `runtime/steps.js` + `runtime/view.js`.                                 |
| Applicability | `applicableSteps`                                 | The step ids on the realised path (reachability under the guards). From `runtime/navigation.js`.                                                              |
| Status        | `status`, `allComplete`                           | Per-step status tag and whole-journey completeness, derived over `context.fields`. From `runtime/status.js`.                                                  |
| Navigation    | `next`, `prev`                                    | The next/previous step id (or the `{ terminal: 'hub' }` sentinel) within the current task group. From `runtime/navigation.js`, which sits on the interpreter. |
| Provenance    | `missingRequired`                                 | Each still-missing required field with its `because` reasons. From `runtime/assembly.js` → `lib/assembler`.                                                   |
| Mutation      | `collect`, `applyAnswer`                          | Normalise a step's payload; merge + cascade-clear dropped steps. From `runtime/mutation.js`.                                                                  |
| Validation    | `validate`                                        | Page-slice `{ ok, errors, errorSummary }`. From `runtime/assembly.js` → `lib/page-validator`.                                                                 |
| Assembly      | `assembleQuote`                                   | Whole-object validate + transform → `{ ok, quote, errors }`. From `runtime/assembly.js` → `lib/assembler`.                                                    |
| Add-ons       | `getSelectedAddons`                               | The selected add-on values. From `lib/addons`.                                                                                                                |

**How routes consume it.** `section-routes.js` is the clearest example: its `GET`
renders with `contract.stepTitle` / `contract.viewItems`; its `postHandler(stepId)`
calls `contract.validate(stepId, payload)`, and on success
`contract.applyAnswer(...)` then redirects via `contract.next(updated, stepId,
grouped)` resolved through `resolveNav`. The Back link comes from
`contract.prev(...)`. `endings/check-answers.js` uses `contract.applicableSteps`
on load to list the answer rows and `contract.missingRequired` for the soft
"you still need to…" prompts. No route reads `machine.json` directly — they only
talk to the contract.

## Data flow for one request

A `POST` of the vehicle page, `POST /prototype-standalone/spike-b/task-list-with-linear-tasks/{id}/your-vehicle`:

1. **URL → route.** `section-routes.js` registered this path because
   `contract.stepKind('your-vehicle')` is `undefined` (a plain step — see the
   `.filter((stepId) => contract.stepKind(stepId) === undefined)` in
   `sectionRoutes()`). `postHandler('your-vehicle')` runs, loading the quote from
   `lib/store.js`.
2. **Route → contract (validate).** `contract.validate('your-vehicle', payload)`
   → `runtime/assembly.js`'s `makePageValidator`. It reads the step's field specs
   via `fieldsFor` (which combines `machine.states['your-vehicle'].fields` with
   `machine.context.fields`), compiles a Joi schema from each field's declared
   constraints (`lib/page-validator/schemas.js`), and applies the date +
   `requiredWhen` extras. On failure it returns `{ ok:false, errors }` and the
   handler re-renders the page with the messages.
3. **Contract → model (mutate).** On success `contract.applyAnswer(quote,
'your-vehicle', payload)` → `runtime/mutation.js` `collect`s the step's fields
   from the model, merges them, and clears any step that dropped off the realised
   path. `lib/store.js` persists the merged answers.
4. **Contract → navigation (the machine decides).** `contract.next(updated,
'your-vehicle', grouped)` → `runtime/navigation.js` asks the interpreter for
   `transition(machine, 'your-vehicle', answers)` (here, unconditionally
   `driving-history`), clips it to the current task group, and returns the target
   id or the hub sentinel; `journey/links.js` `resolveNav` turns that into a URL
   and the handler redirects.
5. **Render (a later GET).** The section page template `{% include %}`s
   `templates/partials/your-vehicle.njk`, which hand-renders the inputs reading
   `quote.<field>`, and `contract.viewItems` supplies any option lists.

The closing flow is the mirror image: Check Your Answers calls
`contract.assembleQuote`, which runs `lib/assembler` over the realised path —
missing-required provenance, the holistic `rules[]`, and `transformStepFields` —
to produce the final quote.

## Paradigm-specific vs the shared harness

**Genuinely paradigm-specific to spike B** (this is the IP):

- The **statechart model** `model/machine.json` and the **journey-agnostic
  interpreter** over it (`runtime/interpreter.js`). Navigation is not hand-coded:
  `next`/`prev`/`applicableSteps` all fall out of walking the machine's guarded
  transitions.
- The **separation of "where the machine says to go" from "what URL that is"**:
  `runtime/navigation.js` returns a _step id_ (or a `{ terminal }` sentinel) from
  the machine; `journey/links.js` `resolveNav` is the only thing that knows the
  step id maps to a concrete path. The machine never mentions a URL.
- **Guards/`requiredWhen` as condition data that double as provenance**
  (`lib/conditions.js`): the same `{ field, eq }` object that gates a transition
  (`hadClaims = yes` → `claims`) also explains _why_ a step is asked, surfaced via
  `incomingGuard` → `provenanceForStep`.
- Crucially, the FSM gives navigation for free but **not** status, validation or
  the final quote — those are deliberately _layered on_ `context.fields` in
  `runtime/status.js` and `runtime/assembly.js` rather than coming from the
  machine.

**Shared across all four spikes (the harness), just duplicated here:** the Hapi
plugin/route shape, the GOV.UK Nunjucks templates and per-step partials, the
quote store, premium calc, the claims loop and add-on fan-out, the page validator
/ assembler engines (`lib/page-validator`, `lib/assembler`) and the standalone
chooser that mounts the plugin. These differ only trivially between spikes; the
interesting difference is always the `model/` + `runtime/` pair.

> **Note on `lib/sections/data.js`.** In this standalone copy the section route
> and the contract derive `collect`, `validate` and `status` from
> `machine.json` (via `runtime/mutation.js`, `runtime/assembly.js` and
> `runtime/status.js`); the only part of the section catalogue still exercised at
> runtime is `rows(quote)` — the Check Your Answers rows, read by
> `endings/check-answers.js`. The per-section `schema`/`collect`/`isComplete` are
> vestigial, carried over from the shared origin. They are harmless but not on the
> live path — see `EXTENDING.md`.

## Run

```bash
npm run prototype                                        # serve the whole prototype app incl. standalone
node prototypes/standalone/spike-b/dump.js with-claims   # headless model dump
npm run test:spike-b                                     # 18 unit tests (interpreter + contract + assembly)
npm run test:prototype                                   # fast e2e across every journey (~20s)
```
