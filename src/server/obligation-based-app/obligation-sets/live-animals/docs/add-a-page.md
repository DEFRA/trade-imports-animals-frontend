# How to add a page

Use this recipe for one new journey page. Use [add-a-section.md](add-a-section.md)
when several new pages form one feature group and one hub task row.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/obligation-based-app/obligation-sets/live-animals/`.

## Read these files first

Use import reason as the small, complete page example:

- [`features/import-reason/page.js`](../features/import-reason/page.js)
- [`features/import-reason/controller.js`](../features/import-reason/controller.js)
- [`features/import-reason/template.njk`](../features/import-reason/template.njk)
- [`features/import-reason/evaluation.js`](../features/import-reason/evaluation.js)
- [`features/import-reason/copy/copy.en.js`](../features/import-reason/copy/copy.en.js)
- [`features/import-reason/copy/copy.cy.js`](../features/import-reason/copy/copy.cy.js)
- [`features/import-reason/copy/copy.test.js`](../features/import-reason/copy/copy.test.js)
- [`features/import-reason/controller.test.js`](../features/import-reason/controller.test.js)
- [`features/import-reason/import-reason.e2e.spec.js`](../features/import-reason/import-reason.e2e.spec.js)
- [`model/obligations/sections/import-reason.js`](../model/obligations/sections/import-reason.js)

Use
[`features/origin/origin.e2e.spec.js`](../features/origin/origin.e2e.spec.js)
for per-rule validation and initial-render plus error-state accessibility tests.
Read [`features/index.js`](../features/index.js),
[`flow/flow.js`](../flow/flow.js) and
[`flow/task-rows.js`](../flow/task-rows.js) before registering the page.

## 1. Define the page identity and files

Create this feature folder:

```text
features/<name>/
├── controller.js
├── controller.test.js
├── copy/
│   ├── copy.cy.js
│   ├── copy.en.js
│   └── copy.test.js
├── evaluation.js
├── page.js
├── template.njk
└── <name>.e2e.spec.js
```

If the page joins an existing multi-page feature, add its controller and
template inside that group. Keep the browser spec in that group's `e2e/`
folder.

`page.js` exports only `{ id, slug }` and imports nothing. The controller and
flow import the same object. This prevents a module cycle through flow, status
and the controller.

Create both locale bundles and their test as soon as the template exists.
[`copy-convention.test.js`](../copy-convention.test.js) scans feature folders.
It fails when a feature with a `.njk` file has no complete `copy/` folder.

## 2. Add the model and binding

Follow [add-a-field.md](add-a-field.md) for every field the page collects.
In order:

1. Add each copy-free obligation under `model/obligations/sections/`.
2. Re-export it and add it to the array in
   [`model/obligations/obligations.js`](../model/obligations/obligations.js).
3. Bind it in the feature's `evaluation.js`.
4. Register a new binding bundle in
   [`features/evaluation.js`](../features/evaluation.js).

Do not put display text, options or validation rules in the obligation model.
Copy stays in the feature's `.njk` and copy files. Validation stays in the
controller.

Run `npm run test:live-animals` after adding the obligation. Before the binding
exists, the fulfilment registry reports an unowned leaf. After the binding
exists, `buildDispatch` reports the obligation as collected by no page. Step 3
satisfies dispatch coverage.

## 3. Write the controller

Export `meta` by spreading the page identity and listing every obligation this
page owns:

```js
export const meta = { ...page, collects: ['fieldName'] }
```

Use `collects: []` only when the page owns no obligation or edits a collection
whose root another page already owns.

Use one `render()` helper for GET and POST errors. Build the common view with
`kit.base()`. Pass `journey` so the shared reference strip renders. The normal
back link is `hubPath(journey.journeyId)`.

GET calls `state.get()` once and prefills from `answers`. POST:

1. reads raw payload values
2. validates with [`lib/validate/index.js`](../lib/validate/index.js)
3. re-renders raw values with status 400 on error
4. commits cleaned values with `state.commit()`
5. redirects through `await kit.nextTarget(request, page, committed.scope)`

Wrap the write in `kit.recoverableSave()`. A marked persistence failure renders
the same values with `recoverableError: true` and status 500. Unexpected errors
must throw.

Export the standard routes:

```js
export const routes = kit.pageRoutes(page, { get, post })
```

Use explicit Hapi route objects only when the page needs more than this GET and
POST pair.

## 4. Add copy and the Nunjucks view

Put all user-facing text in `copy/copy.en.js` and `copy/copy.cy.js`. Keep both
bundles the same shape and resolve them with `copyFor({ en, cy })`.

Extend the shared live-animals layout. Include the shared error summary and
save actions. Render fields with GOV.UK or MoJ macros. Keep each input name,
input id and validation error key the same so an error-summary link focuses the
control.

Run `npm run test:live-animals`. Fix local copy tests,
[`copy-convention.test.js`](../copy-convention.test.js) and
[`copy-parity.test.js`](../copy-parity.test.js) before continuing.

## 5. Register routes and dispatch

Import the controller namespace in
[`features/index.js`](../features/index.js).

- Add `meta` to `dispatchPages` when the controller exports it. This includes a
  page with `collects: []`, because its id and slug must be indexed for gates
  and navigation.
- Spread `routes` into `allRoutes`.

`routes.js` passes `allRoutes` to Hapi. `buildDispatch(dispatchPages)` rejects
an unsafe obligation name, two page owners and an uncovered obligation.

Run `npm run test:live-animals`. Dispatch should now build. If it does not,
correct `meta.collects` or the `dispatchPages` registration. Do not add a second
owner to silence coverage.

## 6. Place the page in the journey and hub task row

Import the page identity into [`flow/flow.js`](../flow/flow.js). Put it in the
right `sections` entry. Its position controls `nextInSection()` and
strictly-earlier prerequisites.

Import it into [`flow/task-rows.js`](../flow/task-rows.js). Put it in an
existing task row when those pages form one user task. Add a task row only when
the page needs its own entry on the hub. A task row is the hub entry; a flow
section is the navigation sequence.

If you add a task row, also:

- add the row id to one `GROUPS` entry in
  [`features/hub/controller.js`](../features/hub/controller.js)
- add matching English and Welsh `rows` copy in the hub feature
- update [`features/hub/copy/copy.test.js`](../features/hub/copy/copy.test.js),
  [`features/hub/hub.e2e.spec.js`](../features/hub/hub.e2e.spec.js) and
  [`flow/task-rows.test.js`](../flow/task-rows.test.js)

`pageGatePasses()` derives the normal gate from `collects` plus earlier
continue-enforced fields. Add an authored `gate` to the page identity only when
that rule cannot express the page.

Add the page to [`flow/run.js`](../flow/run.js) only when it belongs in the
opening run. Update its run tests if you do.

## 7. Add check-answers and backend mapping when needed

Add the page's fields to the matching check-answers card and both
check-answers copy bundles. Pass each obligation name to `row()` or
`changeAction()` so the dispatch index builds the Change URL. Extend
[`features/check-answers/check-answers.e2e.spec.js`](../features/check-answers/check-answers.e2e.spec.js).

Canonical persistence is complete once the feature binding is registered. If
the backend notification shape also has a home for a new field, update the
matching module under
[`services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/index.js)
and its
[`notification-mapper.test.js`](../services/persistence/records/notification-mapper/notification-mapper.test.js).
If there is no backend field home, leave the mapper unchanged and assert the
omission. Do not invent one.

