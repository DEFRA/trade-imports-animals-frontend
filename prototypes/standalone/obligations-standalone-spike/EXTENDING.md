# Extending the obligations spike — worked examples

This is a step-by-step cookbook for extending the journey in the
**obligations paradigm**. Read `README.md` first for the shape of the spike.

> The same two worked examples are used in all five spikes' `EXTENDING.md` so
> the paradigms are directly comparable. The contrast to keep in mind here:
> the catalogue (`model/obligations.json`) and the Flow (`model/flow.json`)
> are pure data, and **everything downstream — rendering included — is
> derived from them**. The other four spikes all hand-edit a per-step
> Nunjucks partial and a CYA presentation catalogue; this spike has neither.
> Worked example 1 adds a **field to an existing page**; worked example 2
> adds a **whole new page** (its own Section, its own hub task). Example 1
> was validated by doing (edits applied, suite green, edits reverted, suite
> green again); example 2 is code-read-derived and marked as such.

## How this spike differs before you start

Two things the sibling cookbooks cannot say:

1. **There is no template or route edit — for either example.** The twelve
   question pages all render through the one generic `templates/page.njk`;
   `routes/page.js` derives its GET/POST route list from the Flow; the
   obligation's `type` picks the govuk widget through the type-companion
   registry (`lib/fields/registry.js`); the `cyaKey` on a presents entry is
   what puts the answer on Check your answers (`contract/cya-rows/page-rows.js`
   `presentsRows`). Presentation is projected from the model, not authored
   per page.
2. **The pinned tests are the discovery mechanism.** The suite deliberately
   pins the model's counts and parity surfaces — the 30-name catalogue list,
   the reason-code ↔ message lockstep (both directions), the CYA parity row
   sequence, the engine-mandatory set. Adding to the model makes exactly the
   participating pins fail, each one naming a file that encodes "what the
   journey is". Run `npm run test:obligations-standalone-spike` after the
   model edits and let the failures walk you to the rest — that is how the
   file lists below were produced, not by guessing.

## Worked example 1 — a new field on an existing page

> **Add a new question — `mileage` (estimated annual mileage), an optional
> whole-number field with a sensible range — to the Your vehicle page, so it
> is asked on the page, format-validated, shown on Check your answers, and
> saved with the journey.**

(The sibling spikes make their mileage field required. Requiredness in this
paradigm is a separate, deliberate move — the engine-mandatory set — and
worked example 2 demonstrates it; the "Variations" section shows the one-file
delta for making `mileage` mandatory too.)

### What the paradigm gives you for free

Declaring the obligation and presenting it in the Flow gives you, with no
further code:

- **Rendering** — `contract/view.js` `pageViewModel` expands the page's
  presents slots; `type: "number"` dispatches to the `govukInput` builder in
  `lib/fields/input-views.js` via the type-companion registry, and the
  generic `templates/page.njk` renders it. No partial exists to edit.
- **Format validation** — `validation/format-checks.js` `checkNumber` reads
  `type: "number"` + `constraints.min/max` and emits the
  `format.mileage.notNumber` / `.notWholeNumber` / `.outOfRange` finding
  codes, only when the field is filled (a blank optional field never fails).
  The GDS error summary round trip is the generic one in `routes/page.js`.
- **Collect / persistence** — `orchestrator/apply-answers.js` canonicalises
  the posted value by type and writes the fulfilment; the page's slot list
  comes from the Flow, so the new slot is collected automatically.
- **Check your answers** — the `cyaKey` on the presents entry produces the
  row (with its Change link and "Not provided" fallback) through
  `contract/cya-rows/page-rows.js`. No CYA catalogue to edit.
- **Status** — an optional field never moves a task's status, so the hub and
  the journey gate are untouched by design.

What is _not_ free is the paradigm's signature bookkeeping: the reason-code
↔ message lockstep, and the second Flow used by the equivalence harness.

### The exact steps

**1. Add the obligation record — `model/obligations.json`.** Mint a fresh
v4 UUID (committed forever — the UUID is the persistence key, the `name` is
the code/template/i18n binding) and add the record, keeping catalogue order
(here after `estimatedValue`):

```json
{
  "id": "9f2d7c1e-8b4a-4c6d-a3e5-1f0b2d4c6e8a",
  "name": "mileage",
  "type": "number",
  "cardinality": "single",
  "constraints": { "min": 0, "max": 200000 }
}
```

