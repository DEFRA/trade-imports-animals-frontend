# Spike A — standalone (declarative config + selectors)

A **fully self-contained, flattened** copy of one car-insurance "get a quote"
journey, built for readability. It shares **nothing** with the other spikes or
with the original prototypes (only the `govuk-frontend` framework is shared):
there is no generic `buildVariant`, no contract-blackbox indirection and no shape
registry. The single grouped journey (a task list whose tasks are short linear
runs) is spelled out directly in this folder.

This is a **gated throwaway prototype**. It exists to compare journey-model
paradigms, not to ship. It mounts behind the standalone prototype harness at
`/prototype-standalone/spike-a/task-list-with-linear-tasks`.

## The paradigm in three sentences

The **source of truth is a declarative data file**, `model/journey.json`: a list
of steps, each with typed fields and their constraints (`required`, `min`/`max`,
`pattern`, `options`, `requiredWhen`), plus holistic `rules` and named `patterns`.
No code lives in the model — a non-JS consumer could read the same file. The
runtime (`runtime/selectors/`) is a set of **pure selector functions** that
_derive_ everything the journey needs from that data: which steps apply, each
step's status, what comes next/previous, the page-slice validation schema, the
answer cascade, and the final assembled quote. Routes are thin Hapi wrappers that
ask the selectors a question and render the answer.

The one-line mental model: **the model is data; the selectors derive behaviour
from it; the routes are plumbing.**

## Folder and file map

Each line names what the module _owns_. Logic files are small (≤ ~145 lines);
the only large file is the declarative `lib/sections` catalogue, kept whole on
purpose.

### `model/` — the source of truth (portable data, no code)

- `model/journey.json` — the journey model: `steps[]` (each with `id`, `title`,
  optional `kind` of `loop`/`subtasks`, `fields[]` with type + constraints,
  optional `appliesWhen` and `itemsFrom`), holistic `rules[]` (`min-age`, `lte`)
  with authored `reason` text, and regex `patterns`.

### `runtime/` — the adapter (the paradigm's IP — the part worth reading)

- `runtime/model.js` — loads `journey.json` through `fs` (not `import`, to keep
  the data/adapter split honest) and exposes `model`, `stepById`, `stepOrder`.
- `runtime/conditions.js` — evaluates declarative condition objects
  (`{ field, eq }`, `{ all }`, `{ any }`) — `evalCondition` (does it hold?) and
  `provenance` (flatten to the leaf `{ field, eq }` entries that justify it).
- `runtime/util.js` — leaf helpers used by the selectors: `isEmpty`/`isSatisfied`
  (completeness), `humanize` (field id → label for derived messages), `regexFor`
  (named pattern → `RegExp`), `ageInYears`.
- `runtime/selectors/constants.js` — the `STATUS`, `STEP_KIND`, `FIELD_TYPE`,
  `HUB_TERMINAL` enums shared by the selectors.
- `runtime/selectors/status.js` — applicability + status, _derived_:
  `applicableStepIds` (from each step's `appliesWhen`), `status` (a small
  dispatcher over `loopStatus`/`subtasksStatus`/`fieldStatus`), `allComplete`.
- `runtime/selectors/navigation.js` — `next`/`prev` over the live steps of the
  current task group (navigation falls out of the grouped shape + applicability).
- `runtime/selectors/mutation.js` — `collect` (normalise a step's fields from the
  raw payload) and `applyAnswer` (merge, then cascade-clear steps that stopped
  applying).
- `runtime/selectors/view.js` — `stepKind`, `stepTitle`, `fieldsFor` (field
  constraints for a step) and `viewItems` (option lists for radio/select/multi).
- `runtime/selectors/index.js` — assembles the pure selectors into the single
  `contract` object (see "The contract surface" below).

### `validation/` — validation derived from the model

- `validation/compile/field-schemas.js` — per-type Joi schema builders
  (`number`/`currency`/`email`/`radio`/`multi-select`/text-with-pattern) and
  `stepSchema`, which composes one Joi object for a step's non-date fields from
  their declared constraints.
- `validation/compile/date-field.js` — the date-triple (`*-day/-month/-year`)
  rules Joi can't express off the shape alone.
- `validation/compile/index.js` — `validateStep(stepId, payload)`: page-slice
  validation returning `{ ok, errors, errorSummary }`. Layers the Joi schema, the
  date rules, and the within-page `requiredWhen` conditionals.
- `validation/assemble/transform.js` — `toDomain`: form answers → domain quote
  (ISO dates, booleans, numbers, enums), iterating the model's applicable fields.
