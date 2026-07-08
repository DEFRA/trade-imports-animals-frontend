# How to add a field to an existing page

This guide walks through adding one optional field to a page that already
exists. The worked example adds `exporterReference` (the exporter's own
reference for the consignment) to the Origin page. Every step names the real
file to edit.

The model never renders. Declaring an obligation buys you the state-layer
behaviour only: the field joins scope, `reconcile` preserves or wipes its
value like any other, and (because it is optional) it never moves a task's
status. You author the rendering, the validation, the persistence wiring and
the Check your answers row by hand. That is the paradigm's deliberate
inversion — see [add-a-page.md](add-a-page.md) for the page-level version of
the same shape.

Adding a field touches five places. Steps 1 to 4 are the feature slice.
Step 5 is named for you by a failing test.

To add a repeating collection rather than a single field, see
[add-a-collection.md](add-a-collection.md).

## 1. Declare the obligation

Add a one-line def to the feature's model, `features/origin/obligations.js`,
and include it in the exported `obligations` array:

```js
export const exporterReference = { id: 'exporterReference' }

export const obligations = [
  countryOfOrigin,
  regionOfOriginCodeRequirement,
  regionOfOriginCode,
  internalReferenceNumber,
  exporterReference
]
```

Order in the array does not matter — the contract test is set-based and the
Check your answers page hand-orders its own rows.

You do not edit `registry.js`. It spreads `...origin.obligations`, so growing
the array is enough. You do not edit the page's `collects` either: the
controller declares `collects: kit.collectsFrom(obligations)`, which derives
the list from the same array.

The one exception is a feature that splits its obligations across pages.
Transport does this — each of its controllers lists an explicit subset, for
example `collects: [transporterType.id]` in
`features/transport/transporters.controller.js`. In a split feature, add the
new id to the page that owns it.

## 2. Wire the controller

Three small edits in `features/origin/controller.js`.

Add a format validator to the page's schema. Validators are optional by
default: a blank field still saves, a malformed non-blank value is caught.

```js
const fields = compose(
  // ...the existing origin validators...
  maxText(
    'exporterReference',
    30,
    'Exporter reference must be 30 characters or less'
  )
)
```

Seed the field in the GET view-model, so a returning user sees their saved
answer:

```js
exporterReference: answers.exporterReference ?? ''
```

Read it in the POST value map, so `state.commit` persists it:

```js
exporterReference: (payload.exporterReference ?? '').trim()
```

## 3. Render it

Add a govuk macro to `features/origin/template.njk`. This template
already imports `govukInput`:

```njk
{{ govukInput({
  id: "exporterReference", name: "exporterReference",
  label: { text: "Exporter reference (optional)" },
  hint: { text: "The exporter's own reference for this consignment" },
  classes: "govuk-input--width-10",
  value: values.exporterReference,
  errorMessage: errors.exporterReference and { text: errors.exporterReference }
}) }}
```

## 4. Add the Check your answers row

Check your answers is bespoke composition. Add one `row(...)` inside
`buildRows` in `features/check-answers/controller.js`:

```js
row('Exporter reference', answerOf('exporterReference'), 'exporterReference'),
```

The third argument is the obligation id. The row's Change link resolves the
owning page through the dispatch seam — `changeHref` calls
`pageOfObligation('exporterReference')` against the index built at boot from
every page's `collects`. You never hardcode a slug.

## 5. Let the contract test name the last edit

Run the unit suite from the repo root:

```bash
npm run test:live-animals
```

Exactly one test fails: the `origin` case in `contract.test.js`. That
test drives the page's real POST handler with a synthetic payload and asserts
the handler commits exactly the obligation ids the page declares. Your new id
is now declared but absent from the payload, so it is never committed — the
test fails and names the file.

Add one line to the `origin` case's payload:

```js
exporterReference: 'EXP-2026-0142'
```

Re-run the suite. Everything passes.

## The discovery mechanism is behavioural

There is no checklist to memorise: declare-but-don't-wire drift is caught by
the suite, not by review.

- A declared id the handler never commits fails the page's contract case
  (as in step 5).
- An id the handler commits but the page does not declare — in a
  split-`collects` feature, or one declared by a different page — also fails
  the same case, because the committed set no longer equals the declared set.

Either way the failure is one test, and it names the page. Boot has its own
guard for the model side: `buildDispatch` asserts every non-system obligation
is collected by exactly one page, so a def that no page collects crashes the
server at startup rather than failing silently.

## What you do not touch

- `registry.js` — it spreads the feature's `obligations` array.
- `flow/flow.js` and `flow/dispatch.js` — the owning page already exists, and
  coverage derives from `collects`.
- `flow/gates.js`, the engine, the status roll-up and the hub — an optional
  field never changes scope, completeness or a section's status.
- No new test file — the contract case covers the commit, and `lib/validate`
  is tested generically.

## Variation: make the field required

Requiredness is a one-word model change:

```js
export const exporterReference = { id: 'exporterReference', required: true }
```

`required` is the completion fact the status roll-up reads. The section now
shows In progress until the field is answered, and `readyForQuote` stays
false. It does not block saving — save-blocking is a controller decision
(see `countryOfOrigin` in `features/origin/controller.js`, the journey's
only save-blocking field).

Two follow-ons:

- Make the validator reject blank. Compose
  `requiredText('exporterReference', '...')` with the format check in the
  controller's schema.
- Teach the shared E2E walk to fill it. The specs in `prototypes/e2e/` walk
  every journey with the same helpers in `prototypes/e2e/journey.js`, and the
  other journeys do not have your field. Fill it only when present:

```js
const reference = page.getByLabel('Exporter reference (optional)')
if (await reference.count()) await reference.fill('EXP-2026-0142')
```

Then run `npm run test:prototype` from the repo root.

## Variation: make the field conditional

A conditional field adds two facts to its def and reveal markup to its page.
The reference example is `regionOfOriginCode` in
`features/origin/obligations.js`:

```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}
```

`activatedBy` puts the field in scope only while the referenced answer
matches. `wipeOnExit` destroys its value when it leaves scope, so re-entering
scope starts blank. The reveal markup stays page-side —
`features/origin/template.njk` nests the input inside a govuk radios
`conditional` block. The model owns scope and wipe; the page owns how the
reveal looks.

If the activating obligation belongs to another feature, import it from that
feature's `obligations.js`. Sideways model imports are the one permitted
direction — the boot purity check allows nothing else.
