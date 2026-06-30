# Spike D — standalone (schema-first / JSON Schema)

A **fully self-contained, flattened** copy of one car-insurance "get a quote"
journey, built for readability. It shares **nothing** with the other spikes or
with the original prototypes (only the `govuk-frontend` framework is shared):
there is no generic `buildVariant`, no contract-blackbox indirection and no shape
registry. The single grouped journey (a task list whose tasks are short linear
runs) is spelled out directly in this folder.

This is a **gated throwaway prototype**. It exists to compare journey-model
paradigms, not to ship. It mounts behind the standalone prototype harness at
`/prototype-standalone/spike-d/task-list-with-linear-tasks`.

## The paradigm in three sentences

The **source of truth is a portable JSON Schema**, `model/quote.schema.json`: a
standard draft-07 document that owns _what is valid_ — each field's type, pattern,
enum and required-ness, including conditional requirements expressed as
`if`/`then` branches under `allOf`. It carries no ordering, grouping or rendering;
that **flow metadata lives separately** in `model/annotations.json` (which step a
field belongs to, step order, group, type hint and the loop/subtask kinds). The
`validation/` folder is a tiny dependency-free **adapter** that reads the schema,
and the `runtime/` modules are a thin layer that turns "schema says valid /
annotations say where" into pages, status, navigation and a final quote.

The one-line mental model: **the schema is the validity; the annotations are the
flow; the adapter and runtime derive behaviour from the two.** The deliberate
split — schema owns validity, annotations own order/grouping/types — is the
paradigm's whole point.

## Folder and file map

Each line names what the module _owns_. Logic files are small (≤ ~147 lines); the
only large file is the declarative `lib/sections` catalogue, kept whole on
purpose.

### `model/` — the source of truth (portable data, no code)

- `model/quote.schema.json` — the **draft-07 JSON Schema** that owns validity:
  `properties` (type/pattern/enum/minLength per field), a top-level `required[]`,
  conditional `allOf` `if`/`then` branches (claims required iff `hadClaims=yes`;
  `excessAmount` required iff `voluntaryExcess=yes`), and a `$defs/claim` shared by
  the claims array. Shaped over the **form** answers (strings, `'yes'`/`'no'`,
  arrays) — the transform to the domain object is the adapter's job. Standard
  draft-07, so ajv / Zod / Pydantic could read the same file.
- `model/annotations.json` — render-agnostic **flow metadata** (also data):
  `steps[]` (order), `titles`, `stepMeta` (loop/subtask kinds, `itemsFrom`),
  `fieldStep` (which step owns each field), `fieldType` (UI type hint),
  `options` (radio/checkbox lists) and `businessRules[]` (the holistic rules JSON
  Schema cannot express, with authored `reason` text).

### `runtime/` — the adapter that interprets the model (the paradigm's IP)

The runtime contract is decomposed by concern behind `index.js`.

- `runtime/annotations.js` — loads `model/annotations.json` through `fs` (not
  `import`, to keep the data/adapter split honest). (Was `runtime/model.js`; renamed
  because the real _model_ here is the JSON Schema in `validation/`, not this file.)
- `runtime/step-meta.js` — step/field accessors: re-exports the annotation maps,
  `stepKind`/`stepTitle`/`stepFields`, and `fieldSpec`/`fieldsFor` which read each
  field's **shape from the schema** (`schema.properties[id]`) and its **type from
  the annotations** — the split made concrete in one accessor.
- `runtime/applicability.js` — `requiredNow` (schema `required` ∪ active
  `if/then.required`), `requiredBecause` (the `if` condition that fired, or `[]` if
  base-required), `applicableSteps` (a step is live when it has a currently-required
  field — so `claims` is live exactly when its if/then makes `claims` required).
- `runtime/status.js` — `status` (a dispatcher over `loopStatus`/`subtasksStatus`/
  `fieldStatus`), `allComplete`, `missingRequired`, and `fieldPresentAndValid`
  (present **and** passes `validateValue`).
- `runtime/navigation.js` — `next`/`prev`: a **thin sequencer** that adds the
  ordering JSON Schema has no concept of, walking the live steps of the current
  task group (or the `{ terminal: 'hub' }` sentinel).
