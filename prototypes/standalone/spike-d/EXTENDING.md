# Extending spike D — worked examples

This is a step-by-step cookbook for extending the journey in the **schema-first /
JSON Schema** paradigm. Read `README.md` first for the shape of the spike.

> The same two worked examples are used in all four spikes' `EXTENDING.md` so the
> paradigms are directly comparable. In spike D the model is split in two: validity
> lives in the portable JSON Schema (`model/quote.schema.json`), flow lives in the
> annotations (`model/annotations.json`). Worked example 1 adds a **field to an
> existing page**; worked example 2 adds a **whole new page**. Both touch _both_
> data files.

## Worked example 1 — a new field on an existing page

> **Add a new question — `estimatedMileage` (estimated annual mileage), a required
> whole-number field with a sensible range — to the vehicle step, so it is asked on
> the page, validated, shown on Check Your Answers, and carried into the quote.**

### What the paradigm gives you for free

Because validity is read from the schema and flow is read from the annotations,
declaring the field in those two data files is most of the work. With no further
code you get:

- **Required-ness + validation** — adding the field to the schema's `required[]`
  array makes `runtime/page-validation.js` `validateStep` emit
  "Estimated mileage is required" (it checks `schema.required.includes(field)`),
  and `validation/partial-check.js` `check` reports it as **missing** until
  answered. Any format constraints on the schema node are enforced by the adapter
  `validation/validate-value.js`. The message label comes from
  `humanize('estimatedMileage')` → "Estimated mileage".
- **Status** — `runtime/status.js` `fieldStatus` only marks the vehicle task
  "Completed" once every currently-required field of the step is present and valid,
  so the new required field gates the tag automatically.
- **Placement / collect / persistence** — `annotations.fieldStep` puts the field
  in `your-vehicle`, so `runtime/step-meta.js` `fieldsFor` returns it,
  `runtime/mutation.js` `collect` reads it from the payload, and it is saved.
- **Carried into the quote** — `lib/domain/transform.js` `toDomain` iterates the
  applicable steps' field specs; the `fieldType: "number"` annotation makes
  `transformField` coerce the answer with `Number(value)` into the domain quote.

What is _not_ derived — and so must be edited by hand — is the **page rendering**
(the per-step Nunjucks partial) and the **Check Your Answers row** (the
presentation catalogue).

### The exact steps

**1. Edit the schema — `model/quote.schema.json`.** Add the property (validity) and
add it to `required[]` (required-ness lives in the schema's `required` array, **not**
in the annotations):

```json
"estimatedMileage": { "type": "integer", "minimum": 0, "maximum": 100000 }
```

```json
"required": [
  "email",
  "fullName",
  "registration",
  "estimatedMileage",
  "hadClaims",
  "coverType",
  "extras"
]
```

> **Honest caveat on the range.** `minimum`/`maximum` (and `type: "integer"`) are
> the correct, portable draft-07 way to express "a sensible range", and a real
> validator (ajv / Zod / Pydantic) reading this same file would honour them. But
> this spike's dependency-free adapter `validation/validate-value.js` implements
> only the subset the model uses — `enum`, `string` + `pattern` + `minLength`,
> `array`, `object` — and does **not** yet read `minimum`/`maximum` or a numeric
> `integer` range. So today the _required-ness_ fires in-spike (it comes from the
> `required[]` array, which the adapter does read) but the _range_ would not. The
> sibling whole-number fields work around this by modelling the value as a string
> with a digit pattern — `"estimatedValue": { "type": "string", "pattern": "^\\d+$" }`
> — which the adapter _does_ enforce. So for a range that actually bites in-spike
> today, either model it the sibling way (string + pattern) or add a few lines to
> `validate-value.js` to read `minimum`/`maximum`. Required-ness is identical either
> way.

**2. Place it in the flow — `model/annotations.json`.** Tell the annotations which
step owns the field and how to type it for the UI:

```json
"fieldStep": {
  "estimatedValue": "your-vehicle",
  "estimatedMileage": "your-vehicle",
  ...
}
```