The record carries no label, no page, no required flag — obligations.md:196
forbids scoping, mandate and presentation on the record, and
`model/obligations.test.js` enforces the allowed-keys list.

**2. Present it in the Flow — `model/flow.json`.** Add a presents entry to
the `your-vehicle` page (after the `estimatedValue` entry). The entry owns
every piece of copy, because the record carries none:

```json
{
  "obligation": "9f2d7c1e-8b4a-4c6d-a3e5-1f0b2d4c6e8a",
  "label": "Estimated annual mileage",
  "hint": "Optional. The number of miles you expect to drive in a year",
  "cyaKey": "Mileage"
}
```

`cyaKey` is what creates the Check your answers row; omit it and the answer
is saved but never summarised (as `make`/`model`/`year` do — they compose
the bespoke "Vehicle" row instead).

**3. Present it in the skeleton Flow — `model/skeleton-flow.json`.** The
cross-Flow equivalence harness keeps a second, single-Section Flow over the
SAME catalogue, and `model/flow.test.js` pins that both Flows present all
obligations. Add a bare entry (the skeleton is never rendered, so no copy)
to its `your-vehicle` page:

```json
{ "obligation": "9f2d7c1e-8b4a-4c6d-a3e5-1f0b2d4c6e8a" }
```

**4. Author the format messages — `model/messages.en.json`.** A `number`
obligation can emit three format codes (`validation/format-checks.js`
`formatCodesFor`), and the message catalogue must carry copy for every
emittable code — `i18n/resolve.js` throws on unknown keys so a raw code can
never reach the DOM:

```json
"format.mileage.notNumber": "Mileage must be a number",
"format.mileage.notWholeNumber": "Mileage must be a whole number",
"format.mileage.outOfRange": "Mileage is out of range",
```

**5. Register the codes — `engine/reasons.js`.** The reason-code registry is
kept in lockstep with the message catalogue _both ways_
(`engine/reasons.test.js`), so the three codes need developer-facing
explanations in the `EXPLANATIONS` table:

```js
'format.mileage.notNumber': 'filled mileage is not numeric',
'format.mileage.notWholeNumber': 'filled mileage is not a whole number',
'format.mileage.outOfRange': 'filled mileage is outside 0-200000',
```

This is the only `.js` edit, and it is a data table, not logic.

That's it for behaviour. **Five files**: the catalogue, the two Flows, the
message catalogue, the reason registry. Rendering, validation, persistence
and the CYA row all follow from steps 1–2.

### The pinned tests that then name themselves

Running `npm run test:obligations-standalone-spike` after steps 1–5 fails
exactly the count/parity pins, each naming its file:

| Pin                              | File                              | Edit                                                           |
| -------------------------------- | --------------------------------- | -------------------------------------------------------------- |
| The 30-name catalogue list       | `model/obligations.test.js`       | add `'mileage'` to `EXPECTED_NAMES` (after `'estimatedValue'`) |
| Evaluation covers 30 obligations | `engine/index.test.js`            | `toHaveLength(30)` → `31`                                      |
| Load-model integration counts    | `engine/load-model.test.js`       | `toHaveLength(30)` / `identifiers.size` `30` → `31`            |
| CYA parity row sequence          | `contract/cya-rows/index.test.js` | add `'Mileage'` after `'Estimated value'`                      |
| CYA parity row sequence (view)   | `contract/view.test.js`           | add `'Mileage'` after `'Estimated value'`                      |

Ten files total: five model/data edits, five pin updates. Adding a field
changes what the journey _is_, and these pins are where the suite has
written that down — they are the discovery, not a chore.

### What you did NOT have to touch

- **No template** — `templates/page.njk` and `templates/partials/fields.njk`
  are generic over the slot list; the number input appears because the model
  says so.
- **No route** — `routes/page.js` derives its routes from the Flow.
- **No widget code** — `lib/fields/` already has the `number` companion.
- **No validation code** — `checkNumber` reads the record's constraints.
- **No CYA code** — `presentsRows` reads the `cyaKey`.
- **No engine, flow-eval, orchestrator, contract or store change** — the
  evaluators are (model, state)-parameterised; a bigger model is just a
  bigger input.

