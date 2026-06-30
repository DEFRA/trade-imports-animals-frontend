# Extending spike A — a worked example

This is a step-by-step cookbook for adding a new question to the journey in the
**declarative config + selectors** paradigm. Read `README.md` first for the shape
of the spike.

> The same two worked examples are used in all four spikes' `EXTENDING.md` so the
> paradigms are directly comparable. Spike A is the one to compare against: here
> the model is data and almost everything is _derived_ from it. Worked example 1
> adds a **field to an existing page**; worked example 2 adds a **whole new page**.

## Worked example 1 — a new field on an existing page

> **Add a new question — `estimatedMileage` (estimated annual mileage), a required
> whole-number field with a sensible range — to the vehicle step, so it is asked
> on the page, validated, shown on Check Your Answers, and carried into the
> quote.**

### What the paradigm gives you for free

Because validation, status, the answer cascade and the assembled quote are all
_derived_ from `model/journey.json`, declaring the field in the model is most of
the work. Adding one field entry to the `your-vehicle` step gives you, with no
further code:

- **Validation** — `validation/compile/field-schemas.js` `numberSchema` reads
  `type:"number"` + `min`/`max`, and `fieldToJoi` reads `required:true`. You get
  "Estimated mileage is required" and range messages automatically (the message
  text comes from `humanize('estimatedMileage')` → "Estimated mileage").
- **Status** — `runtime/selectors/status.js` `requiredFields` counts the new
  required field, so the vehicle task only goes "Completed" once it is answered.
- **Collect / persistence** — `runtime/selectors/mutation.js` `collect` reads
  every field of the step from the model, so the answer is saved.
- **Carried into the quote** — `validation/assemble/transform.js` `toDomain`
  iterates the model's applicable fields and runs `transformField`; a `number`
  field is coerced with `Number(value)` into the domain quote.

What is _not_ derived — and so must be edited by hand — is the **page rendering**
(the per-step Nunjucks partial) and the **Check Your Answers row** (the
presentation catalogue).

### The exact steps

**1. Edit the model — `model/journey.json`.** Add the field to the
`your-vehicle` step's `fields` array (the declarative config entry):

```json
{
  "id": "estimatedMileage",
  "type": "number",
  "required": true,
  "min": 0,
  "max": 200000
}
```

That single entry drives validation, status, collect and quote assembly (see
above). `min`/`max` give the "sensible range"; `required:true` makes it
mandatory.

**2. Render the input — `templates/partials/your-vehicle.njk`.** The section page
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

The `id`/`name` must equal the model field `id` (`estimatedMileage`) — the
collect, validation and error wiring all key off that name.

**3. Show it on Check Your Answers — `lib/sections/definitions.js`.** Add a row to
the `your-vehicle` section's `rows(quote)` so the answer appears (and gets a
Change link) on the CYA page:

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
> `journey.json` (see the README note). You only need to touch `rows`.

That's it for behaviour. **Three files**: the model, the step partial, the CYA
catalogue. Validation, status, persistence and quote assembly all follow from
step 1.

### Files that also change if a test pins the "complete quote"

The unit test `validation/assemble.test.js` has a `completeAnswers` fixture that
asserts `assembleQuote(...).ok === true`. Making the field **required** means that
fixture must include it, or the test (correctly) fails with a missing-required
error:

```js
const completeAnswers = {
  // ...
  estimatedValue: '8000',
  estimatedMileage: '8000'
  // ...
}
```

This is expected: adding a required field changes what "a complete quote" means,
so the fixture has to follow.

## Verification — these steps were validated by doing

The steps above were **performed on the real code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–3 plus the `completeAnswers` fixture update.
2. The shared end-to-end helper `prototypes/e2e/journey.js` `fillVehicle` walks
   _every_ journey (it lives in the harness, outside this spike). Because the new
   field is required, that walk was temporarily taught to fill it **only when the
   control is present** (`if (await mileage.count()) await mileage.fill('8000')`),
   so the other seven journeys stay green.
3. Ran `npm run test:spike-a` → **25 passed** (the standalone baseline) and
   `npm run test:prototype` → **45 passed** (incl. `standalone spike-a … start to
confirmation`).
4. Reverted every code edit with `git checkout -- <files>` (using `git checkout`,
   not `rm`/`sed`), leaving only this documentation changed and the spike's
   behaviour unchanged.

The takeaway: in this paradigm a real (non-throwaway) addition of a _required_
field also touches whatever already encodes "a complete quote" — here the unit
fixture, and the shared demo walk. The spike's own runtime needed **no** change.

## Worked example 2 — a whole new page (step)

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own task on
> the hub, asking where the vehicle is kept overnight (`parkingLocation`, a
> required radio) and whether a tracker is fitted (`hasTracker`, an optional
> yes/no), so the page is reachable from the hub, navigable, validated, shown on
> Check Your Answers, gated into the quote completeness, and carried into the
> quote.**

A page is more than a field: it adds a _step_ to the model, a _task_ to the hub,
and it joins the completeness gate (`contract.allComplete`) that unlocks "Get your
quote". The good news is the same declarative machinery does the heavy lifting —
`routes/section.js` already registers a GET/POST pair for _every_ plain step, so
**no new route file is needed**.

### What the paradigm gives you for free

Declaring the step in `model/journey.json` (and listing it in a task group) gives
you, with no further code:

- **Routing** — `routes/section.js` `sectionRoutes` filters `contract.steps` to
  those whose `stepKind` is `undefined` and registers GET/POST for each, so
  `…/{id}/vehicle-security` exists automatically.
