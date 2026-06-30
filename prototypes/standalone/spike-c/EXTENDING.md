# Extending spike C — worked examples

This is a step-by-step cookbook for extending the journey in the
**requirement-graph rules engine** paradigm. Read `README.md` first for the shape
of the spike.

> The same two worked examples are used in all four spikes' `EXTENDING.md` so the
> paradigms are directly comparable. Spike C's distinctive trait: the model is
> split into a typed data file (`model/fields.json`) and a separate rules layer
> (`model/rules.json`), and requirements carry an **authored** reason. Worked
> example 1 adds a **field to an existing page**; worked example 2 adds a **whole
> new page**.

## Worked example 1 — a new field on an existing page

> **Add a new question — `estimatedMileage` (estimated annual mileage), a required
> whole-number field with a sensible range — to the vehicle step, so it is asked
> on the page, validated, shown on Check Your Answers, and carried into the
> quote.**

### How "required" is expressed in this spike

Verify this before you start, because it is the crux of the paradigm:

- **Unconditional requiredness is a field flag**, not a rule. A field with
  `"required": "always"` in `model/fields.json` is seeded into the engine's
  required set with **no reason** — `alwaysRequiredFields()` in
  `runtime/engine/evaluation.js` maps it to an empty `because`. The engine test
  pins this: _"an unconditional requirement has no because reason"_.
- **Conditional requiredness is a rule** in `model/rules.json` — a `require` rule
  with a `when` condition and an **authored `reason`**, folded in by
  `accumulateRuleEffects()` only when its `when` holds (e.g. the
  `excess-amount-when-voluntary` rule). The reason becomes the field's `because`.

So a plain required field (this worked example) is **a `fields.json` flag only — no
rules.json edit**. The conditional case is covered under "Variations".

### What the paradigm gives you for free

Because validation, status, the cascade and the assembled quote are all _derived_
from the model through the engine + contract, declaring the field in
`model/fields.json` is most of the work. Adding one field entry to the
`your-vehicle` step gives you, with no further code:

- **Validation** — `contract.validate` (`runtime/contract/assembly.js`) reads the
  field spec via `fieldsFor`, and `lib/page-validator/schema-builders.js`
  `numberSchema` reads `type:"number"` + `min`/`max`; `makePageValidator`'s
  `fieldToJoi` reads `required:true` (from the `"always"` flag). You get
  "Estimated mileage is required" and "Estimated mileage is out of range"
  automatically (message text comes from `humanize('estimatedMileage')` →
  "Estimated mileage").
- **Required-ness + status** — `runtime/engine/evaluation.js`
  `alwaysRequiredFields()` adds the field to `requiredByField`, so
  `runtime/contract/status.js` only marks the vehicle task "Completed" once it is
  answered, and `runtime/engine/missing-required.js` lists it (with an empty
  `because`) until then.
- **Collect / persistence** — `runtime/contract/mutation.js` `collect` reads every
  field of the step from the model, so the answer is saved.
- **Carried into the quote** — `lib/assembler/transform.js` `transformField`
  coerces a `number` field with `Number(value)` into the domain quote (the
  applicable-step fold in `assembly.js` includes it via `fieldsFor`).

What is _not_ derived — and so must be edited by hand — is the **page rendering**
(the per-step Nunjucks partial) and the **Check Your Answers row** (the
presentation catalogue).

### The exact steps

**1. Edit the data model — `model/fields.json`.** Add the typed field to the
`fields{}` map, keyed by id, pointing it at the `your-vehicle` step:

```json
"estimatedMileage": {
  "step": "your-vehicle",
  "type": "number",
  "required": "always",
  "min": 0,
  "max": 200000
}
```

That single entry drives validation, required-ness, status, collect and quote
assembly (see above). `type:"number"` + `min`/`max` give the "sensible range";
`"required": "always"` makes it unconditionally mandatory **with no rule needed**.

**2. Render the input — `templates/partials/your-vehicle.njk`.** The section page
includes one partial per step, and the partial hand-renders each input. Add a
`govukInput` (e.g. before the file-upload control), wiring `value` to the saved
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
> `fields.json`/`rules.json` through the contract (see the README note). You only
> need to touch `rows`.

