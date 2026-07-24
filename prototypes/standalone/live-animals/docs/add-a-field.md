# How to add a field to an existing page

This guide adds one data field to a page that already exists. The worked
example adds `exporterReference` — the exporter's own reference for the
consignment — to the Origin page. Every step names the real file to edit.

The prototype has three layers. The **model** owns identity and scope. The
**flow** owns which page presents the field. The **frontend** owns rendering,
validation and persistence. A field is a small slice through all three.

A field is called an **obligation** in the model — a data-field requirement.
The model never renders and carries no display copy. Declaring an obligation
buys you the state-layer behaviour: the field joins scope, the evaluator
preserves or purges its value with the rest of the canonical fulfilment, and its
`status` decides whether it moves a section's completeness. You author the
widget, the page-level validation, the persistence wiring and the Check your
answers row by hand.

Adding a field touches up to six places:

1. Declare the obligation in the model manifest.
2. Add the obligation name to the owning page's `collects`.
3. Add the feature-owned fulfilment binding.
4. Wire the controller — the GET seed, validation and the POST value map.
5. Render the widget in the template.
6. Add the Check your answers row.

To add a repeating collection rather than a single field, see
[add-a-collection.md](add-a-collection.md). To add a whole new page, see
[add-a-page.md](add-a-page.md).

## 1. Declare the obligation

All obligations live in one manifest, `model/obligations/obligations.js`.
Add an exported object and include it in the exported `obligations` array:

```js
export const exporterReference = {
  id: '7c3e9a41-2b8d-4f6a-9c1e-0d5b7a8f2e14',
  name: 'exporterReference',
  status: 'optional'
}
```

- `id` is a UUID and is the obligation's storage key. Mint a fresh one
  (`uuidgen`); never reuse another obligation's id.
- `name` is the field's stable model name. Controllers, `collects` and the
  Check your answers rows all reference the obligation by this name.
- `status` is `'optional'` or `'mandatory'`. An optional field never moves a
  section's completeness; a mandatory field holds the section In progress and
  keeps the submit gate closed until it is answered.

Add it to the `obligations` array at the foot of the file:

```js
export const obligations = [
  // ...existing obligations...
  exporterReference
]
```

Order in the array does not affect evaluation — the evaluator builds the group
hierarchy from each obligation's `within` back-reference, and Check your
answers hand-orders its own rows.