- `runtime/mutation.js` — `collect` (normalise a step's fields from the payload)
  and `applyAnswer` (merge, then cascade-clear any step that stopped applying when
  an if-condition flipped).
- `runtime/view-items.js` — `viewItems`: option lists for the `itemsFrom` steps
  (`cover-type`, `optional-extras`) from `annotations.options`.
- `runtime/page-validation.js` — `validateStep(stepId, payload)`: page-slice
  validation. Picks the step's fields, validates each raw value through the schema
  adapter, and applies the within-page `if/then` (e.g. `excessAmount` required when
  `voluntaryExcess=yes`). Returns `{ ok, errors, errorSummary }`.
- `runtime/assembly.js` — `assembleQuote(answers)`: whole-object `check()` (missing
  - invalid) plus the adapter-side `businessRules` and addon/claims gates, and the
    domain transform → `{ ok, quote, errors }`.
- `runtime/index.js` — assembles the concern modules into the single `contract`
  object (see "The contract surface" below).

### `validation/` — the schema adapter (folder-module behind `index.js`)

- `validation/schema-document.js` — loads the JSON Schema through `fs` and exposes
  `schema` + `resolve` (follows a `$ref` into `$defs`). Dependency-free on purpose;
  swapping in ajv is a one-adapter change.
- `validation/validate-value.js` — `validateValue(node, value, label)`: validate
  **one already-present value** against one schema node. Implements the subset the
  model uses — `enum`, `string` + `pattern` + `minLength`, `array` + `minItems` +
  `items`, `object` + `required`, and `$ref`.
- `validation/conditionals.js` — the value-based `if/then` logic: `ifHolds` (do an
  `if`'s `const` conditions hold against the answers?), `ifProvenance` (flatten an
  `if` to its `{ field, eq }` entries), `activeBranches` (the `allOf` branches whose
  `if` currently holds).
- `validation/partial-check.js` — `check(answers)`: whole-object **partial
  validation** splitting **missing** (required but not answered) from **invalid**
  (answered wrongly), across both base `required` and active `if/then.required`.
  Missing entries carry the `if/then` `because` provenance. This is the heart of
  "status from a whole-object schema".
- `validation/index.js` — barrel re-exporting `schema`, `validateValue`, the
  conditionals and `check`.

### Journey shell (specialised to the one shape we ship)

- `journey.js` — the shell's stable entry point; re-exports the focused modules
  below.
- `journey-shape.js` — `BASE` path, `LAYOUT`, the literal `grouped` task groups,
  and the URL/breadcrumb builders (`hubPath`, `addonStepPath`, `breadcrumbs`).
- `nav.js` — `resolveNav`: turns a contract `next`/`prev` result (a step id or a
  `{ terminal }` sentinel) into a real URL; plus `pathForStep`, `navBack`, `navNext`.
- `status-tags.js` — `statusTag`/`groupTag`/`getYourQuoteItem`: the task-list status
  tag presentation.
- `hub-view-model.js` — the task-list (hub) view-model assembly.
- `shell-routes.js` — the start page + the task-list hub Hapi routes.

### Routes

- `handlers.js` — the generic question pages: one GET/POST pair per **plain** step
  (those whose `stepKind` is `undefined`). Every decision — page-slice validation,
  the answer cascade, option lists, Back/Save — comes from the `contract`.
- `claims-routes.js` — the conditional claims add-another loop.
- `addons-routes/` — the add-on subtask fan-out (`handlers`, `navigation`,
  `view-model`, `index`).
- `endings/` — the closing pages: `quote-summary`, `check-your-answers` (the
  interesting one — soft prompts on load, hard assemble on submit), `confirmation`,
  plus `shared` and `index`.
- `routes.js` — assembles every route module into the one exported Hapi plugin
  (`spikeD`), mounted by `prototypes/standalone/index.js`.

### `lib/` — duplicated helpers, each pointed at this folder

- `lib/sections/registry.js` — the **presentation catalogue**: per-section
  `rows(quote)` used by Check Your Answers (plus legacy `schema`/`collect`/
  `isComplete` carried over from the shared origin — see the note below).
- `lib/sections/index.js` — query helpers over the catalogue (`sectionBySlug`,
  `hasOwnRoutes`, `applicableSections`, `answerRows`).
- `lib/domain/` — whole-object transform + errors: `transform.js` (`toDomain` —
  form answers → domain quote: ISO dates, booleans, numbers/currency → `Number`),
  `required-errors.js`, `business-rules.js`, and `index.js` (`makeAssembler`, the
  shared core `runtime/assembly.js` configures with D's schema-derived field specs).
- `lib/validate/` — the standalone Joi factories (`number-schema`, `text-schema`,
  `date/`, `run-payload`) carried over from the shared origin, consumed by the
  section catalogue's `schema` — **not** on the live page-validation path (see note).
- `lib/addons/` — the add-on catalogue + selection/completion helpers.
- `lib/fields/` — the field-view engine (spec → GOV.UK macro args) used by the
  claims/add-on pages.
- `lib/conditions.js` — `evalCondition`/`provenance` for the annotation
  `businessRules`' `when` predicates.
- `lib/store.js` / `lib/quote.js` / `lib/premium.js` / `lib/claims.js` /
  `lib/fieldutil.js` — the quote store, reference data + formatters, premium calc,
  claims helpers, and field-level utilities (`isEmpty`, `humanize`, `ageInYears`).
- `lib/data/quotes.json` — this spike's own quote store (generated).

### `templates/` — this spike's own Nunjucks

- `templates/layout.njk`, `start.njk`, `hub.njk`, `section-page.njk`,
  `check-your-answers.njk`, `quote-summary.njk`, `confirmation.njk`, the claims +
  add-on pages, and `partials/<step>.njk` — **one partial per step**, which
  hand-renders that step's inputs (the section page `{% include %}`s the partial by
  `section.slug`).

### `dump.js`

- `dump.js` — headless JSON dump of the journey state for a fixture
  (`node prototypes/standalone/spike-d/dump.js with-claims`): applicable steps,
  per-step status, next/prev, `missingRequired`-with-reasons and the assembled quote.

## The contract surface

`runtime/index.js` exports one `contract` object. It is the whole adapter API;
routes consume nothing else from the runtime. The keys, grouped by concern:

| Concern         | Keys                                                       | What they do                                                                                                                 |
| --------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Step meta       | `steps`, `firstStep`, `stepTitle`, `stepKind`, `fieldsFor` | Step order, the first step, a step's title, its kind (`loop`/`subtasks`/plain) and field specs. From `step-meta.js`.         |
| View            | `viewItems`                                                | Option lists for the `itemsFrom` steps. From `view-items.js`.                                                                |
| Applicability   | `applicableSteps`                                          | The step ids that apply for the current answers (driven by what is required now). From `applicability.js`.                   |
| Status          | `status`, `allComplete`, `missingRequired`                 | Per-step status tag, whole-journey completeness, and each still-missing required field with its `because`. From `status.js`. |
| Navigation      | `next`, `prev`                                             | The next/previous live step id within the current task group, or the hub sentinel. From `navigation.js`.                     |
| Mutation        | `collect`, `applyAnswer`                                   | Normalise a step's payload; merge + cascade-clear. From `mutation.js`.                                                       |
| Page validation | `validate`                                                 | Page-slice `{ ok, errors, errorSummary }`. Is `page-validation.js`'s `validateStep`.                                         |
| Assembly        | `assembleQuote`                                            | Whole-object validate + transform → `{ ok, quote, errors }`. From `assembly.js`.                                             |
| Add-ons         | `getSelectedAddons`                                        | The selected add-on values.                                                                                                  |

**How routes consume it.** `handlers.js` is the clearest example: its `GET`
renders with `contract.stepTitle` / `contract.viewItems`; its `POST` calls
`contract.validate(stepId, payload)`, and on success `contract.applyAnswer(...)`
then redirects via `contract.next(...)` (resolved to a URL by `nav.js`
`resolveNav`). The Back link comes from `contract.prev(...)`.
`endings/check-your-answers.js` uses `contract.applicableSteps` +
`contract.missingRequired` on load and `contract.assembleQuote` as the hard gate on
submit. No route reads the schema or annotations directly — they only talk to the
contract.

## Data flow for one request

A `POST` of the vehicle page,
`POST /prototype-standalone/spike-d/task-list-with-linear-tasks/{id}/your-vehicle`:

1. **URL → route.** `handlers.js` registered this path because
   `contract.stepKind('your-vehicle')` is `undefined` (a plain step).
   `postHandler('your-vehicle')` runs, loading the quote from `lib/store.js`.
2. **Route → contract (validate).** `contract.validate('your-vehicle', payload)`
   → `runtime/page-validation.js` `validateStep`. It reads the step's fields from
   `annotations.fieldStep`, and for each field validates the raw payload value
   **against the schema node** — `schema.required.includes(field)` drives the
   "is required" message, and `validateValue(schema.properties[field], value, field)`
   (the `validation/` adapter) drives the format messages (`pattern`, `enum`,
   `minLength`). It then applies the within-page `if/then` via `ifHolds` over
   `schema.allOf`. On failure it returns `{ ok:false, errors, errorSummary }` and the
   handler re-renders with the messages.
3. **Contract → model (mutate).** On success `contract.applyAnswer(quote,
'your-vehicle', payload)` → `runtime/mutation.js` `collect`s the step's fields,
   merges them, and recomputes `applicableSteps` before/after to cascade-clear any
   step whose if-condition stopped holding. `lib/store.js` persists the merged answers.
4. **Contract → navigation.** `contract.next(updated, 'your-vehicle', grouped)`
   → `runtime/navigation.js` returns the next live step id in the task group (or the
   hub sentinel); `nav.js` `resolveNav` turns that into a URL and the handler redirects.
5. **Render (a later GET).** The section page template `{% include %}`s
   `templates/partials/your-vehicle.njk`, which hand-renders the inputs reading
   `quote.<field>`, and `contract.viewItems` supplies any option lists.

The closing flow is the mirror image: Check Your Answers calls
`contract.assembleQuote`, which runs `validation/partial-check.js` `check` —
splitting **missing** (with `if/then` provenance) from **invalid** — alongside the
annotation `businessRules` and the addon/claims gates, and `lib/domain/transform.js`
`toDomain` to produce the final quote.

## Paradigm-specific vs the shared harness

**Genuinely paradigm-specific to spike D** (this is the IP):

- **Validity from a portable JSON Schema.** `model/quote.schema.json` is plain
  draft-07; the `validation/` adapter (`validate-value.js`, `partial-check.js`) reads
  it. Required-ness, format, enum and conditional requirements all live in the
  schema, not in hand-written per-field code.
- **Conditional requirements as JSON Schema `if`/`then`.** The `allOf` branches
  (`validation/conditionals.js` `ifHolds`/`activeBranches`) make `claims` and
  `excessAmount` required _on the value_, and drive both page-slice validation and
  applicability.
- **The schema/annotations split.** Validity is in the schema; order, grouping,
  type hints and the loop/subtask kinds are in `model/annotations.json`. The runtime
  is the seam that joins them (`step-meta.js` reads shape from the schema and type
  from the annotations).
- **Provenance reconstructed from the keyword that fired.** Unlike a paradigm with
  authored reasons, "why is this asked?" is rebuilt from the `if` that made the field
  required (`ifProvenance`) — the paradigm's deliberate weak spot, noted in
  `runtime/index.js`.

**Shared across all four spikes (the harness), just duplicated here:** the Hapi
plugin/route shape, the GOV.UK Nunjucks templates and per-step partials, the quote
store, premium calc, the claims loop and add-on fan-out, and the standalone chooser
that mounts the plugin. These differ only trivially between spikes; the interesting
difference is always the `model/` + adapter pair.

> **Note on `lib/sections/registry.js` and `lib/validate/`.** In this standalone
> copy page validation derives from the JSON Schema (`runtime/page-validation.js` →
> `validation/`); the only part of the section catalogue still exercised at runtime
> is `rows(quote)` (Check Your Answers, via `endings/check-your-answers.js`, looked
> up by `sectionBySlug`). The per-section `schema` (the `lib/validate/` Joi factories),
> `collect` and `isComplete` are vestigial, carried over from the shared origin. They
> are harmless but not on the live path — see `EXTENDING.md`.

## Run

```bash
npm run prototype                                        # serve the whole prototype app incl. standalone
node prototypes/standalone/spike-d/dump.js with-claims   # headless model dump
npm run test:spike-d                                     # 10 unit tests (runtime + validation)
npm run test:prototype                                   # fast e2e across every journey
```