- `validation/assemble/required-errors.js` — `missingRequiredErrors`: every
  still-missing required/`requiredWhen` field, each carrying its provenance
  (`because`) derived from `appliesWhen`/`requiredWhen`.
- `validation/assemble/business-rules.js` — the holistic `rules[]`
  (`min-age`, `lte`) as `businessRuleErrors`.
- `validation/assemble/applicable.js` — `applicableSteps` (the step _objects_ that
  currently apply), shared by transform and required-errors.
- `validation/assemble/index.js` — `assembleQuote(answers)`: whole-object
  validate + transform, returning `{ ok, quote, errors }`.

### `journey/` — the journey shell (specialised to the one shape we ship)

- `journey/config.js` — `BASE` path, `LAYOUT`, the literal `grouped` task groups,
  and the URL builders (`hubPath`, `addonStepPath`, `breadcrumbs`).
- `journey/navigation.js` — `resolveNav`: turns a contract `next`/`prev` result
  (a step id or the `HUB_TERMINAL` sentinel) into a real URL.
- `journey/hub-view-model.js` — the task-list presentation (status tags per task).

### `routes/` — thin Hapi route builders (one concern each)

- `routes/shell.js` — the start page + the task-list hub.
- `routes/section.js` — the generic question pages: one GET/POST pair per plain
  step. Every decision (validation, cascade, option lists, Back/Next) comes from
  the `contract`.
- `routes/claims.js` — the conditional claims add-another loop.
- `routes/addons/` — the add-on subtask fan-out (`handlers`, `view-model`,
  `helpers`, `index`).
- `routes/endings/` — the closing pages: `quote-summary`, `check-your-answers`
  (the interesting one — soft prompts on load, hard assemble on submit),
  `confirmation`, plus `provenance` and `helpers`.
- `routes.js` — assembles every route builder into the one exported Hapi plugin
  (`spikeA`).

### `lib/` — duplicated helpers, each pointed at this folder

- `lib/sections/definitions.js` — the **presentation catalogue**: per-section
  `rows(quote)` used by Check Your Answers (and legacy `collect`/`isComplete`/
  `schema` carried over from the shared origin — see the note below).
- `lib/sections/index.js` — query helpers over the catalogue (`sectionBySlug`,
  `hasOwnRoutes`, `applicableSections`, `answerRows`).
- `lib/validate/` — the standalone Joi factories grouped by field family behind a
  barrel (`date/`, `numeric`, `text`), used by the section catalogue.
- `lib/addons/` — the add-on catalogue + selection/completion/views.
- `lib/fields/` — the field-view engine (spec → GOV.UK macro args) used by the
  claims/add-on pages.
- `lib/store.js` / `lib/quote.js` / `lib/premium.js` / `lib/claims.js` — the quote
  store, reference data + formatters, premium calc, claims helpers.
- `lib/data/quotes.json` — this spike's own quote store (generated).

### `templates/` — this spike's own Nunjucks

- `templates/layout.njk`, `start.njk`, `hub.njk`, `section-page.njk`,
  `check-your-answers.njk`, `quote-summary.njk`, `confirmation.njk`, the claims +
  add-on pages, and `partials/<step>.njk` — **one partial per step**, which
  hand-renders that step's inputs (the section page `{% include %}`s the partial
  by `section.slug`).

### `dump.js`

- `dump.js` — headless JSON dump of the journey state for a fixture
  (`node prototypes/standalone/spike-a/dump.js with-claims`).

## The contract surface

`runtime/selectors/index.js` exports one `contract` object. It is the whole
adapter API; routes consume nothing else from the runtime. The keys, grouped by
concern:

| Concern       | Keys                                              | What they do                                                                                                             |
| ------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Shape         | `steps`, `firstStep`                              | The step id order and the first step.                                                                                    |
| View          | `stepTitle`, `stepKind`, `fieldsFor`, `viewItems` | Title, kind (`loop`/`subtasks`/plain), field constraints, and option lists for a step. From `runtime/selectors/view.js`. |
| Applicability | `applicableSteps`                                 | The step ids that apply for the current answers. From `status.js`.                                                       |
| Status        | `status`, `allComplete`                           | Per-step status tag and whole-journey completeness. From `status.js`.                                                    |
| Navigation    | `next`, `prev`                                    | The next/previous step id (or the hub sentinel) within the current task group. From `navigation.js`.                     |
| Provenance    | `missingRequired`                                 | Each still-missing required field with its `because` reasons. Wraps `validation/assemble`.                               |
| Mutation      | `collect`, `applyAnswer`                          | Normalise a step's payload; merge + cascade-clear. From `mutation.js`.                                                   |
| Validation    | `validate`                                        | Page-slice `{ ok, errors, errorSummary }`. Is `validation/compile`'s `validateStep`.                                     |
| Assembly      | `assembleQuote`                                   | Whole-object validate + transform → `{ ok, quote, errors }`. Is `validation/assemble`'s `assembleQuote`.                 |
| Add-ons       | `getSelectedAddons`                               | The selected add-on values.                                                                                              |