The two evaluators and the whole rendering pipeline treated the new field as
data. The paradigm's overhead went instead into its honesty machinery: the
skeleton Flow (so equivalence stays meaningful) and the reason-code lockstep
(so no message can be missing).

### Verification — validated by doing

The steps above were **performed on the real code and proven green**, then
reverted so only this document changed:

1. Applied steps 1–5 plus the five pin updates.
2. Ran `npm run test:obligations-standalone-spike` → **633 passed (85
   files)** — the standalone baseline count, with the field in place. The
   alignment walker (tier 2) proved the rendered control ↔ model alignment,
   completability (tier 3) still completed all 162 enumerated states, and
   the cross-Flow equivalence (tier 4) held over both edited Flows — none of
   the tier files needed edits.
3. Reverted every edit exactly (restoring the original file contents — this
   spike's folder is not yet under version control, so the revert was done
   by inverse edits, not `git checkout`) and re-ran the suite → **633 passed
   (85 files)** again, proving the revert exact.
4. The three shared Playwright specs need no tolerance edit for this
   example: the field is optional and page-soft, so the shared walk in
   `prototypes/e2e/journey.js` (which never fills it) stays green as-is. If
   you validate a _required_ variant live, use the mechanism the other
   spikes' proofs used: teach the shared walk to fill the control **only
   when it is present** (`if (await mileage.count()) await
mileage.fill('8000')`), run `npm run test:prototype`, then revert — so
   the other journeys are unaffected and only the docs change.

## Worked example 2 — a whole new page (code-read-derived)

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own
> task on the hub, asking where the vehicle is kept overnight
> (`parkingLocation`, a required radio) and whether a tracker is fitted
> (`hasTracker`, an optional yes/no), so the page is reachable from the hub,
> navigable, validated, shown on Check your answers, gated into the journey
> completeness, and saved with the journey.**

Unlike worked example 1 this was **not performed live** — the file list
below is derived by reading the code and the pinned tests, following the
same trail example 1 proved out. Treat it as a map, and let the suite
confirm it the day you walk it.

A page is more than a field. In this paradigm it adds a **Section to the
Flow** (a new top-level Container group with one Page), a **group to the hub
literal**, and — because `parkingLocation` is required — a name in the
**engine-mandatory set**. Requiredness is the paradigm-specific move: per
parity Ruling 3, `fullName` is the only page-hard mandate in the whole Flow,
so a "required" field here is _engine-mandatory_ — blank saves advance, the
hub shows In progress, and the gap blocks at CYA POST as a soft prompt. The
canonical set is code: `engine/scope/journey-rules.js`.

### What the paradigm gives you for free

- **Routing** — `routes/page.js` collects every `template: "page"` Page from
  the Flow and registers its GET/POST pair; the new page routes itself.
- **Rendering, radio options included** — the presents entry's `options`
  array (value + label pairs) drives the `govukRadios` builder through the
  `radio` type companion; the `boolean` type renders the yes/no radio. The
  generic `templates/page.njk` renders both. No partial, ever.
- **The hub task's status roll-up** — `flow-eval/container-status.js` rolls
  the page's slot states into the Section status; `journey/hub-view.js` maps
  every `hubShape` group to a task row generically.
- **The completeness gate** — `flow-eval/journey-state.js` computes the
  journey state from _top-level Section statuses_, so the new Section counts
  automatically; "Get your quote" stays inert until the whole journey —
  now including Vehicle security — is Fulfilled, and `contract/submit.js`'s
  server-side re-check names the gap if you deep-link past it.
- **Navigation** — the flow-eval primitives (`firstApplicablePage`,
  `nextAfter`, `sectionEntry`) walk the Container tree; a one-page Section's
  Save returns to the hub with no wiring.
- **CYA rows** — the `cyaKey`s produce the rows in Flow order.

### The exact steps

**1. Add the two obligation records — `model/obligations.json`.** Fresh
UUIDs; options are VALUE domains only (labels are presentation and live in
the Flow):

```json
{
  "id": "<fresh-uuid>",
  "name": "parkingLocation",
  "type": "radio",
  "cardinality": "single",
  "options": ["garage", "driveway", "street"]
},
{
  "id": "<fresh-uuid>",
  "name": "hasTracker",
  "type": "boolean",
  "cardinality": "single"
}
```

