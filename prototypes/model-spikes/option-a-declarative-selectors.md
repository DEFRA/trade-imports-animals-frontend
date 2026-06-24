# Option A — Declarative config + selectors

> Agent-ready backlog. Read [`README.md`](./README.md) first — it owns the
> **shared acceptance bar** and the **common contract** every spike implements.
> This file only adds what's specific to Option A. Slug: `spike-a`.

## Goal & paradigm

Evolve today's `prototypes/shared/sections.js` into a **formal, declarative data
model** plus a set of **pure selector functions**. This is the lowest-risk,
closest-to-today paradigm: the journey is _data_, and everything (status,
navigation, validation, applicability) is _derived_ from that data by pure
functions. It is the baseline the other three spikes are measured against.

The key shift from today: `isComplete` stops being a hand-written predicate per
section and becomes **derived from each field's `required` constraint**; and
`appliesWhen` stops being an opaque function and becomes a **small declarative
condition** so we can report _why_ a step applies (provenance).

## Model shape (concrete)

```js
// model/journey.js
export const steps = [
  {
    id: 'about-you',
    title: 'About you',
    fields: [
      { id: 'fullName', type: 'text',        required: true },
      { id: 'email',    type: 'email',        required: true },
      { id: 'dateOfBirth', type: 'date',      required: true },
      { id: 'postcode', type: 'formatted',   required: true, pattern: 'postcode' }
    ]
  },
  {
    id: 'driving-history',
    title: 'Driving history',
    fields: [
      { id: 'yearsNoClaims', type: 'number', required: true, min: 0, max: 20 },
      { id: 'hadClaims',     type: 'boolean', required: true },
      { id: 'penaltyPoints', type: 'number', required: false }
    ]
  },
  {
    id: 'claims',
    title: 'Your claims',
    kind: 'loop',                              // owns its own routes
    // declarative condition, not an opaque fn — yields provenance:
    appliesWhen: { field: 'hadClaims', eq: 'yes' },
    item: {                                    // shape of one repeated claim
      fields: [
        { id: 'claimType',   type: 'radio', required: true, options: [...] },
        { id: 'claimAmount', type: 'currency', required: false }
      ]
    },
    done: 'claimsDone'                         // loop-exit flag
  },
  // ...cover-type, optional-extras, addons (kind: 'subtasks')...
]
```

- **`type`** is the render-agnostic taxonomy from the contract (date, radio,
  multi-select/checkboxes, text, email, number, currency, boolean, formatted).
- **Constraints** are declarative keys on the field (`required`, `min`, `max`,
  `length`, `pattern`, `options`). `validate(stepId, payload)` is a generic
  function that reads these — no per-step validators.
- **`appliesWhen`** is a tiny condition object. Support at least `{ field, eq }`
  and `{ all: [...] }` / `{ any: [...] }`. Because it's data, `missingRequired`
  can emit `because: [{ field: 'hadClaims', eq: 'yes' }]`.
- **`kind: 'loop'` / `'subtasks'`** mark steps that own their own routes (today's
  `hasOwnRoutes`). The model still describes their item/step field shapes so
  validation and completeness stay derived.

## Contract implementation notes

- `applicableSteps(answers)` — `steps.filter(s => evalCondition(s.appliesWhen, answers))`.
  No `appliesWhen` ⇒ always applies.
- `status(answers, stepId, shape)` — derive from required fields:
  all required present ⇒ `complete`; some present ⇒ `partial`; none ⇒
  `not-started`. For `grouped` shape, a `groupId` aggregates its live steps
  (all complete / some complete / none) exactly like today's `groupStatus`. A
  step that isn't in `applicableSteps` ⇒ `not-applicable`. The terminal "Get
  your quote" pseudo-step is `cannot-start` until every applicable step is
  `complete`.
- `next` / `prev` — index into `applicableSteps` per the shape:
  - `linear`: previous/next across the whole live list.
  - `hub`: always `{ terminal: 'hub' }`.
  - `grouped`: previous/next **within the step's group**; off the end ⇒
    `{ terminal: 'hub' }`.
- `applyAnswer(answers, stepId, payload)` — merge the patch, then recompute
  `applicableSteps`; for any step that **was** applicable and now isn't, clear
  its fields (and loop `done` flag). This is the generic replacement for
  `driving-history.collect`'s hand-written claims cleanup.
- `missingRequired(answers)` — for each applicable step, each `required` field
  not satisfied ⇒ `{ stepId, fieldId, because }` where `because` is the step's
  `appliesWhen` condition (empty for unconditional steps).
- `fieldsFor` / `validate` — read straight off the field constraints.

## Three-variant wiring

One `variants/` folder, three thin files that differ only by the shape they pass
and the back/next they request from the contract:

```js
// variants/linear.js
const shape = { kind: 'linear' }
// variants/hub.js
const shape = { kind: 'hub' }
// variants/grouped.js
const shape = {
  kind: 'grouped',
  groups: [
    {
      title: 'About you and your vehicle',
      stepIds: ['about-you', 'your-vehicle']
    },
    {
      title: 'Your driving and cover',
      stepIds: ['driving-history', 'claims', 'cover-type', 'optional-extras']
    }
  ]
}
```

Each variant's controller asks the contract for next/prev/status and renders via
the existing `njk` + `shared/fields.js`. The hub/grouped task-status badges are
produced by mapping the contract's `status` enum to GDS tags **in the variant's
view adapter**, never in the model.

## TODO checklist (ordered)

1. Scaffold `prototypes/model-spikes/spike-a/` per the folder convention in the
   README. Register `/prototype/spike-a/...` and add the spike to the
   `/prototype` chooser.
2. Write `model/journey.js` — the full car-insurance journey as declarative data
   (all of today's sections incl. the `claims` loop and `addons` subtasks).
3. Write `model/selectors.js` implementing the full common contract. Keep it
   pure (no `request`, no `h`, no template references).
4. Write `model/conditions.js` — `evalCondition` + provenance extraction for
   `appliesWhen`.
5. Wire `variants/{linear,hub,grouped}.js` + controllers, reusing existing
   `njk`, `shared/fields.js`, `shared/store.js`.
6. Write `dump.js` (headless JSON proof) covering all three shapes.
7. Unit tests (`*.test.js`) for every contract function — see the README's
   examples list; include the cascade-invalidation and provenance cases.
8. Point the Playwright demo suite at the three `spike-a` variants; make it pass.
9. Fill in `spike-a/README.md` with self-scoring notes against the rubric.

## Risks / watch-outs

- **Keep `appliesWhen` declarative.** The whole provenance story depends on it
  being data, not a closure. If you reach for an arbitrary function, you've
  drifted toward Option C — stop and keep it a condition object.
- **Derived completeness vs today's `isComplete`.** Some current sections are
  "complete" on one key field (e.g. `Boolean(quote.registration)`). Make sure
  deriving from `required` fields reproduces the same task-list behaviour the
  Playwright suite expects.
- **Loops/subtasks** still own routes; the model describes their _shape_ for
  validation/completeness but the add-another and fan-out navigation stays in
  the spike's own route handlers (mirror today's `claims-routes`/`addons-routes`).
