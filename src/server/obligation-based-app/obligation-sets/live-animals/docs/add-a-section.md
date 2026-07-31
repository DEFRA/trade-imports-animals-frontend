# How to add a feature group and task row

Use this recipe when several new pages form one user task and must appear as one
entry on the hub.

The code uses three separate terms:

- a **feature group** is a nested folder under `features/` that owns related
  pages, copy and persistence bindings
- a **flow section** is an entry in `flow/flow.js`; it controls page order and
  `nextInSection()`
- a **task row** is an entry in `flow/task-rows.js`; it is the item shown on the
  hub and it drives submit readiness

This recipe creates all three. Do not call the hub entry a section in code.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/obligation-based-app/obligation-sets/live-animals/`.

## Read these files first

Transport is the current multi-page feature-group example:

- [`model/obligations/sections/transport.js`](../model/obligations/sections/transport.js)
- [`features/transport/page.js`](../features/transport/page.js)
- [`features/transport/evaluation.js`](../features/transport/evaluation.js)
- [`features/transport/copy/copy.en.js`](../features/transport/copy/copy.en.js)
- [`features/transport/copy/copy.cy.js`](../features/transport/copy/copy.cy.js)
- [`features/transport/copy/copy.test.js`](../features/transport/copy/copy.test.js)
- [`features/transport/port-of-entry/port-of-entry.controller.js`](../features/transport/port-of-entry/port-of-entry.controller.js)
- [`features/transport/port-of-entry/port-of-entry.njk`](../features/transport/port-of-entry/port-of-entry.njk)
- [`features/transport/e2e/arrival-transit.e2e.spec.js`](../features/transport/e2e/arrival-transit.e2e.spec.js)
- [`features/transport/e2e/transporters.e2e.spec.js`](../features/transport/e2e/transporters.e2e.spec.js)

Trace its registration through:

- [`features/index.js`](../features/index.js)
- [`features/evaluation.js`](../features/evaluation.js)
- [`flow/flow.js`](../flow/flow.js)
- [`flow/task-rows.js`](../flow/task-rows.js)
- [`features/hub/controller.js`](../features/hub/controller.js)
- [`features/hub/copy/copy.en.js`](../features/hub/copy/copy.en.js)
- [`flow/task-rows.test.js`](../flow/task-rows.test.js)
- [`features/hub/hub.e2e.spec.js`](../features/hub/hub.e2e.spec.js)

The transport flow section has five pages. The hub does not render that
section directly. It renders three task rows: arrival details, transit
countries and transporter. For a new feature group that needs one hub entry,
put all of its pages in one new task row.

## 1. Define the user task and its data

Choose stable ids before writing code:

- feature-group folder name
- flow-section id
- task-row id
- one page id and slug per page
- obligation names and UUIDs

Decide which page owns each obligation. One obligation has one page owner. If a
later page only edits data owned by an earlier collection page, it uses
`collects: []`.

Add the obligations to the matching file under
`model/obligations/sections/`. Re-export them and add them to the array in
[`model/obligations/obligations.js`](../model/obligations/obligations.js).
Use `applyTo` helpers when answers gate later fields or branches.

Keep obligations and domain code copy-free. Do not put titles, labels, hints,
options, route names or template choices in the model. The feature owns display
copy and the controller owns validation.

Run:

```bash
npm run test:live-animals
```

The fulfilment registry reports each new leaf as owned by no feature. Model
coverage may report ids, names, group paths or gate dependencies first. Fix the
model errors, then continue.

## 2. Create the feature group and bindings

Create this shape:

```text
features/<group>/
├── copy/
│   ├── copy.cy.js
│   ├── copy.en.js
│   └── copy.test.js
├── e2e/
│   └── <group>.e2e.spec.js
├── <first-page>/
│   ├── <first-page>.controller.js
│   ├── <first-page>.controller.test.js
│   └── <first-page>.njk
├── <second-page>/
│   ├── <second-page>.controller.js
│   ├── <second-page>.controller.test.js
│   └── <second-page>.njk
├── evaluation.js
└── page.js
```

Keep every `{ id, slug }` object in the import-free `page.js`. Put all
group-owned English and Welsh copy in the shared `copy/` folder, namespaced by
page. Keep the two locale bundles the same shape.

In `evaluation.js`, use `feature('<group>', [...])` and bind every leaf with
`scalar()` or `grouped()`. Import the bundle in
[`features/evaluation.js`](../features/evaluation.js) and add it to
`featureEvaluationBindings`.

Run `npm run test:live-animals`. The fulfilment-registry error should be gone.
`buildDispatch` now reports each new obligation as collected by no page. Step 3
satisfies dispatch.

## 3. Build each page in journey order

Follow [add-a-page.md](add-a-page.md) for each page. Each controller exports:

- `meta: { ...page, collects: [...] }`
- GET and POST handlers
- `routes`, normally from `kit.pageRoutes(page, { get, post })`

GET reads once through `state.get()`. POST validates raw input, returns 400 with
raw values on error, commits cleaned values on success and redirects through
`kit.nextTarget()`. Wrap every persistence write in `kit.recoverableSave()` and
return the same form with status 500 for a marked failure.

Use `scope.has()` for conditional fields. Do not render, validate or commit a
field that is out of scope. Let the evaluator purge a value when its obligation
leaves scope.

Add each `.njk` view, including the shared error summary and save actions. Keep
input names, ids and error keys aligned for error-summary focus.

Run `npm run test:live-animals`. At this point copy checks can fail:

- `copy-convention.test.js` requires a complete `copy/` folder for a feature
  with templates
- `copy-parity.test.js` requires equal English and Welsh bundle shapes

Complete both bundles and the group copy test before continuing.

## 4. Register every controller and route

Import every controller namespace in
[`features/index.js`](../features/index.js).

- Add every controller `meta` to `dispatchPages`, including pages with
  `collects: []`.
- Spread every controller's `routes` into `allRoutes`.

Run `npm run test:live-animals`. `buildDispatch` should pass. If it reports an
uncovered obligation, correct the owning page's `collects`. If it reports two
owners, remove the duplicate claim.

Add one valid POST case per collecting controller to
[`contract.test.js`](../contract.test.js). Each case supplies a valid payload
and any scope seed, and must commit exactly its `meta.collects`.

The contract cases are manually listed. A missing new controller does not make
the test fail. Treat adding each case as required work.

## 5. Add the flow section

Import every page identity into [`flow/flow.js`](../flow/flow.js). Add one entry
to `sections`:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

The array order is journey order. `nextInSection()` moves through the first
gate-passing later page, then returns to the hub. The section's place among
other sections also controls strictly-earlier continue prerequisites.

Normal page and section gates are derived from `meta.collects`, in-scope
obligations and earlier continue prerequisites. Add an authored `gate` only for
a flow fact that those rules cannot express. Add focused navigation and gate
tests for every conditional page or branch.

Add these pages to [`flow/run.js`](../flow/run.js) only if product behaviour
puts them in the opening run. Update opening-run tests when you do.

## 6. Add one task row and wire it to the hub

Import the page identities in [`flow/task-rows.js`](../flow/task-rows.js) and
add one row:

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

The row status defaults to the union of those pages' `collects`. Use `parts`
only when the row needs a collection facet. Use `conditional: true` only when
the hub must hide a Not applicable row.

Add the task-row id to the right object in the hub controller's `GROUPS` list.
Add the row title and hint to both hub copy bundles. Add a new numbered hub
group only when the design requires a new heading; if so, add its caption to
both locale bundles too.

Update:

- [`flow/task-rows.test.js`](../flow/task-rows.test.js) for Not yet started, In
  progress, Completed, Optional or Not applicable states, row gate and first
  entry page
- [`features/hub/copy/copy.test.js`](../features/hub/copy/copy.test.js) for
  group copy, row copy, position, link and status
- [`features/hub/hub.e2e.spec.js`](../features/hub/hub.e2e.spec.js) for the
  visible task row, lock state, link and completed state

Every task row participates in `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete. Prove both the blocked
and complete states in `flow/task-rows.test.js`.

