# Live-animals feature anatomy

The linear journey keeps pages under
`src/server/app/sets/live-animals/journeys/linear/features/`. Each feature is a
vertical slice of page identity, controllers, copy, templates, bindings and tests.

## Page identity

A `page.js` exports `{ id, slug }` and imports nothing. The controller spreads the
same object into `meta`, while
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js) uses it in section
order. Keeping the identity leaf import-free avoids a controller–flow module cycle.

## Collecting controllers

[`journeys/linear/features/import-reason/controller.js`](../journeys/linear/features/import-reason/controller.js)
is the smallest complete collecting page. A controller normally owns:

- `meta: { ...page, collects: [...] }`
- a shared render helper for GET and POST errors
- GET prefill from `state.get()`
- POST parsing and validation
- canonical writes through the engine
- navigation through `kit.nextTarget()`
- a GET and POST route pair from `kit.pageRoutes()`

Controllers use the platform engine, validation and shared-kit APIs. They do not
call the evaluator or service persistence adapters directly.

## Copy and templates

User-facing text lives in English and Welsh copy modules beside the feature. A
template extends `shared/layout.njk`. The layout resolves from the
`src/server/app` Nunjucks root, while the feature view name starts with the journey
prefix from [`journeys/linear/config.js`](../journeys/linear/config.js):
`live-animals/journeys/linear`.

[`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js) requires
a complete copy folder for a templated feature.
[`src/server/app/copy-parity.test.js`](../../../copy-parity.test.js) requires both
locales to have the same shape.

## Bindings

Each collecting feature imports live-animals obligation objects into its
`evaluation.js` and binds page fields with `scalar()` or `grouped()`.
[`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js)
exports all bundles as `featureEvaluationBindings`.

L1 gives that array to the generic fulfilment registry. Registration rejects
missing or duplicate leaf ownership, wrong group depth and inconsistent group
descriptors.

## Controller and route registration

[`journeys/linear/features/index.js`](../journeys/linear/features/index.js) exports:

- `dispatchPages`, containing every flow page `meta`, including a page whose
  `collects` is empty
- `allRoutes`, containing every controller route, including shell, action and
  off-flow pages without `meta`

`buildDispatch(dispatchPages)` builds page, slug and obligation-owner indexes. L1
passes `allRoutes` to Hapi.

## Flow sections and task rows

A feature folder is not automatically a flow section or a hub row.

- `journeys/linear/flow/flow.js` defines navigation order.
- `journeys/linear/flow/task-rows.js` groups pages into hub work items.
- `journeys/linear/features/hub/controller.js` groups task-row ids for presentation.
- `journeys/linear/flow/run.js` defines the opening-run sequence.

See [Journey flow and gates](journey-flow-and-gates.md).

## Collections

Collections use hand-written controllers over generic engine operations.

- [`documents/controller.js`](../journeys/linear/features/documents/controller.js)
  keeps its entry form and read-back list on one page.
- [`commodities/search/search.controller.js`](../journeys/linear/features/commodities/search/search.controller.js)
  reconciles selected lines before the details page edits them.
- [`commodities/animal-identification/animal-identification.controller.js`](../journeys/linear/features/commodities/animal-identification/animal-identification.controller.js)
  manages a nested collection within one commodity line.

The engine supplies collection facts and mutation primitives. The feature owns rows,
links, copy and validation. See [Add a repeatable collection](add-a-collection.md).

## Tests

Controller and copy tests sit beside the feature. Browser specs use
`*.fit.spec.js` and run in the Playwright `features` project. Feature tests include
initial and error-state accessibility checks. See
[Testing the live-animals set and journey](testing.md).