That's it for behaviour. **Three files**: the data model, the step partial, the
CYA catalogue. Validation, required-ness, status, persistence and quote assembly
all follow from step 1.

### What is derived vs hand-edited

| Concern                    | Derived (engine/contract — no edit)                                | Hand-edited                           |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Page-slice validation      | `contract.validate` from the field's `type`/`min`/`max`/`required` | —                                     |
| Required-ness + provenance | engine `requiredByField` (empty `because` for an `"always"` field) | —                                     |
| Task status                | `contract.status` counts the new required field                    | —                                     |
| Collect + persistence      | `contract.collect` reads the field from the model                  | —                                     |
| Quote assembly             | `transform.transformField` coerces the `number`                    | —                                     |
| Page input                 | —                                                                  | `templates/partials/your-vehicle.njk` |
| CYA row                    | —                                                                  | `lib/sections/definitions.js` `rows`  |

### Files that also change if a test pins the "complete quote"

The unit test `runtime/contract/contract.test.js` has a `complete` fixture that
asserts `contract.assembleQuote(complete).ok === true`. Making the field
**required** means that fixture must include it, or the test (correctly) fails
with a missing-required error:

```js
const complete = {
  // ...
  estimatedValue: '8000',
  estimatedMileage: '8000'
  // ...
}
```

This is expected: adding a required field changes what "a complete quote" means,
so the in-spike fixture has to follow.

### Verification — these steps were validated by doing

Worked example 1 was **performed on the real spike-c code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–3 (the `fields.json` field with `"required": "always"`, the
   `your-vehicle.njk` input, the CYA `rows` entry) plus the `complete` fixture
   update in `runtime/contract/contract.test.js`.
2. Ran `npm run test:spike-c` → **11 passed** (the standalone baseline — engine +
   contract). With the field required and the fixture updated, the assemble test
   stays green; the _"unconditional requirement has no because"_ engine test still
   holds because an `"always"` field is seeded with an empty `because`.
3. The full browser e2e (`npm run test:prototype`) was not run here — it shares one
   server, so it was proven on spike-a as the representative (the shared walk
   `prototypes/e2e/journey.js` `fillVehicle` fills
   registration/make/model/year/estimatedValue but **not** mileage, so it was
   taught to fill the control only when present), then reverted. Spike-c was
   verified by the scoped unit suite.
4. Reverted every code edit with `git checkout -- <files>` (using `git checkout`,
   not `rm`/`sed`), leaving only this documentation changed and the spike's
   behaviour unchanged.

The takeaway: in this paradigm a real (non-throwaway) addition of a _required_
field also touches whatever already encodes "a complete quote" — here the in-spike
unit fixture. The engine and contract needed **no** change; the required-ness fell
out of one `fields.json` flag.

## Worked example 2 — a whole new page (step)

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own task on
> the hub, asking where the vehicle is kept overnight (`parkingLocation`, a
> required radio) and whether a tracker is fitted (`hasTracker`, an optional
> yes/no), so the page is reachable from the hub, navigable, validated, shown on
> Check Your Answers, gated into the quote completeness, and carried into the
> quote.**

A page is more than a field: it adds a _step_ to the model, a _task_ to the hub,
and it joins the completeness gate (`contract.allComplete`) that unlocks "Get your
quote". The good news is the same engine + contract do the heavy lifting —
`section-routes.js` already registers a GET/POST pair for _every_ plain step, so
**no new route file is needed**. And because `parkingLocation` is unconditionally
required, this is still a `"required": "always"` field flag — **no `rules.json`
edit**.

### What the paradigm gives you for free

Declaring the step in `model/fields.json` (and listing it in a task group) gives
you, with no further code:

- **Routing** — `section-routes.js` `sectionRoutes` filters `contract.steps` to
  those whose `stepKind` is `undefined` and registers GET/POST for each, so
  `…/{id}/vehicle-security` exists automatically (vehicle-security has no `kind`).
- **Radio option list** — the step's `itemsFrom: "parkingLocation"` is what
  `runtime/contract/view.js` `viewItems` keys off; `radioItems` builds the
  `{ value, text, hint, checked }` items and `section-routes.js`'s view model
  passes them to the partial as `items` (exactly as the `cover-type` step does).