**How routes consume it.** `routes/section.js` is the clearest example: its `GET`
renders with `contract.stepTitle` / `contract.viewItems`; its `POST` calls
`contract.validate(stepId, payload)`, and on success `contract.applyAnswer(...)`
then redirects via `contract.next(...)`. The Back link comes from
`contract.prev(...)`. `routes/endings/check-your-answers.js` uses
`contract.applicableSteps` + `contract.missingRequired` on load and
`contract.assembleQuote` as the hard gate on submit. No route reads
`journey.json` directly — they only talk to the contract.

## Data flow for one request

A `POST` of the vehicle page, `POST /prototype-standalone/spike-a/task-list-with-linear-tasks/{id}/your-vehicle`:

1. **URL → route.** `routes/section.js` registered this path because
   `contract.stepKind('your-vehicle')` is `undefined` (a plain step).
   `postHandler('your-vehicle')` runs, loading the quote from `lib/store.js`.
2. **Route → contract (validate).** `contract.validate('your-vehicle', payload)`
   → `validation/compile/index.js`. It reads the `your-vehicle` step from
   `journey.json` (via `runtime/model.js`), compiles a Joi schema from each
   field's declared constraints (`field-schemas.js`), and applies the date +
   `requiredWhen` extras. On failure it returns `{ ok:false, errors }` and the
   handler re-renders the page with the messages.
3. **Contract → model (mutate).** On success `contract.applyAnswer(quote,
'your-vehicle', payload)` → `runtime/selectors/mutation.js` `collect`s the
   step's fields from the model, merges them, and cascade-clears any step that
   stopped applying. `lib/store.js` persists the merged answers.
4. **Contract → navigation.** `contract.next(updated, 'your-vehicle', grouped)`
   → `runtime/selectors/navigation.js` returns the next live step id in the task
   group (or `HUB_TERMINAL`); `journey/navigation.js` `resolveNav` turns that into
   a URL and the handler redirects.
5. **Render (a later GET).** The section page template `{% include %}`s
   `templates/partials/your-vehicle.njk`, which hand-renders the inputs reading
   `quote.<field>`, and `contract.viewItems` supplies any option lists.

The closing flow is the mirror image: Check Your Answers calls
`contract.assembleQuote`, which runs `validation/assemble` — required-field
provenance, the holistic `rules[]`, and `toDomain` — to produce the final quote.

## Paradigm-specific vs the shared harness

**Genuinely paradigm-specific to spike A** (this is the IP):

- The **declarative model** `model/journey.json` and the **pure selectors** over
  it (`runtime/selectors/`). Status, applicability, navigation, validation shape
  and the assembled quote are all _derived_ from the model data — nothing is
  hand-coded per step.
- **Validation compiled from constraints** (`validation/compile/field-schemas.js`)
  rather than hand-authored per field.
- **Conditions as data that double as provenance** (`runtime/conditions.js`): the
  same `{ field, eq }` object that decides whether a step applies also explains
  _why_ a field is required.

**Shared across all four spikes (the harness), just duplicated here:** the Hapi
plugin/route shape, the GOV.UK Nunjucks templates and per-step partials, the
quote store, premium calc, the claims loop and add-on fan-out, and the standalone
chooser that mounts the plugin. These differ only trivially between spikes; the
interesting difference is always the `model/` + `runtime/` pair.

> **Note on `lib/sections/definitions.js`.** In this standalone copy the section
> route and the contract derive `collect`, `validate` and `status` from
> `journey.json`; the only parts of the section catalogue still exercised at
> runtime are `rows(quote)` (Check Your Answers, via
> `routes/endings/check-your-answers.js`) and `hasOwnRoutes`. The per-section
> `schema`/`collect`/`isComplete` are vestigial, carried over from the shared
> origin. They are harmless but not on the live path — see `EXTENDING.md`.

## Run

```bash
npm run prototype                                        # serve the whole prototype app incl. standalone
node prototypes/standalone/spike-a/dump.js with-claims   # headless model dump
npm run test:spike-a                                     # 25 unit tests (runtime + validation)
npm run test:prototype                                   # fast e2e across every journey (~20s)
```
