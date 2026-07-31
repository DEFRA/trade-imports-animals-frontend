# How to add a page

A page is a vertical slice under `features/`. Use
`features/import-reason/` as the small-page example.

Paths are relative to `src/server/live-animals/`.

## 1. Create the feature files

Create:

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

Large features can split controllers, templates and browser tests into nested
folders. Their browser tests live in `features/<name>/e2e/`.

`page.js` exports only `{ id, slug }` and imports nothing. The controller and
flow import the same object. This avoids a module cycle through flow, status and
the controller.

## 2. Write the controller

Export `meta`, with the page identity and the obligations it collects:

```js
export const meta = { ...page, collects: ['reasonForImport'] }
```

Use an empty `collects` only for a page that owns no new obligation, or edits a
collection already owned by another page.

Keep one `render()` helper for GET and POST errors. Build the base view with
`kit.base()`. Pass the journey so the shared reference strip can render.

GET reads once with `state.get()`. POST reads the payload, validates it and
returns 400 with the user's values when invalid. A valid POST writes through
the engine and redirects with `kit.nextTarget()`.

Wrap persistence calls in `kit.recoverableSave()`. Render the same form with
`recoverableError: true` and status 500 for a marked backend failure.

Export the standard GET and POST routes with:

```js
export const routes = kit.pageRoutes(page, { get, post })
```

Use explicit route objects only when the feature needs more than the standard
pair.

## 3. Keep copy local

Put all user-facing text in `copy/copy.en.js` and `copy/copy.cy.js`. Both files
must have the same shape. Resolve them through `copyFor({ en, cy })`.

Pass copy into the template. Use GOV.UK or MoJ macros and the shared layout,
error summary and save actions. Do not put display text in an obligation.

## 4. Register persistence

Declare any new obligations and bindings as described in
[add-a-field.md](add-a-field.md). Register a new feature binding in
`features/evaluation.js`.

The binding registry checks every manifest leaf at boot. It rejects missing or
duplicate owners and invalid collection paths.

## 5. Register routes and dispatch

Import the controller in `features/index.js`.

- Add `meta` to `dispatchPages` when the page has a `meta` export.
- Add its `routes` to `allRoutes`.

`buildDispatch()` checks that each obligation has one page owner. The plugin
passes `allRoutes` to Hapi after all boot checks pass.

## 6. Place the page in the journey

Import the page leaf in `flow/flow.js` and place it in the right section. Its
position controls `nextInSection()`.

Add the page to `flow/task-rows.js`. Put it in an existing row when the pages
form one task. Add a row when the page is a separate task.

`pageGatePasses()` derives the normal gate from the page's collected
obligations and earlier continue-enforced fields. Add an authored `gate` to the
page leaf only when that rule cannot express the page.

Add the page to `flow/run.js` only when it belongs in the opening run. A target
that fails its gate is skipped.

## 7. Add checks

Add the page's valid POST to `contract.test.js`. It must commit exactly the
obligations in `meta.collects`.

Keep controller and copy tests beside the feature. Cover validation, raw-value
rendering, cleaned writes, conditional fields and recoverable failures that the
page supports.

Add a Playwright `*.e2e.spec.js` beside a small feature. Use a nested `e2e/`
folder for a larger feature. Cover:

- the heading and service-backed options
- invalid input and error-summary focus
- a valid save, redirect and reload
- back and change navigation
- serious and critical axe findings where the page owns that check

Run the commands in [testing.md](testing.md).