- **Validation, required-ness, status, assembly** — exactly as for a field. The
  required `parkingLocation` is seeded by `runtime/engine/evaluation.js`
  `alwaysRequiredFields()`; `lib/page-validator/schema-builders.js` `radioSchema`
  validates the value against the options and `.required()` enforces presence;
  `runtime/contract/status.js` keeps the task incomplete until answered.
- **The completeness gate** — `runtime/contract/status.js` `allComplete` now counts
  the new applicable step, so `journey/hub-view.js` `getYourQuoteItem` keeps "Get
  your quote" locked (`Cannot start yet`) until the page is done.
- **Carried into the quote** — `lib/assembler/transform.js` `transformField`
  returns the `radio` value as-is and coerces the `boolean` `hasTracker` to
  `value === 'yes'`; `runtime/contract/assembly.js`'s `getStep` includes both via
  `fieldsFor`.

What you edit by hand is the same two presentation concerns as a field (a partial,
a CYA section) plus **one shell edit**: the task-group entry.

### The exact steps

**1. Add the step + fields to the data model — `model/fields.json`.** Add a step
object to `steps[]` (here before the `addons` step), with `itemsFrom` set to the
radio field id so `viewItems` emits its option list; and add the two fields to the
`fields{}` map, each pointing `step` at the new id:

```json
// in steps[]
{
  "id": "vehicle-security",
  "title": "Vehicle security",
  "itemsFrom": "parkingLocation"
}
```

```json
// in fields{}
"parkingLocation": {
  "step": "vehicle-security",
  "type": "radio",
  "required": "always",
  "options": [
    { "value": "garage", "text": "In a locked garage" },
    { "value": "driveway", "text": "On a private driveway" },
    { "value": "street", "text": "On the street" }
  ]
},
"hasTracker": { "step": "vehicle-security", "type": "boolean" }
```

Note where the radio's options live: **inline on the field in `fields.json`**,
exactly as `coverType` and `extras` declare theirs — there is no separate options
map. `"required": "always"` on `parkingLocation` makes it mandatory with no rule;
`hasTracker` has no `required`, so it stays optional.

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

`journey/hub-view.js` `hubViewModel` maps every group to a task and derives its
status tag from `contract.status`; navigation (`runtime/contract/navigation.js`)
walks the live steps _within a group_, so a single-step group's Next/Back resolves
to the `{ terminal: 'hub' }` sentinel — Save returns to the hub. No
`journey/paths.js` edit is needed: a plain step resolves to the generic
`{base}/{id}/{stepId}` URL via `pathForStep` (only `loop`/`subtasks` steps get
bespoke segments).

**3. Render the page — `templates/partials/vehicle-security.njk`.** A new partial,
included by `templates/section-page.njk` via the step slug. Render the radio from
`items` (the contract's option list) and the boolean inline (the same hand-rendered
yes/no pattern the `cover-type` partial uses for `voluntaryExcess`):

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
section object (`slug` must equal the step id — `endings-routes/view-models.js`
`answerRows` looks it up by `sectionBySlug.get(stepId)`) with the rows for the
page:

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

That's it. **Four files**: the data model (the new step + fields), the task-group
config, the new partial, the CYA catalogue. Routing, validation, required-ness,
status, navigation, the quote gate and the assembled quote all follow from steps
1–2. As with a field, the `complete` fixture in `runtime/contract/contract.test.js`
must gain `parkingLocation: 'garage'` (the new required answer) for the "valid
quote" test to stay green.

> **Why no new route file?** `section-routes.js` is generic over the model —
> `sectionRoutes` registers a GET/POST for every plain step. Only `loop` and
> `subtasks` steps (which set `kind` and own bespoke pages, like `claims`/`addons`)
> need their own route module.

### Verification — validated by doing

Worked example 2 was **performed on the real spike-c code and proven green**, then
reverted so only the docs changed:

1. Applied steps 1–4 plus the `complete` fixture update
   (`parkingLocation: 'garage'`) in `runtime/contract/contract.test.js`.