## 8. Register client JavaScript when needed

Most pages need no page-specific JavaScript. If this page does:

1. Add a feature entry module, following
   [`features/documents/client/index.js`](../features/documents/client/index.js).
2. Add a named `entry` to the repo-root `webpack.config.js`.
3. Load it in the template with `getAssetPath('<entry>.js')`, following
   [`features/documents/template.njk`](../features/documents/template.njk).

If the webpack entry is missing, the template renders and the bundle returns a
silent 404.

## 9. Add unit and contract tests

Add the controller's valid POST to
[`contract.test.js`](../contract.test.js). Supply a valid payload and any seed
that brings conditional obligations into scope. The case must commit exactly
the committable names in `meta.collects`.

This contract table is manual. A new controller that is absent from the table
does not make the test fail, so add the case even when the suite is green.

In `controller.test.js`, cover:

- GET prefill and view model
- every validation rule
- raw values and no commit on a 400 response
- cleaned values and redirect on success
- conditional fields and gates
- recoverable persistence failure returning 500
- unexpected errors throwing

Add or update flow tests for section order, skip behaviour, task-row entry,
status and opening-run behaviour.

## Playwright feature test

Keep the spec with the feature. A small feature uses
`features/<name>/<name>.e2e.spec.js`, as in
[`features/import-reason/import-reason.e2e.spec.js`](../features/import-reason/import-reason.e2e.spec.js).
A multi-page feature uses `features/<group>/e2e/<page>.e2e.spec.js`, as in
[`features/transport/e2e/arrival-transit.e2e.spec.js`](../features/transport/e2e/arrival-transit.e2e.spec.js).

Make every test independent and give it a new notification. Do not use page
objects. Use raw role, label and visible-copy locators. Use locator assertions
and Playwright auto-waiting. Use `expect.poll` when waiting for state without a
locator. Never use a sleep.

Cover:

- initial render, heading, copy, hints, controls and service-backed options
- happy-path save and the correct next-page or hub redirect
- reload and persistence of every entered value
- each validation rule in its own test
- preservation of entered values on error
- every error-summary link moving focus to its control
- back, Save and return to hub, Cancel and Change navigation as applicable
- conditional scope, skip and purge behaviour
- the check-answers rows and Change links

## Accessibility test

Add one axe check for the initial render and one for the validation error
state. Use
[`features/origin/origin.e2e.spec.js`](../features/origin/origin.e2e.spec.js)
as the example.

Build axe with `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])`. Fail if
any result has `impact` equal to `serious` or `critical`. Only filter a known
component false positive when the same component and condition apply.

## 10. Run every check

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.
