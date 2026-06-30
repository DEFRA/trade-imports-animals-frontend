# Extending spike B — worked examples

This is a step-by-step cookbook for extending the journey in the **statechart /
FSM** paradigm. Read `README.md` first for the shape of the spike.

> The same two worked examples are used in all four spikes' `EXTENDING.md` so the
> paradigms are directly comparable. The contrast to keep in mind for spike B: the
> model is a **statechart** — states with guarded transitions — and the field
> schema lives in a shared `context.fields` map that each state _references by id_.
> Worked example 1 adds a **field to an existing page**; worked example 2 adds a
> **whole new page** (a new state wired into the transition graph).

## Worked example 1 — a new field on an existing page

> **Add a new question — `estimatedMileage` (estimated annual mileage), a required
> whole-number field with a sensible range — to the vehicle step, so it is asked
> on the page, validated, shown on Check Your Answers, and carried into the
> quote.**

### Where the field list lives in this paradigm

In spike B a step's fields are **not** inlined on the state. The statechart splits
them: `model/machine.json` has

- a shared **`context.fields`** map — the single field _schema_ (each field's
  `type` + constraints), keyed by field id; and
- each **state** lists the field _ids_ it owns in its `fields` array.

`runtime/steps.js` `fieldsFor(stepId)` rejoins them
(`machine.states[stepId].fields` ids → `machine.context.fields[id]` specs). So
adding a field to a step is **two edits in the same JSON file**: define the schema
once in `context.fields`, then reference its id from the state's `fields` array.
There is no separate `runtime/steps.js` edit — that module reads the machine; it
holds no per-field data of its own.

### What the paradigm gives you for free

Because validation, status, collect and the assembled quote are all _derived_ over
`context.fields`, the two machine edits are most of the work. They give you, with
no further code:

- **Validation** — `lib/page-validator/schemas.js` `numberSchema` reads
  `type:"number"` + `min`/`max`, and `fieldToJoi` reads `required:true`. You get
  "Estimated mileage is required" and an out-of-range message automatically (the
  text comes from `humanize('estimatedMileage')` → "Estimated mileage").
- **Status** — `runtime/status.js` `requiredFields` counts the new required field,
  so the vehicle task only goes "complete" once it is answered.
- **Collect / persistence** — `runtime/mutation.js` `collect` reads every field of
  the step from `fieldsFor`, so the answer is saved.
- **Carried into the quote** — `lib/assembler/transform.js` `transformStepFields`
  iterates the step's fields and `transformField` coerces a `number` with
  `Number(value)` into the domain quote.

What is _not_ derived — and so must be edited by hand — is the **page rendering**
(the per-step Nunjucks partial) and the **Check Your Answers row** (the
presentation catalogue, `lib/sections/data.js`).

### The exact steps

**1. Edit the model — `model/machine.json` (the field schema).** Add the field's
spec to the `context.fields` map (e.g. after `estimatedValue`):

```json
"estimatedMileage": {
  "type": "number",
  "required": true,
  "min": 0,
  "max": 200000
},
```

`type:"number"` + `min`/`max` drive the derived Joi schema; `required:true` makes
it mandatory and counts toward the vehicle step's status.

**2. Edit the model — `model/machine.json` (the owning state).** Add the field id
to the `your-vehicle` state's `fields` array so the state actually owns it:

```json
"your-vehicle": {
  "title": "Your vehicle",
  "fields": [
    "registration",
    "make",
    "model",
    "year",
    "estimatedValue",
    "estimatedMileage"
  ],
  "on": { "SUBMIT": [{ "target": "driving-history" }] }
},
```

Steps 1 + 2 together drive validation, status, collect and quote assembly (see
above) — `fieldsFor('your-vehicle')` now includes the new spec.

**3. Render the input — `templates/partials/your-vehicle.njk`.** The section page
includes one partial per step, and the partial hand-renders each input. Add a
`govukInput` (e.g. after the `estimatedValue` input), wiring `value` to the saved
answer and `errorMessage` to the derived error so a failed submit re-renders it:

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

The `id`/`name` must equal the model field id (`estimatedMileage`) — the collect,
validation and error wiring all key off that name.