(`boolean` must NOT bundle options — the yes/no items come from the type
companion; `model/obligations.test.js` pins options onto choice types only.)

**2. Add the Section to the Flow — `model/flow.json`.** A new top-level
group after `your-driving-and-cover` (position matters — see the hub pin
below), with one `template: "page"` Page presenting both obligations, all
copy authored here:

```json
{
  "kind": "group",
  "id": "vehicle-security",
  "title": "Vehicle security",
  "children": [
    {
      "kind": "page",
      "id": "vehicle-security",
      "slug": "vehicle-security",
      "title": "Vehicle security",
      "heading": "Vehicle security",
      "template": "page",
      "presents": [
        {
          "obligation": "<parkingLocation-uuid>",
          "label": "Where is the vehicle kept overnight?",
          "options": [
            { "value": "garage", "label": "In a locked garage" },
            { "value": "driveway", "label": "On a private driveway" },
            { "value": "street", "label": "On the street" }
          ],
          "cyaKey": "Overnight parking"
        },
        {
          "obligation": "<hasTracker-uuid>",
          "label": "Is a tracking device fitted?",
          "cyaKey": "Tracking device"
        }
      ]
    }
  ]
}
```

No `mandate: "hard"` on `parkingLocation` — Ruling 3 pins `fullName` as the
only page-hard mandate (`model/flow.test.js` asserts it), and "required"
here means engine-mandatory (step 4). No `appliesWhen` — the Section is
unconditional, so the closed condition-name registry is untouched.

**3. Mirror it in the skeleton Flow — `model/skeleton-flow.json`.** A bare
page presenting both obligations, for the equivalence pins:

```json
{
  "kind": "page",
  "id": "vehicle-security",
  "slug": "vehicle-security",
  "presents": [
    { "obligation": "<parkingLocation-uuid>" },
    { "obligation": "<hasTracker-uuid>" }
  ]
}
```

**4. Make it required — `engine/scope/journey-rules.js`.** The paradigm's
signature edit. Add `'parkingLocation'` to `ENGINE_MANDATORY_ALWAYS` and its
code to `MANDATE_CODES`:

```js
export const ENGINE_MANDATORY_ALWAYS = Object.freeze([
  // ...
  'addons',
  'parkingLocation'
])

const MANDATE_CODES = {
  // ...
  parkingLocation: 'mandate.parkingLocation.missing'
}
```

The registry loop registers the `alwaysRequired` predicate for it; the CYA
soft prompt, the submit hard gate and the Section's completion all follow.
`hasTracker` stays unregistered — the evaluator default is in-scope,
optional.

**5. Author the mandate message — `model/messages.en.json`** plus its
explanation in **`engine/reasons.js`** (the lockstep, as in example 1):

```json
"mandate.parkingLocation.missing": "Parking location is required",
```

