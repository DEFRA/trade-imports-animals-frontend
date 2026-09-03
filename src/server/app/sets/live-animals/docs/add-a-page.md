# How to add a page

Use this recipe for one new journey page. Use [add-a-section.md](add-a-section.md)
when several new pages form one feature group and one hub task row.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/app/sets/live-animals/`.

## Read these files first

Use import reason as the small, complete page example:

- [`journeys/linear/features/import-reason/page.js`](../journeys/linear/features/import-reason/page.js)
- [`journeys/linear/features/import-reason/controller.js`](../journeys/linear/features/import-reason/controller.js)
- [`journeys/linear/features/import-reason/template.njk`](../journeys/linear/features/import-reason/template.njk)
- [`journeys/linear/features/import-reason/evaluation.js`](../journeys/linear/features/import-reason/evaluation.js)
- [`journeys/linear/features/import-reason/copy/copy.en.js`](../journeys/linear/features/import-reason/copy/copy.en.js)
- [`journeys/linear/features/import-reason/copy/copy.cy.js`](../journeys/linear/features/import-reason/copy/copy.cy.js)
- [`journeys/linear/features/import-reason/copy/copy.test.js`](../journeys/linear/features/import-reason/copy/copy.test.js)
- [`journeys/linear/features/import-reason/controller.test.js`](../journeys/linear/features/import-reason/controller.test.js)
- [`journeys/linear/features/import-reason/import-reason.fit.spec.js`](../journeys/linear/features/import-reason/import-reason.fit.spec.js)
- [`obligations/sections/import-reason.js`](../obligations/sections/import-reason.js)

Use
[`journeys/linear/features/origin/origin.fit.spec.js`](../journeys/linear/features/origin/origin.fit.spec.js)
for per-rule validation and initial-render plus error-state accessibility tests.
Read [`journeys/linear/features/index.js`](../journeys/linear/features/index.js),
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js) and
[`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js) before registering the page.

## 1. Define the page identity and files

Create this feature folder:

```text
journeys/linear/features/<name>/
├── controller.js
├── controller.test.js
├── copy/
│   ├── copy.cy.js
│   ├── copy.en.js
│   └── copy.test.js
├── evaluation.js
├── page.js
├── template.njk
└── <name>.fit.spec.js
```

If the page joins an existing multi-page feature, add its controller and
template inside that group. Keep the browser spec in that group's `fit/`
folder.

`page.js` exports only `{ id, slug }` and imports nothing. The controller and
flow import the same object. This prevents a module cycle through flow, status
and the controller.

Create both locale bundles and their test as soon as the template exists.
[`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js) scans feature folders.
It fails when a feature with a `.njk` file has no complete `copy/` folder.

## 2. Add the model and binding

Follow [add-a-field.md](add-a-field.md) for every field the page collects.
In order:

1. Add each copy-free obligation under `obligations/sections/`.
2. Re-export it and add it to the array in
   [`obligations/index.js`](../obligations/index.js).
3. Bind it in the feature's `evaluation.js`.
4. Register a new binding bundle in
   [`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js).

Do not put display text, options or validation rules in the obligation model.
Copy stays in the feature's `.njk` and copy files. Validation stays in the
controller.

Run `npm run test:live-animals` after adding the obligation. Vitest setup reports an
unowned leaf before the binding exists. After the binding exists, tests that build
dispatch report the obligation as collected by no page. Step 3 satisfies dispatch
coverage.

## 3. Write the controller

Export `meta` by spreading the page identity and listing every obligation this
page owns:

```js
export const meta = { ...page, collects: ['fieldName'] }
```

Use `collects: []` only when the page owns no obligation or edits a collection
whose root another page already owns.

Use one `render()` helper for GET and POST errors. Build the common view with
`kit.base()`. Pass `journey` so the shared reference strip renders, and `page`
so the section caption does. The normal back link is
`hubPath(journey.journeyId)`.

GET calls `state.get()` once and prefills from `answers`. POST:

1. reads raw payload values
2. validates with [`src/server/app/lib/validate/index.js`](../../../lib/validate/index.js)
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

Extend `shared/layout.njk`, which resolves from the `src/server/app` Nunjucks root.
Include the shared error summary and save actions. Import the section caption with
`{% from "shared/section-caption.njk" import sectionCaption %}` and call
`{{ sectionCaption(caption) }}` immediately above the page heading, passing the
caption size that matches the heading. `journeys/linear/features/origin/template.njk`
is the example. Render fields with GOV.UK or MoJ macros. Keep each input name, input
id and validation error key the same so an error-summary link focuses the control.

Import `TEMPLATES` from
[`journeys/linear/config.js`](../journeys/linear/config.js) in the controller and
build the view name below its `live-animals/journeys/linear` prefix. Do not prefix
the shared layout: `LAYOUT` is `shared/layout.njk` and resolves from the other
Nunjucks root.