```json
"fieldType": {
  "estimatedValue": "currency",
  "estimatedMileage": "number",
  ...
}
```

`fieldStep` puts the question on the vehicle page (and into that step's collect,
status and CYA membership); `fieldType: "number"` is what makes the domain
transform coerce the answer with `Number(...)`. No `required` flag here —
required-ness is the schema's job.

**3. Render the input — `templates/partials/your-vehicle.njk`.** The section page
includes one partial per step, and the partial hand-renders each input. Add a
`govukInput` (e.g. before the file-upload), wiring `value` to the saved answer and
`errorMessage` to the derived error so a failed submit re-renders it:

```njk
{{ govukInput({
  label: { text: "Estimated annual mileage" },
  id: "estimatedMileage",
  name: "estimatedMileage",
  classes: "govuk-input--width-5",
  inputmode: "numeric",
  hint: { text: "The number of miles you expect to drive in a year" },
  value: quote.estimatedMileage,
  errorMessage: { text: errors.estimatedMileage } if errors and errors.estimatedMileage
}) }}
```

The `id`/`name` must equal the field key (`estimatedMileage`) — collect, validation
and error wiring all key off that name.

**4. Show it on Check Your Answers — `lib/sections/registry.js`.** Add a row to the
`your-vehicle` section's `rows(quote)` so the answer appears (and gets a Change
link) on the CYA page:

```js
{
  key: 'Estimated mileage',
  value: quote.estimatedMileage
    ? `${quote.estimatedMileage} miles`
    : 'Not provided'
}
```

> The other keys on that section object (`schema`, `collect`, `isComplete`) are
> vestigial in this standalone spike — the live path derives validation from the
> JSON Schema and status/placement from the annotations (see the README note). You
> only need to touch `rows`.

That's it for behaviour. **Four files**: the schema, the annotations, the step
partial, the CYA catalogue. Required-ness, status, persistence and quote coercion
all follow from steps 1–2.

**Derived vs hand-edited.** _Derived from data_ (steps 1–2): required-ness and
missing/invalid status (schema `required[]` → `page-validation.js` +
`partial-check.js`), step placement and ordering (annotations `fieldStep`), collect
and persistence (`mutation.js` reads `fieldsFor`), and the domain coercion
(`transform.js` keyed on `fieldType`). _Hand-edited_ (steps 3–4): the Nunjucks
partial input and the CYA row — the two presentation concerns the model deliberately
does not own.

### Files that also change if a test pins the "complete quote"

The unit test `runtime/index.test.js` has a `complete` fixture that asserts
`contract.assembleQuote(complete).ok === true`. Making the field **required** means
that fixture must include it, or the test (correctly) fails with a missing-required
error:

```js
const complete = {
  // ...
  estimatedValue: '8000',
  estimatedMileage: 8000
  // ...
}
```

This is expected: adding a required field changes what "a complete quote" means, so
the fixture has to follow.

## Verification — these steps were validated by doing

Worked example 1 was **performed on the real spike-d code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–4 plus the `complete` fixture update
   (`estimatedMileage` added to `model/quote.schema.json` properties **and**
   `required[]`, to `annotations.json` `fieldStep` + `fieldType`, the `govukInput`
   in `your-vehicle.njk`, the CYA row in `lib/sections/registry.js`, and the fixture
   in `runtime/index.test.js`).
2. Ran `npm run test:spike-d` → **10 passed** (the standalone baseline), confirming
   the new required field assembles into a valid quote and nothing else regressed.
3. Reverted every code edit with `git checkout -- <files>` (using `git checkout`,
   not `rm`/`sed`), leaving only this documentation changed and the spike's behaviour
   unchanged.

The takeaway: a real (non-throwaway) addition of a _required_ field splits cleanly
across the two data files — validity into the schema, flow into the annotations —
and then touches only the two presentation concerns (partial, CYA row) plus whatever
already encodes "a complete quote" (here the unit fixture). The adapter and runtime
needed **no** change.