## 7. Add check-answers output

Add a section or cards for the feature under
[`features/check-answers/view-model/`](../features/check-answers/view-model/index.js).
Add English and Welsh headings, row labels and value labels to the
check-answers copy bundles.

Pass obligation names to `row()` and `changeAction()` so Change links resolve
through dispatch. Use `scope` to omit out-of-scope rows. Extend
[`features/check-answers/check-answers.e2e.spec.js`](../features/check-answers/check-answers.e2e.spec.js)
for every value and Change target.

## 8. Update downstream persistence when applicable

Feature bindings always write canonical fulfilment. If the backend notification
has homes for the new values, add them to the matching modules under
[`services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/index.js)
and extend
[`services/persistence/records/notification-mapper/notification-mapper.test.js`](../services/persistence/records/notification-mapper/notification-mapper.test.js).

Check Mapper A and Mapper B separately. If a backend shape has no field home,
keep the value out of that projection and add an explicit omission assertion.
Do not invent fields.

## 9. Register client JavaScript when needed

If any page needs feature JavaScript:

1. Add a client entry module, following
   [`features/documents/client/index.js`](../features/documents/client/index.js).
2. Add a named `entry` in the repo-root `webpack.config.js`.
3. Load it from the relevant template with `getAssetPath('<entry>.js')`,
   following
   [`features/documents/template.njk`](../features/documents/template.njk).

Without the webpack entry, the HTML works but the bundle URL returns a silent 404.

## 10. Add unit tests

Add a controller test next to every controller. Cover GET prefill, each
validation rule, raw values on error, cleaned committed values, conditional
scope, redirects, marked recoverable failures and unexpected errors.

Add focused tests for bindings, model gates, flow order, branch skipping,
task-row status, hub rendering, check-answers rows and notification mapping.

## Playwright feature test

Put the co-located specs in `features/<group>/e2e/`, following
[`features/transport/e2e/arrival-transit.e2e.spec.js`](../features/transport/e2e/arrival-transit.e2e.spec.js)
and
[`features/transport/e2e/transporters.e2e.spec.js`](../features/transport/e2e/transporters.e2e.spec.js).

Keep tests independent. Each test starts its own notification. Do not create
page objects. Use raw role, label and visible-copy locators. Use Playwright
locator assertions and auto-waiting. Use `expect.poll` for non-locator state.
Do not sleep.

Cover the complete task:

- the hub row, initial status and first-page link
- happy-path movement through every page and back to the hub
- each page's persisted values after reload
- each validation rule in its own test
- preservation of all entered values on error
- every error-summary link moving focus to the right control
- each conditional branch, skipped page and out-of-scope value purge
- Back, Save and return to hub, Cancel and Change navigation
- the completed hub-row status
- all check-answers values and Change targets

## Accessibility test

Add axe coverage for every new page in both states:

- initial render
- validation error state after the error summary appears

Use the helper pattern in
[`features/transport/e2e/arrival-transit.e2e.spec.js`](../features/transport/e2e/arrival-transit.e2e.spec.js).
Run `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])` and fail on every
`serious` or `critical` violation. Filter only a proved component false
positive.

Add or extend the hub axe test when the new row or a new group heading changes
the hub state.

## 11. Run every check

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, the new hub row reaches its first page, and
lint has no errors.