2. Ran `npm run test:spike-c` → **11 passed** (the standalone baseline) with the
   new page in place — proving the engine seeds the new required field, the
   contract validates and assembles it, navigation and status derive correctly, and
   the assemble test still treats `complete` as a valid quote.
3. The full browser e2e (`npm run test:prototype`) was not run here — it shares one
   server, so it was proven on spike-a as the representative, using the same
   mechanism (the shared cross-journey walk taught to complete the new task **only
   when its hub link is present**, so the other journeys are unaffected), then
   reverted. Spike-c was verified by the scoped unit suite.
4. Reverted every code edit with `git checkout -- <files>`, leaving only this
   documentation changed and the spike's behaviour unchanged.

## Variations

### Make the question conditional (only required when another answer is X)

This is the paradigm's signature. Conditional requiredness is **not** a field
flag — it is a `require` rule in `model/rules.json`, with the reason **authored
once** in the rule. Model it on the existing `excess-amount-when-voluntary` rule:

```json
{
  "id": "mileage-required-when-comprehensive",
  "kind": "require",
  "when": { "field": "coverType", "eq": "comprehensive" },
  "require": ["estimatedMileage"],
  "reason": "You chose comprehensive cover, which is priced on annual mileage"
}
```

(Illustrative — `coverType` is a later step, so in practice pick a condition on
the same or an earlier step.) With this you would **drop** the `"required":
"always"` flag from the `fields.json` entry and let the rule own requiredness.

- **How the engine reads it.** `runtime/engine/evaluation.js`
  `accumulateRuleEffects()` walks the rules, and for each `require` rule whose
  `when` holds (`evalCondition(rule.when, answers)`) pushes its `reason` onto
  `requiredByField` for every id in `require`. So the field is required _only_
  when the condition is true. `runtime/contract/view.js` `requiredWhenFor` maps
  the same rule's `when` onto the field's `requiredWhen`, so the page-slice
  validator enforces the within-page conditional from the same data.
- **How "why is this asked?" is derived.** `runtime/engine/missing-required.js`
  `normalStepMissing` attaches `because: asReasons(snapshot.requiredByField.get(
fieldId))` — i.e. the rule's **authored** `reason`, verbatim. That `because`
  surfaces on Check Your Answers as the soft-prompt text via
  `endings-routes/view-models.js` `softPrompts` → `provenanceText`. This is the
  paradigm's defining move: **the reason is authored once in the rule and carried
  through as provenance**, not synthesised from the condition shape (contrast
  spike-a, which _derives_ the reason from the `{ field, eq }` data).

A whole-quote **business assertion** (e.g. "mileage must be ≤ some limit") would
instead be a `min-age`/`lte`-style rule in `model/rules.json` (alongside
`driver-min-age` and `excess-within-value`), handled by
`runtime/engine/assertions.js` `assertionErrors` — again, message = authored
`reason`.

### Make a whole page conditional (only reached when an earlier answer holds)

Worked example 2 added an always-applicable page. Spike-c's _supported_ conditional
page is a **conditional loop step**, as `claims` already demonstrates: the step is
declared with `kind: "loop"` and made live by a `require` rule with `appliesStep`
and an authored reason —

```json
{
  "id": "claims-required-when-had-claims",
  "kind": "require",
  "when": { "field": "hadClaims", "eq": "yes" },
  "appliesStep": "claims",
  "reason": "You said you have had a claim in the last 5 years"
}
```

`runtime/engine/evaluation.js` `accumulateRuleEffects()` records the live step in
`liveStepReasons`, and `runtime/engine/missing-required.js` `applicableSteps` keeps
it only while a rule keeps it live (`step.kind !== 'loop' || liveStepReasons.has(
step.id)`); `runtime/contract/mutation.js` `applyAnswer` cascade-clears its answers
if a later edit makes it stop applying.

One honest paradigm caveat: that gate is **scoped to `loop` steps** —
`applicableSteps` treats every _plain_ step as always applicable. So gating a plain
page like `vehicle-security` on a condition is not free here; it would need a
one-line engine extension to `applicableSteps`'s `stepApplies` to also consult
`liveStepReasons` for a rule-targeted normal step. This is the rules-engine's
trade-off versus spike-a, where any step takes an `appliesWhen` predicate as pure
data with no engine change.