## Worked example 2 — a whole new page (step)

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own task on
> the hub, asking where the vehicle is kept overnight (`parkingLocation`, a required
> radio) and whether a tracker is fitted (`hasTracker`, an optional yes/no), so the
> page is reachable from the hub, navigable, validated, shown on Check Your Answers,
> gated into the quote completeness, and carried into the quote.**

A page is more than a field: it adds a _step_ to the model, a _task_ to the hub, and
it joins the completeness gate (`contract.allComplete`) that unlocks "Get your
quote". The good news is the same machinery does the heavy lifting — `handlers.js`
already registers a GET/POST pair for _every_ plain step, so **no new route file is
needed**.

### What the paradigm gives you for free

Declaring the step's fields in the schema and its flow in the annotations (and
listing it in a task group) gives you, with no further code:

- **Routing** — `handlers.js` `sectionRoutes` filters `contract.steps` to those
  whose `stepKind` is `undefined` and registers GET/POST for each, so
  `…/{id}/vehicle-security` exists automatically. (A `stepMeta` entry that carries
  only `itemsFrom` — no `kind` — keeps `stepKind` `undefined`, so the step is still
  "plain"; this is exactly how `cover-type` works.)
- **Validation + status** — the required `parkingLocation` (schema `required[]`)
  makes `runtime/page-validation.js` validate the page and `runtime/status.js`
  `fieldStatus` keep the task "Incomplete" until it is answered; the `enum` on the
  property is enforced in-spike by `validation/validate-value.js` `enumErrors`.
- **Applicability + the completeness gate** — `runtime/applicability.js`
  `applicableSteps` makes the step live because it owns a currently-required field,
  and `runtime/status.js` `allComplete` then counts it, so `status-tags.js`
  `getYourQuoteItem` keeps "Get your quote" locked until the page is done.
- **Collect / persistence / quote** — `runtime/mutation.js` `collect` reads the
  step's fields from `fieldsFor`, and `lib/domain/transform.js` `toDomain` coerces
  them by `fieldType` (`radio` → string passthrough; `boolean` → `value === 'yes'`).
- **The radio option list** — `runtime/view-items.js` `viewItems` reads
  `stepMeta['vehicle-security'].itemsFrom` (`"parkingLocation"`) and builds the radio
  `items` (with `checked` state) from `annotations.options.parkingLocation`; the
  handler passes them to the partial as `items`.

What you edit by hand is the same two presentation concerns as a field (a partial,
a CYA section) plus the **task-group entry** in the journey shell.

### The exact steps

**1. Add the fields to the schema — `model/quote.schema.json`.** Add an `enum`
property for each field (the `enum` form is what the adapter validates), and add the
required one to `required[]`:

```json
"parkingLocation": { "enum": ["garage", "driveway", "street"] },
"hasTracker": { "enum": ["yes", "no"] }
```

```json
"required": [
  "email",
  "fullName",
  "registration",
  "hadClaims",
  "coverType",
  "extras",
  "parkingLocation"
]
```