**4. Show it on Check Your Answers — `lib/sections/data.js`.** The CYA rows come
from the section catalogue: `endings/check-answers.js` reads
`sectionBySlug.get(stepId).rows(quote)`. Add a row to the `your-vehicle` section's
`rows(quote)` so the answer appears (and gets a Change link) on the CYA page:

```js
{
  key: 'Estimated mileage',
  value: quote.estimatedMileage
    ? `${quote.estimatedMileage} miles`
    : 'Not provided'
}
```

> The other keys in that section object (`schema`, `collect`, `isComplete`) are
> vestigial in this standalone spike — the live path derives those from
> `machine.json` (see the README note). You only need to touch `rows`.

That's it for behaviour. **Three files, four edits**: the model (twice — schema +
owning state), the step partial, the CYA catalogue. Validation, status,
persistence and quote assembly all follow from the machine edits in steps 1–2.

### Files that also change if a test pins the "complete quote"

The unit test `runtime/assembly.test.js` has a `complete` fixture that asserts
`contract.assembleQuote(complete).ok === true`. Making the field **required**
means that fixture must include it, or the test (correctly) fails with a
missing-required error:

```js
const complete = {
  // ...
  registration: 'AB12 CDE',
  estimatedValue: '8000',
  estimatedMileage: '8000'
  // ...
}
```

This is expected: adding a required field changes what "a complete quote" means,
so the fixture has to follow.

### Verification — validated by doing

This example was **performed on the real spike-b code and proven green**, then
reverted so only the docs changed: steps 1–4 plus the `complete` fixture update,
then `npm run test:spike-b` → **18 passed** (the scoped standalone baseline —
interpreter + contract + assembly), then `git checkout -- <files>`. See the
combined verification note at the end of worked example 2 for the full-browser e2e
position.

## Worked example 2 — a whole new page (step)

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own task on
> the hub, asking where the vehicle is kept overnight (`parkingLocation`, a
> required radio) and whether a tracker is fitted (`hasTracker`, an optional
> yes/no), so the page is reachable from the hub, navigable, validated, shown on
> Check Your Answers, gated into the quote completeness, and carried into the
> quote.**

A page is more than a field. In an FSM it adds a **new state** that must be _wired
into the transition graph_ (otherwise the interpreter never reaches it), a _task_
to the hub, and it joins the completeness gate (`contract.allComplete`) that
unlocks "Get your quote". The good news is the same machinery does the heavy
lifting — `section-routes.js` already registers a GET/POST pair for _every_ plain
step, so **no new route file is needed**.

### What the paradigm gives you for free

Adding the state to `model/machine.json` and listing it in a task group gives you,
with no further code:

- **Reachability** — the interpreter (`runtime/interpreter.js`) walks the SUBMIT
  chain; once the new state is on the chain from `initial`, `realizedPath` includes
  it, so `contract.applicableSteps` reports it as live.
- **Routing** — `section-routes.js` `sectionRoutes` filters `contract.steps` to
  those whose `stepKind` is `undefined` and registers GET/POST for each, so
  `…/{id}/vehicle-security` exists automatically.
- **Validation, status, collect, assembly** — exactly as for a field
  (`lib/page-validator`, `runtime/status.js`, `runtime/mutation.js`,
  `lib/assembler/transform.js`): the new required `parkingLocation` makes the step
  (and the quote) incomplete until answered. `transformField` coerces the boolean
  `hasTracker` (`value === 'yes'`) and passes the radio enum through.
- **The completeness gate** — `runtime/status.js` `allComplete` walks the realised
  path, so once `vehicle-security` is on it, `journey/hub.js` `getYourQuoteItem`
  keeps "Get your quote" locked until the page is done.

What you edit by hand is the same two presentation concerns as a field (a partial,
a CYA section) plus **two shell edits**: the task-group entry and — because this is
a statechart — the **transition wiring** in the machine.

### How a radio's option list is produced (verify before rendering)

The new page has a radio, so its option list must reach the partial. In spike B the
option list is **machine-derived**, not hand-listed in the partial:

- The state declares `"itemsFrom": "parkingLocation"` (the field id whose options
  to draw).
- `runtime/view.js` `viewItems(stepId, answers)` reads `state.itemsFrom`, looks up
  `fieldSpec('parkingLocation')`, and — because the type is `radio`, not
  `multi-select` — calls `singleSelectItems` to emit `{ value, text, hint?, checked }`
  items with the saved answer marked `checked`.
- `section-routes.js` `viewModel` passes that as `items: contract.viewItems(stepId,
quote)`, so the partial just renders `items: items`. (This is the same path the
  `cover-type` radio uses.) The boolean `hasTracker` has no `itemsFrom`, so its
  yes/no items are written inline in the partial.

### The exact steps

**1. Add the field schemas — `model/machine.json` (`context.fields`).** Define the
two new fields (e.g. after `extras`):

```json
"parkingLocation": {
  "type": "radio",
  "required": true,
  "options": [
    { "value": "garage", "text": "In a locked garage" },
    { "value": "driveway", "text": "On a private driveway" },
    { "value": "street", "text": "On the street" }
  ]
},
"hasTracker": { "type": "boolean" }
```

**2. Add the state and wire the transition graph — `model/machine.json`
(`states`).** This is the FSM-specific edit: a new state alone is dead unless a
transition reaches it. Repoint the previous state's SUBMIT at the new state and
give the new state a SUBMIT onward (here, insert between `optional-extras` and
`addons`):

```json
"optional-extras": {
  "title": "Optional extras",
  "itemsFrom": "extras",
  "fields": ["extras"],
  "on": { "SUBMIT": [{ "target": "vehicle-security" }] }
},
"vehicle-security": {
  "title": "Vehicle security",
  "itemsFrom": "parkingLocation",
  "fields": ["parkingLocation", "hasTracker"],
  "on": { "SUBMIT": [{ "target": "addons" }] }
},
```

`itemsFrom` is what `runtime/view.js` `viewItems` keys off to build the radio
items. The state must be reachable from `initial` via the SUBMIT chain or
`realizedPath` will never include it — which is why step 2 _moves_ the
`optional-extras` target rather than only adding a state.

**3. Put it on the hub — `journey/config.js`.** Add a task group so the step shows
as a hub task and is reachable. A single-step group returns to the hub after Save:

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

`journey/hub.js` `hubViewModel` maps every group to a task and derives its status
tag from `contract.status`. Navigation (`runtime/navigation.js` `next`/`prev`) clips
the machine's transition target to the _current_ group (`groupOf`), so a single-step
group's Save resolves to the hub (the target `addons` is in no group) — `journey/links.js`
`resolveNav` turns the `{ terminal: 'hub' }` sentinel into the hub URL.

**4. Render the page — `templates/partials/vehicle-security.njk`.** A new partial,
included by `templates/section-page.njk` via the step slug. Render the radio from
`items` (the runtime's option list, see above) and the boolean inline, wiring
`errorMessage`:

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

**5. Add a Check Your Answers section — `lib/sections/data.js`.** Add a section
object (`slug` must equal the step id) with the rows for the page. CYA walks
`contract.applicableSteps` and looks each step up by slug, so the row appears in
machine-path order:

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

That's it. **Four files, five edits**: the model (twice — the field schemas, then
the state + transition wiring), the task-group config, the new partial, the CYA
catalogue. Routing, validation, status, navigation, the quote gate and the
assembled quote all follow from steps 1–3. As with a field, the `complete` fixture
in `runtime/assembly.test.js` must gain `parkingLocation: 'garage'` (the new
required answer) for the "valid quote" test to stay green.

> **Why no new route file?** `section-routes.js` is generic over the model —
> `sectionRoutes` registers a GET/POST for every plain step. Only `loop` and
> `subtasks` steps (which set `kind` on the state and own bespoke pages, like
> `claims`/`addons`) need their own route module.

### Verification — validated by doing

Both worked examples were **performed on the real spike-b code and proven green**,
then reverted so only the docs changed:

1. Applied each example's edits in turn (worked example 2: steps 1–5 plus the
   `complete` fixture gaining `parkingLocation: 'garage'`).