An always-in-scope field is a plain `status` with no `applyTo`. A conditional
field carries an `applyTo` scope closure instead — see
[Variation: make the field conditional](#variation-make-the-field-conditional).

The model carries no `label`, `title`, `hint`, `legend` or `widget`. Those are
display keys. `model/no-display-keys.js` runs at boot (via
`obligation-purity.js`) and fails startup if any appear on an obligation.
Copy lives in the template; option lists come from the services.

## 2. Add the obligation to the page's `collects`

Each page declares the obligations it presents as a string array of obligation
names on its controller `meta`. Add the new name to the owning page —
`features/origin/controller.js`:

```js
export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber',
    'exporterReference'
  ]
}
```

At boot, `buildDispatch` (`flow/dispatch.js`) reads every page's `collects` and
builds the obligation-to-page index. It throws if two pages collect the same
obligation, or if any non-system obligation is collected by no page. So a
declared-but-uncollected field crashes startup rather than failing silently —
the missing `collects` entry is the crash message.

The Change links on Check your answers resolve the owning page through this
index (`pageOfObligation`), so you never hardcode a slug.

## 3. Add the fulfilment binding

The durable key is the obligation UUID, not its page-field name. Add the scalar
binding to the owning feature's `evaluation.js`, for example
`features/origin/evaluation.js`:

```js
import { feature, scalar } from '../../bridge/fulfilment-bindings.js'
import {
  // ...existing obligations...
  exporterReference
} from '../../model/obligations/obligations.js'

export const evaluationBindings = feature('origin', [
  // ...existing bindings...
  scalar({ field: 'exporterReference', obligation: exporterReference })
])
```

`features/evaluation.js` registers every feature contribution. Boot calls
`assertFulfilmentBindingCoverage`, which rejects a missing or duplicate
obligation owner and a binding at the wrong collection depth. The engine merges
these contributions into the canonical fulfilment persisted by both record
adapters.

If the field must appear in either backend notification, also add its UUID read
to the relevant forward projection in
`services/persistence/records/notification-mapper.js`. Notifications are
downstream projections, not the resume source.

## 4. Wire the controller

Two edits in `features/origin/controller.js`.

Seed the field in the GET view-model, so a returning user sees their saved
answer:

```js
exporterReference: answers.exporterReference ?? ''
```

Read it in the POST value map, so `state.commit` persists it, and add a
page-level validator. Validation is in-controller, composed from
`lib/validate/`:

```js
const fields = () =>
  compose(
    // ...the existing origin validators...
    maxText(
      'exporterReference',
      58,
      'Exporter reference must be 58 characters or less'
    )
  )
```

```js
const values = {
  // ...the existing origin values...
  exporterReference: (payload.exporterReference ?? '').trim()
}
```

`lib/validate/` gives GDS-shaped field errors: `compose`, `requiredText`,
`maxText`, `oneOf`, `requiredOneOf`, `pattern`, `dateParts` and more. These are
the page's own Joi-style checks: the controller owns value legality and shapes
the error the user sees. Composite values such as addresses follow the same
rule; their page validates every required sub-field before committing them.

`state.commit(request, h, values)` writes the answers and returns the
recomputed `scope`; the origin controller already redirects with
`kit.nextTarget`.

## 5. Render the widget

Add a govuk macro to `features/origin/template.njk`. The template already
imports `govukInput`:

```njk
{{ govukInput({
  id: "exporterReference",
  name: "exporterReference",
  label: { text: "Exporter reference (optional)" },
  hint: { text: "The exporter's own reference for this consignment" },
  classes: "govuk-!-width-three-quarters",
  value: values.exporterReference,
  errorMessage: errors.exporterReference and { text: errors.exporterReference }
}) }}
```

Copy lives here, in the template — the label, hint and legend the model is
forbidden to hold. Stay inside the govuk-frontend toolbox: govuk-\* components
and utility classes, no custom CSS.

## 6. Add the Check your answers row

Check your answers is bespoke composition, sectioned into summary cards in
`features/check-answers/controller.js`. Add one `row(...)` to the card that
owns the field — the import details card for an origin field:

```js
row('Exporter reference', answers.exporterReference, 'exporterReference'),
```

The third argument is the obligation name. `row` resolves the Change link with
`changeHref`, which calls `pageOfObligation('exporterReference')` against the
dispatch index built at boot. You never name the page.

## The discovery mechanism is behavioural

There is no checklist to memorise. `contract.test.js` drives every page's real
POST handler with a synthetic payload and asserts the committed obligation set
equals the page's declared `collects`. So:

- A name in `collects` the handler never commits fails the page's contract
  case — the declared set and the committed set differ.
- A field the handler commits but no page declares also fails, and boot's
  `buildDispatch` refuses to start until some page collects it.
- A declared leaf with no feature binding, or two features claiming the same
  UUID, fails `assertFulfilmentBindingCoverage` at boot.

Run the unit suite from the frontend repo root:

```bash
npm run test:live-animals
```

## What you do not touch

- `flow/dispatch.js` and `flow/flow.js` — the owning page already exists, and
  coverage derives from `collects`.
- The evaluator, the status roll-up and the hub — an always-in-scope optional
  field never changes scope, completeness or a section's status.
- No new test file — the contract case covers the commit and `lib/validate` is
  tested generically.

## Variation: make the field required

Requiredness is one word on the obligation:

```js
export const exporterReference = {
  id: '7c3e9a41-2b8d-4f6a-9c1e-0d5b7a8f2e14',
  name: 'exporterReference',
  status: 'mandatory'
}
```

`status: 'mandatory'` is the completion fact the status bridge reads. The
section now shows In progress until the field is answered, and the submit gate
(`readyForCheckYourAnswers`) stays closed. It does not block saving — a blank
mandatory field still saves; save-blocking is a controller decision. Two
follow-ons:

- Make the validator reject blank. Compose `requiredText('exporterReference',
'...')` with the length check.
- Teach the shared E2E walk to fill it. The specs in `prototypes/e2e/` walk
  every journey with the helpers in `prototypes/e2e/journey.js`, and the other
  journeys do not have your field. Fill it only when present:

```js
const reference = page.getByLabel('Exporter reference (optional)')
if (await reference.count()) await reference.fill('EXP-2026-0142')
```

Then run `npm run test:prototype` from the frontend repo root.

## Variation: make the field conditional

A conditional field is in scope only while another answer holds. It carries an
`applyTo` scope closure instead of a plain `status`. The closure is built by a
gate helper from `model/obligations/helpers.js`, which co-declares the closure
body, its metadata sidecar and its dependency edge. The reference example is
`regionCode` in `model/obligations/obligations.js`:

```js
export const regionCode = {
  id: 'c23d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f',
  name: 'regionOfOriginCode',
  applyTo: equalsGate(
    regionCodeRequirement,
    'yes',
    { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
    { inScope: false }
  )
}
```

`equalsGate(gate, value, whenTrue, whenFalse)` puts the field in scope with the
`whenTrue` decision while the gate obligation equals `value`, and applies
`whenFalse` otherwise. Because the false branch is `{ inScope: false }`, the
evaluator purges any stored value when the field leaves scope — re-entering
scope starts blank. Common helpers:

- `equalsGate` / `includesGate` / `presentGate` — scalar gates on a
  notification-level answer.
- `allowListed` / `notInUnionOf` / `presentPerRecord` — group-scoped gates that
  read a per-instance value inside a collection (a commodity line or an animal
  identifier record).
- `anyAllowListed` — aggregates a group's records into a single notification-
  level decision (for example, CPH becomes mandatory when any commodity line
  needs it).

A status flip — mandatory in one branch, optional in the other — keeps
`inScope: true` on both branches with a different `status`. The reveal markup
stays page-side: `features/origin/template.njk` nests the region-code input
inside a govuk radios `conditional` block. The model owns scope and purge; the
page owns how the reveal looks.

If the gate obligation lives elsewhere in the manifest, it is already in the
same file — one manifest, no cross-feature imports. Scope stays in the model;
value legality stays in the collecting controller.