No format messages this time — `formatCodesFor` emits nothing for `radio`
or `boolean` (an invalid posted option is rejected by canonicalisation, and
presence is the mandate's job).

**6. Put it on the hub — `journey/config.js`.** The frozen `hubShape`
literal (the graft-12 mirror of spike-a's `grouped` literal) gains a group:

```js
groups: [
  // ...
  {
    sectionId: 'your-driving-and-cover',
    pageIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
  },
  { sectionId: 'vehicle-security', pageIds: ['vehicle-security'] }
]
```

`journey/hub-view.js` maps it to a task row generically; the progress line
becomes "…of 4 tasks" because the hub counts `hubShape.groups`.

**Seven files**: the catalogue, the two Flows, the message catalogue, and
three declarative code tables (journey rules, reasons, hub shape). Still no
template, no route, no widget, no evaluator change.

### The pins and fixtures a walk of the suite should then hit

Code-read-derived — the suite is the authority:

- `model/obligations.test.js` — `EXPECTED_NAMES` gains both names.
- `model/flow.test.js` — the five-Sections-in-hub-order pin gains
  `'vehicle-security'`; the twelve-generic-pages pin becomes thirteen.
- `engine/scope/journey-rules.test.js` — pins `ENGINE_MANDATORY_ALWAYS`
  verbatim; gains `'parkingLocation'`.
- `engine/index.test.js`, `engine/load-model.test.js` — 30 → 32.
- `journey/config.test.js` — asserts `hubShape.groups` against
  `flow.sections.slice(0, 3)`; the slice becomes `(0, 4)` (which is why the
  Section goes _before_ `add-to-your-policy` in `flow.json`).
- `journey/hub-view.test.js` — pins "completed 0 of 3 tasks",
  `totalCount: 3` and the task-row list; all become 4-group shaped.
- `contract/cya-rows/index.test.js`, `contract/view.test.js` — the parity
  row sequences gain `'Overnight parking'` and `'Tracking device'`, and
  their `FULL` fixtures must gain `parkingLocation` for the
  no-prompts-when-complete assertions.
- **Every "complete journey" fixture follows** — the same lesson as the
  sibling spikes' `completeAnswers`, spread wider here: the full-journey
  fixtures in `contract/submit.test.js` and `routes/endings/submit.test.js`,
  and the authored equivalence pair
  `tests/fixtures/scripts/full-quote.script.json` +
  `full-quote.expected.json` (the script must answer `parkingLocation` or
  the replayed journey never reaches `journeyState: 'fulfilled'`, which
  tier 4 asserts). The completability tier needs **no** edit — its filler
  writes a canonical satisfying value into any engine-mandatory gap
  (`tests/helpers/enumerate-states.js` `satisfyingValueFor`: radio → first
  option).
- The three shared Playwright specs would need the same live-validation
  tolerance as the sibling proofs: teach the shared walk in
  `prototypes/e2e/journey.js` to complete the new task **only when its hub
  link is present**, run, then revert — only the docs change.

### What you did NOT have to touch

`routes/` (the page routes itself), `templates/` (the generic page renders
it), `lib/fields/` (radio and boolean companions exist), `validation/`
(mandate enforcement is derived), `flow-eval/` (the tree walkers are
generic), `orchestrator/` and `store/` (writes are model-driven),
`contract/` (the 20-export barrel is unchanged — no surface drift). The
three code files that did change (`journey-rules.js`, `reasons.js`,
`config.js`) are all declarative tables the tests pin, not logic.

## Variations

### Make a field required (the one-file delta on worked example 1)

Add the name to `ENGINE_MANDATORY_ALWAYS` + `MANDATE_CODES` in
`engine/scope/journey-rules.js`, author `mandate.mileage.missing` in
`model/messages.en.json` + `engine/reasons.js`, and update the
`journey-rules.test.js` pin and the complete-journey fixtures — exactly
worked example 2's steps 4–5. Per Ruling 3 it blocks at CYA POST, never at
page save; making it page-hard instead would be one `"mandate": "hard"` on
the presents entry, but `model/flow.test.js` deliberately pins `fullName` as
the only page-hard field.

### Make the question conditional (only required when another answer is X)

Register a conditional predicate instead of `alwaysRequired`, the way
`excessAmount` is mandatory only while `voluntaryExcess` is yes:

```js
registry.register(
  'mileage',
  'coverTypeIsComprehensive',
  whenAnswered('coverType', 'comprehensive', () => ({
    status: 'mandatory',
    reasons: [
      scopeAnswered('comprehensive', 'coverType'),
      reason('mandate.mileage.missing')
    ]
  }))
)
```

The provenance ("why is this asked?") is the **stacked reason codes** the
predicate returns: `scope.answered` interpolates the controlling answer
("You answered \"comprehensive\" for Cover type") and surfaces on the CYA
soft prompt via the throwing i18n resolver. The predicate is a named engine
function, not record data — scoping never lives on the record or in the
Flow (obligations.md:196).

### A conditional whole page

Give the Container an `appliesWhen` name in **both** Flows, as the `claims`
page (`"appliesWhen": "hadClaimsIsYes"`) and the add-on groups do, and
register the named condition in `flow-eval/applies-when.js`'s Flow-condition
registry. `model/flow.test.js` pins the closed `appliesWhen` name list, so
the new name is a reviewed addition there too. A gated-out page's data is
**wiped, not hidden** — the orchestrator's scope-exit wipe
(`orchestrator/scope-exit-wipe.js`) destroys out-of-scope fulfilments on the
fixed-point pass (the Yes–No–Yes mechanism), and the deep-link guard
redirects a Not-Applicable page to its Section's first applicable page.