- **Validation, status, collect, assembly** — exactly as for a field
  (`validation/compile`, `runtime/selectors/status.js`, `mutation.js`,
  `validation/assemble/transform.js`): the new required `parkingLocation` makes the
  step (and the quote) incomplete until answered.
- **The completeness gate** — `runtime/selectors/status.js` `allComplete` now
  counts the new applicable step, so `journey/hub-view-model.js` `getYourQuoteItem`
  keeps "Get your quote" locked until the page is done.

What you edit by hand is the same two presentation concerns as a field (a partial,
a CYA section) plus **two shell edits**: the task-group entry and — because the new
step has option lists — its option rendering.

### The exact steps

**1. Add the step to the model — `model/journey.json`.** Add a step object to
`steps[]` (here before the `addons` step). Set `itemsFrom` to the radio field id so
the runtime emits its option list:

```json
{
  "id": "vehicle-security",
  "title": "Vehicle security",
  "itemsFrom": "parkingLocation",
  "fields": [
    {
      "id": "parkingLocation",
      "type": "radio",
      "required": true,
      "options": [
        { "value": "garage", "text": "In a locked garage" },
        { "value": "driveway", "text": "On a private driveway" },
        { "value": "street", "text": "On the street" }
      ]
    },
    { "id": "hasTracker", "type": "boolean" }
  ]
}
```

`itemsFrom` is what `runtime/selectors/view.js` `viewItems` keys off to build the
radio items (with `checked` state); a step without option fields omits it.

**2. Put it on the hub — `journey/config.js`.** Add a task group so the step shows
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

`journey/hub-view-model.js` `hubViewModel` maps every group to a task and derives
its status tag from `contract.status`; navigation (`runtime/selectors/navigation.js`)
walks the live steps _within a group_, so a single-step group's Next/Back is the
hub.

**3. Render the page — `templates/partials/vehicle-security.njk`.** A new partial,
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

**4. Add a Check Your Answers section — `lib/sections/definitions.js`.** Add a
section object (`slug` must equal the step id) with the rows for the page:

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

That's it. **Four files**: the model (the new step), the task-group config, the new
partial, the CYA catalogue. Routing, validation, status, navigation, the quote gate
and the assembled quote all follow from steps 1–2. As with a field, the
`completeAnswers` fixture in `validation/assemble.test.js` must gain
`parkingLocation` (the new required answer) for the "valid quote" test to stay
green.

> **Why no new route file?** `routes/section.js` is generic over the model —
> `sectionRoutes` registers a GET/POST for every plain step. Only `loop` and
> `subtasks` steps (which set `kind` and own bespoke pages, like `claims`/`addons`)
> need their own route module.

### Verification — validated by doing

Worked example 2 was **performed on the real spike-a code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–4 plus the `completeAnswers` fixture update.
2. `npm run test:spike-a` → **25 passed** (the standalone baseline) with the new
   page in place.
3. For the browser path, the shared end-to-end walks (`prototypes/e2e/journey.js`
   `walkGroupedToCheckAnswers` and `task-list-with-linear-tasks.spec.js`) reach
   "Get your quote", which is now gated by the new required page. They were
   temporarily taught to complete the new task **only when its hub link is present**
   (so the other journeys, which have no such step, are unaffected); with that,
   `npm run test:prototype` → **45 passed** (incl. `standalone spike-a … start to
confirmation`), proving the page renders, navigates, validates and lets the
   journey reach confirmation.
4. Reverted every code edit with `git checkout -- <files>`, leaving only this
   documentation changed and the spike's behaviour unchanged.

## Variations

### Make the question conditional (only required when another answer is X)

In spike A the conditional/requiredness lives **in the model as data**: add a
`requiredWhen` predicate to the field instead of `required:true`. For example,
"estimated mileage is only required for comprehensive cover" (illustrative — cover
type is a later step, so in practice pick a field on the same or an earlier step):

```json
{
  "id": "estimatedMileage",
  "type": "number",
  "min": 0,
  "max": 200000,
  "requiredWhen": { "field": "coverType", "eq": "comprehensive" }
}
```

- **Where it is enforced.** `runtime/selectors/status.js` `requiredFields` and
  `validation/compile/index.js` `applyConditionalRequired` both call
  `evalCondition(field.requiredWhen, answers)`. Page-slice validation only flags
  it missing when the predicate holds; the task status only needs it then too.
- **How "why is this asked?" is derived.** `runtime/conditions.js` `provenance`
  flattens the same `requiredWhen` object into its leaf `{ field, eq }` entries,
  and `validation/assemble/required-errors.js` `reasonFor` turns each into
  `You answered "comprehensive" for Cover type`. The provenance comes _for free_
  from the very object that decides requiredness — you author no separate reason
  string. This is the paradigm's signature trait: **the condition data is both the
  rule and its explanation.**

A whole-quote **business rule** (e.g. "mileage must be ≤ some limit for a given
cover") would instead be added to the model's top-level `rules[]` (alongside
`driver-min-age` and `excess-within-value`) and handled in
`validation/assemble/business-rules.js`.

### A conditional whole page

Worked example 2 added an always-applicable page. To make a whole _page_ conditional
(only reached when an earlier answer holds), give its step an `appliesWhen` predicate
— the same condition data used for the `claims` step
(`"appliesWhen": { "field": "hadClaims", "eq": "yes" }`).
`runtime/selectors/status.js` `applicableStepIds` then drops the step (and its hub
task, CYA rows and quote fields) whenever the predicate is false, and
`mutation.js` `applyAnswer` cascade-clears its answers if a later edit makes it stop
applying — no extra code.