2. Ran `npm run test:spike-b` → **18 passed** (the scoped standalone baseline —
   interpreter + contract + assembly). The `assembleQuote` test stays green because
   the new required answers are present in the fixture; the page-slice and
   navigation tests are unaffected.
3. Reverted every code edit with `git checkout -- <files>` (and `git clean -f` for
   the one new untracked partial — `git checkout`/`git clean` only, never
   `rm`/`sed`), leaving only this documentation changed and the spike's behaviour
   unchanged.

Scoped unit verification was done **by doing** for spike B (the edits, run, revert).
The **full browser e2e** (render → navigate → validate → quote-gate → confirmation)
was proven on **spike-a** as the representative spike, using the same mechanism — the
shared walk `prototypes/e2e/journey.js` taught to complete the new task only when its
hub link is present (so the other journeys, which have no such step, stay green) —
then reverted. It is not re-run here to avoid a port clash with the parallel spike-a
e2e proof and the suite's identical-behaviour constraint. The browser path is
paradigm-agnostic at that layer (it drives the rendered GOV.UK pages, not the
runtime), so the spike-a proof transfers: spike B's pages render and gate
identically.

The takeaway: in this paradigm a real (non-throwaway) new _page_ is mostly a
**graph edit** — a new state plus the transitions that make it reachable — and the
interpreter, status, validation and assembly all follow from the machine. The
spike's own runtime needed **no** change.

## Variations

### Make the question conditional (only required when another answer is X)

This is the most paradigm-divergent part of the FSM, and spike B has **two**
distinct places conditionality can live, depending on what you mean:

- **A conditional _field_ on the same step** — "estimated mileage is only required
  when X" — is a `requiredWhen` condition object on the field _schema_ in
  `context.fields`, exactly like the existing `excessAmount`:

  ```json
  "estimatedMileage": {
    "type": "number",
    "min": 0,
    "max": 200000,
    "requiredWhen": { "field": "coverType", "eq": "comprehensive" }
  }
  ```

  - **Where it is enforced.** `runtime/status.js` `requiredFields` and
    `lib/page-validator/date-rules.js` `applyConditionalRequired` both call
    `evalCondition(field.requiredWhen, answers)` (`lib/conditions.js`).
    `lib/assembler/errors.js` `isFieldRequired` does the same for whole-object
    assembly. The field is only flagged missing when the predicate holds.
  - **How "why is this asked?" is derived.** `lib/conditions.js` `provenance`
    flattens the same `requiredWhen` object into its leaf `{ field, eq }` entries,
    and `lib/assembler/errors.js` `reasonFor` turns each into
    `You answered "comprehensive" for Cover type`. The provenance comes _for free_
    from the very object that decides requiredness.

- **A conditional _step_ (the FSM signature)** — "this whole page is only reached
  when X" — is a **guard on a transition**, the way `driving-history → claims`
  carries `"guard": { "field": "hadClaims", "eq": "yes" }`. To make worked example
  2's page conditional, guard the transition into it:

  ```json
  "optional-extras": {
    "on": {
      "SUBMIT": [
        { "target": "vehicle-security", "guard": { "field": "coverType", "eq": "comprehensive" } },
        { "target": "addons" }
      ]
    }
  }
  ```

  The interpreter (`runtime/interpreter.js`) only follows a transition whose guard
  holds, so `realizedPath` simply omits `vehicle-security` when the guard fails —
  there is **no separate "applies?" predicate**, and `runtime/mutation.js`
  `applyAnswer` cascade-clears its answers if a later edit makes it drop off the
  path. The _provenance_ of a conditional step is derived from the graph, not
  authored: `incomingGuard` reads the guard on the realised transition into the
  step, and `runtime/navigation.js` `provenanceForStep` flattens it — so the Check
  Your Answers soft prompt can say _why_ the step is being asked. **The guard data
  is both the routing rule and its explanation.**

A whole-quote **business rule** (e.g. "mileage must be ≤ some limit") would instead
be added to the machine's top-level `rules[]` (alongside `driver-min-age` and
`excess-within-value`) with an authored `reason`, and handled in
`lib/assembler/errors.js`.