`parkingLocation` is required; `hasTracker` is left out of `required[]`, so it is
optional. Both `enum`s are honoured in-spike (unlike the numeric range in worked
example 1, `enum` _is_ in the adapter's supported subset), so an invalid radio value
is rejected and a missing required radio is reported.

**2. Add the step's flow — `model/annotations.json`.** Six edits, all data:

```json
"steps": [ ..., "optional-extras", "vehicle-security", "addons" ]
```

```json
"titles": { ..., "vehicle-security": "Vehicle security" }
```

```json
"stepMeta": { ..., "vehicle-security": { "itemsFrom": "parkingLocation" } }
```

```json
"fieldStep": { ..., "parkingLocation": "vehicle-security", "hasTracker": "vehicle-security" }
```

```json
"fieldType": { ..., "parkingLocation": "radio", "hasTracker": "boolean" }
```

```json
"options": { ..., "parkingLocation": [
  { "value": "garage",   "text": "In a locked garage" },
  { "value": "driveway", "text": "On a private driveway" },
  { "value": "street",   "text": "On the street" }
] }
```

The `stepMeta.itemsFrom` entry is the one non-obvious edit: it is what makes
`view-items.js` emit the radio's option list — a plain _text_ step would omit it.
`itemsFrom` without a `kind` leaves the step plain (still routed by `handlers.js`).

**3. Put it on the hub — `journey-shape.js`.** Add a task group so the step shows as
a hub task and is reachable. A single-step group returns to the hub after Save:

```js
export const grouped = {
  kind: 'grouped',
  groups: [
    { title: 'Email', stepIds: ['email'] },
    {
      title: 'About you and your vehicle',
      stepIds: ['about-you', 'your-vehicle']
    },
    {
      title: 'Your driving and cover',
      stepIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
    },
    { title: 'Vehicle security', stepIds: ['vehicle-security'] }
  ]
}
```

`hub-view-model.js` `hubViewModel` maps every group to a task (its href is the
group's first step) and derives the status tag from `contract.status`; navigation
(`runtime/navigation.js`) walks the live steps _within a group_, so a single-step
group's Next/Back resolves to the hub sentinel — Save returns to the hub.

**4. Render the page — `templates/partials/vehicle-security.njk`.** A new partial,
included by `templates/section-page.njk` via the step slug. Render the radio from
`items` (the runtime's option list) and the boolean inline, wiring `errorMessage`:

```njk
{% from "govuk/components/radios/macro.njk" import govukRadios %}

{{ govukRadios({
  name: "parkingLocation",
  fieldset: { legend: { text: "Where is the vehicle kept overnight?", classes: "govuk-fieldset__legend--m" } },
  items: items,
  errorMessage: { text: errors.parkingLocation } if errors and errors.parkingLocation
}) }}

{{ govukRadios({
  name: "hasTracker",
  fieldset: { legend: { text: "Is a tracking device fitted?", classes: "govuk-fieldset__legend--m" } },
  items: [
    { value: "yes", text: "Yes", checked: quote.hasTracker == "yes" },
    { value: "no", text: "No", checked: quote.hasTracker == "no" }
  ]
}) }}
```

The `parkingLocation` radio reads `items` (built by `viewItems` from
`stepMeta.itemsFrom` + `options`), exactly as `cover-type.njk` does; the optional
`hasTracker` is hand-rendered with its own two items.

**5. Add a Check Your Answers section — `lib/sections/registry.js`.** Add a section
object (`slug` must equal the step id) with the rows for the page:

```js
{
  slug: 'vehicle-security',
  title: 'Vehicle security',
  isComplete: (quote) => Boolean(quote.parkingLocation),
  rows: (quote) => [
    {
      key: 'Overnight parking',
      value: {
        garage: 'In a locked garage',
        driveway: 'On a private driveway',
        street: 'On the street'
      }[quote.parkingLocation] ?? 'Not provided'
    },
    { key: 'Tracking device', value: quote.hasTracker === 'yes' ? 'Yes' : 'No' }
  ]
}
```

`endings/check-your-answers.js` `answerRows` iterates `contract.applicableSteps` and
looks the section up by slug (`sectionBySlug`), so the new page's rows appear on CYA
automatically; its `missingRequired` soft-prompt for an unanswered `parkingLocation`
falls out of the schema too.

That's it. **Five files**: the schema (the new fields), the annotations (the new
step's flow), the task-group config, the new partial, the CYA catalogue. Routing,
validation, status, navigation, the quote gate and the assembled quote all follow
from steps 1–2. As with a field, the `complete` fixture in `runtime/index.test.js`
must gain `parkingLocation` (the new required answer) for the "valid quote" test to
stay green.

> **Why no new route file?** `handlers.js` is generic over the model —
> `sectionRoutes` registers a GET/POST for every plain step (`stepKind` `undefined`).
> Only `loop` and `subtasks` steps (which set `stepMeta.kind` and own bespoke pages,
> like `claims`/`addons`) need their own route module.

### Verification — validated by doing

Worked example 2 was **performed on the real spike-d code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–5 (schema `properties` + `required[]`; annotations `steps` /
   `titles` / `stepMeta` / `fieldStep` / `fieldType` / `options`; the
   `journey-shape.js` task group; `templates/partials/vehicle-security.njk`; the CYA
   section in `lib/sections/registry.js`) plus the `complete` fixture update
   (`parkingLocation: 'garage'`) in `runtime/index.test.js`.
2. Ran `npm run test:spike-d` → **10 passed** (the standalone baseline) with the new
   page in place — confirming the new required step joins the completeness gate and
   the quote assembles valid once `parkingLocation` is supplied.
3. **Scoped-unit verified by doing for spike-d.** The full browser end-to-end proof
   was run on **spike-a** as the representative, using the same mechanism (the shared
   walk in `prototypes/e2e/journey.js` taught to complete the new task **only when its
   hub link is present**, so the other journeys are unaffected), then reverted. The
   `npm run test:prototype` shared-server run was **not** re-run here to avoid a port
   clash with parallel work.
4. Reverted every code edit with `git checkout -- <files>`, leaving only this
   documentation changed and the spike's behaviour unchanged.

## Variations

### Make the question conditional (only required when another answer is X)

In spike D conditionality is the schema's signature move: a value-based **JSON
Schema `if`/`then`** branch under `allOf`, exactly like the two already in
`model/quote.schema.json` (claims required iff `hadClaims=yes`; `excessAmount`
required iff `voluntaryExcess=yes`). To make a field required only when, say, the
driver chose comprehensive cover, drop it from the top-level `required[]` and add a
branch:

```json
{
  "if": {
    "properties": { "coverType": { "const": "comprehensive" } },
    "required": ["coverType"]
  },
  "then": { "required": ["estimatedMileage"] }
}
```

- **Where it is enforced.** `validation/conditionals.js` `ifHolds` decides whether
  the branch's `if` holds against the answers; `activeBranches` collects the live
  ones. `runtime/applicability.js` `requiredNow` unions `schema.required` with every
  active branch's `then.required`, so the field is required _only when the predicate
  holds_ — and page-slice validation (`page-validation.js`
  `validateConditionalBranches`) and whole-object `check` (`partial-check.js`
  `branchMissing`) both honour it.
- **How "why is this asked?" is derived.** This is the paradigm's weak spot, made
  explicit: there is no authored reason string. `validation/conditionals.js`
  `ifProvenance` flattens the same `if` into its `{ field, eq }` entries;
  `runtime/applicability.js` `requiredBecause` returns them for the field, and
  `partial-check.js` `branchMissing` attaches them as `because`. The CYA soft-prompt
  text is then built from that in `endings/check-your-answers.js` `provenanceText`.
  The provenance is **reconstructed from the keyword that fired**, not declared
  (`runtime/index.js` calls this out as the trade-off versus a paradigm with authored
  reasons).

A whole-quote **business rule** that JSON Schema cannot express (e.g. "mileage must
be ≤ some limit for a cover type") would instead be added to the annotations'
`businessRules[]` (alongside `driver-min-age` and `excess-within-value`) with an
authored `reason`, and handled in `runtime/assembly.js` `businessRuleErrors`.

### A conditional whole page

Worked example 2 added an always-applicable page. To make a whole _page_ conditional
(only reached when an earlier answer holds), use the same `if`/`then` mechanism on
the page's required field: leave `parkingLocation` out of the base `required[]` and
add a branch requiring it under the predicate (mirroring how the `claims` step is
live exactly when its `if`/`then` makes `claims` required). `runtime/applicability.js`
`applicableSteps` keys off "does the step own a currently-required field?", so the
step — and its hub task, CYA rows and quote fields — drops out whenever the predicate
is false, and `runtime/mutation.js` `applyAnswer` cascade-clears its answers if a
later edit makes it stop applying. No extra code — the conditional page falls out of
the same schema `if`/`then` that drives a conditional field.