Run `npm run test:live-animals`. Fix local copy tests,
[`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js) and
[`src/server/app/copy-parity.test.js`](../../../copy-parity.test.js) before continuing.

## 5. Register routes and dispatch

Import the controller namespace in
[`journeys/linear/features/index.js`](../journeys/linear/features/index.js).

- Add `meta` to `dispatchPages` when the controller exports it. This includes a
  page with `collects: []`, because its id and slug must be indexed for gates
  and navigation.
- Spread `routes` into `allRoutes`.

`src/server/app/routes.js` passes `allRoutes` to Hapi.
`buildDispatch(dispatchPages)` rejects
an unsafe obligation name, two page owners and an uncovered obligation.

Run `npm run test:live-animals`. Dispatch should now build. If it does not,
correct `meta.collects` or the `dispatchPages` registration. Do not add a second
owner to silence coverage.

## 6. Place the page in the journey and hub task row

Import the page identity into [`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js). Put it in the
right `sections` entry. Its position controls `nextInSection()` and
strictly-earlier prerequisites.

Import it into [`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js). Put it in an
existing task row when those pages form one user task. Add a task row only when
the page needs its own entry on the hub. A task row is the hub entry; a flow
section is the navigation sequence.

Decide the page's caption in
[`journeys/linear/flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js):
add it to the section it belongs to, or to the bare list in that folder's test.
The test fails until you do one or the other.

If you add a task row, also:

- add the row id to one `GROUPS` entry in
  [`journeys/linear/features/hub/controller.js`](../journeys/linear/features/hub/controller.js)
- add matching English and Welsh `rows` copy in the hub feature
- update [`journeys/linear/features/hub/copy/copy.test.js`](../journeys/linear/features/hub/copy/copy.test.js),
  [`journeys/linear/features/hub/hub.fit.spec.js`](../journeys/linear/features/hub/hub.fit.spec.js) and
  [`journeys/linear/flow/task-rows.test.js`](../journeys/linear/flow/task-rows.test.js)

`pageGatePasses()` derives the normal gate from `collects` plus earlier
continue-enforced fields. Add an authored `gate` to the page identity only when
that rule cannot express the page.

Add the page to [`journeys/linear/flow/run.js`](../journeys/linear/flow/run.js) only when it belongs in the
opening run. Update its run tests if you do.

## 7. Add check-answers and backend mapping when needed

Add the page's fields to the matching check-answers card and both
check-answers copy bundles. Pass each obligation name to `row()` or
`changeAction()` so the dispatch index builds the Change URL. Extend
[`journeys/linear/features/check-answers/check-answers.fit.spec.js`](../journeys/linear/features/check-answers/check-answers.fit.spec.js).

Canonical persistence is complete once the feature binding is registered. If
the backend notification shape also has a home for a new field, update the
matching module under
[`src/server/app/services/persistence/records/notification-mapper/`](../../../services/persistence/records/notification-mapper/index.js)
and its
[`notification-mapper.test.js`](../../../services/persistence/records/notification-mapper/notification-mapper.test.js).
If there is no backend field home, leave the mapper unchanged and assert the
omission. Do not invent one.

## 8. Register client JavaScript when needed

Most pages need no page-specific JavaScript. If this page does:

1. Add a feature entry module, following
   [`journeys/linear/features/documents/client/index.js`](../journeys/linear/features/documents/client/index.js).
2. Add a named `entry` to the repo-root `webpack.config.js`.
3. Load it in the template with `getAssetPath('<entry>.js')`, following
   [`journeys/linear/features/documents/template.njk`](../journeys/linear/features/documents/template.njk).

If the webpack entry is missing, the template renders and the bundle returns a
silent 404.

## 9. Add unit and contract tests

Add the controller's valid POST to
[`src/server/app/contract.test.js`](../../../contract.test.js). Supply a valid payload and any seed
that brings conditional obligations into scope. The case must commit exactly
the committable names in `meta.collects`.

This contract table is manual. A new controller that is absent from the table
does not make the test fail, so add the case even when the suite is green.
Run `npm test` to exercise it; `npm run test:live-animals` does not include L1
contract tests.

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
`journeys/linear/features/<name>/<name>.fit.spec.js`, as in
[`journeys/linear/features/import-reason/import-reason.fit.spec.js`](../journeys/linear/features/import-reason/import-reason.fit.spec.js).
A multi-page feature uses `journeys/linear/features/<group>/fit/<page>.fit.spec.js`, as in
[`journeys/linear/features/transport/fit/arrival-transit.fit.spec.js`](../journeys/linear/features/transport/fit/arrival-transit.fit.spec.js).

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
- back, Save and return to overview, Cancel and Change navigation as applicable
- conditional scope, skip and purge behaviour
- the check-answers rows and Change links

## Accessibility test

Add one axe check for the initial render and one for the validation error
state. Use
[`journeys/linear/features/origin/origin.fit.spec.js`](../journeys/linear/features/origin/origin.fit.spec.js)
as the example.

Build axe with `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])`. Fail if
any result has `impact` equal to `serious` or `critical`. Only filter a known
component false positive when the same component and condition apply.

## 10. Run every check

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.
