# How to add a page

Use this recipe for one new journey page. Use [add-a-section.md](add-a-section.md)
when several new pages form one feature group and one hub task row.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/app/sets/live-animals/`.

## Read these files first

Use import reason as the complete page example — it shows every file a page
needs. Its conditional-reveal machinery (the `REVEALS` map, the per-branch
`RULES` table and the branch-keyed `fields()`) is specific to that page: read
past it, do not copy it into a plain new page.

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
template inside that group, and name the template after the page —
`<page>/<page>.njk`, not `template.njk` — as in
[`journeys/linear/features/transport/port-of-entry/port-of-entry.njk`](../journeys/linear/features/transport/port-of-entry/port-of-entry.njk).
Keep the browser spec in that group's `fit/` folder.

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
`kit.base()`. Pass `journey` so the shared reference strip renders. A page that
shows no status strip still passes `journey`, with `showJourneyStrip: false`.
Pass `page` so the section caption renders. The normal back link is
`hubPath(journey.journeyId)`. A page that is a step of the opening run takes its
back link from `kit.runBackLink()`, which opens the previous run step while the
run is active and falls back to the overview when the run is over or no named
earlier step applies. A page that returns to the review rather than the
overview says so to the same helper, with its `returnsToReview` option,
rather than building its own target.

GET calls `state.get()` once and prefills from `answers`. POST:

1. reads raw payload values
2. validates with [`src/server/app/lib/validate/index.js`](../../../lib/validate/index.js)
3. re-renders raw values with status 400 on error and logs nothing, because a
   user's own field errors shown back on the form are not logged (a refusal that
   is not the user's input error logs once through `kit.logRefusal` with the
   journey id)
4. commits cleaned values with `state.commit()`
5. redirects through `await kit.nextTarget(request, page, committed.scope)`

Wrap the write in `kit.recoverableSave(request, …)`. A marked persistence
failure is logged once by `recoverableSave`; render the same values with
`recoverableError: true` and status 500. Unexpected errors must throw.

"Save and return to overview" posts `exit=hub`. It runs the same validation as
"Save and continue", with no opt-in, and only changes where a valid save goes.
A page with no required rule accepts a blank on both buttons: `oneOf` and an
empty `compose()` already accept one.

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

Pass `amend: amend` in the object `saveActions` takes on every page listed in a task row's `pages`
([`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js)) and on
every role or party picker. `kit.base()` supplies `amend` when the controller passes
it the request (`request`, or `h.request` where the render has only the toolkit):
the two form actions the save buttons carry while the notification is being amended,
and null otherwise. The two amend buttons tell themselves apart by form action.
On a page whose save buttons post to another service, the Upload documents page,
neither has a URL of its own, so the amend Save and return also posts the
submitted value `amendFormActions` returns. While amending, a task-row page shows Save and return, Save and
continue and Save and return to overview. A page that also passes
`showReturnControls: false` (the CPH number page, the role address pickers) or
`hubExitWhileAmending: false` (the contact address page) shows only the first two.
Do not pass `amend` on an add-another sub-page that returns to its own list page:
the transporter add, select and details pages pass `showReturnControls: false`
alone, and the list page carries the amend ending.
[`amend-endings.test.js`](../journeys/linear/features/amend-endings.test.js) renders
every task-row page while amending and fails if one loses the ending.

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

`src/server/app/routes-live-animals.js` — this set's gateway, re-exported by the
`routes.js` barrel — wraps `allRoutes` in its set context and passes them to
Hapi. `buildDispatch(SET_ID, dispatchPages)` rejects
an unsafe obligation name, two page owners and an uncovered obligation.

Run `npm run test:live-animals`. Dispatch should now build. If it does not,
correct `meta.collects` or the `dispatchPages` registration. Do not add a second
owner to silence coverage.

## 6. Place the page in the journey and hub task row

Import the page identity into [`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js). Put it in the
right `sections` entry. Its position controls strictly-earlier
prerequisites and where Save and continue goes outside the opening run
(`nextInTaskRow()`: the next page of the section only when it is in the same
task row).

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

Add the page to [`journeys/linear/flow/run.js`](../journeys/linear/flow/run.js) in
journey order. The run is the whole notification, so every new question page gets
a `RUN_STEPS` entry unless it is deliberately outside the run (the dashboard,
declaration and confirmation are the only ones today) — a page left out is jumped
straight over while the run is active and is reachable only from its hub row. See
[`journey-flow-and-gates.md`](journey-flow-and-gates.md), "Opening run and entry
guard". Update
[`journeys/linear/flow/run.test.js`](../journeys/linear/flow/run.test.js) when you
do; its coverage invariant fails if you forget.

## 7. Add check-answers and backend mapping when needed

Add the page's rows to the matching check-answers card and their row labels to
both check-answers copy bundles. A value label that the page itself already
shows is read from that feature's label function (for example
`meansOfTransportLabel`), never copied into the check-answers copy. Value
labels only the review shows go in the check-answers copy bundles.

Rows carry no Change link — `row(key, value)` is a
key and a value. If the page's fields go into a NEW card, the card needs one
`cardAction(journeyId, <page>.slug, copy.hidden.cards.<cardId>)` wrapped in
`editableActions(readOnly, ...)`, plus a `hidden.cards.<cardId>` leaf in BOTH
check-answers copy bundles — `copy.en.js` and `copy.cy.js`. Without that leaf
the fit assertion "every Change link sits in a card heading and no summary row
carries one"
([`check-answers.fit.spec.js`](../journeys/linear/features/check-answers/check-answers.fit.spec.js))
fails. Extend
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

Most pages need no page-specific JavaScript. If this page does, pick the route:

- A small enhancement that reacts to one control is a `data-module` component,
  scripted below.
- A page that orchestrates its own behaviour gets a feature entry module and a
  webpack entry, scripted after it.

For the component route:

1. Add the class under `src/client/javascripts/components/` with a
   `static moduleName` matching the template's `data-module`, following
   [`status-announcer.js`](../../../../../client/javascripts/components/status-announcer.js)
   and
   [`region-code-prefix.js`](../../../../../client/javascripts/components/region-code-prefix.js).
2. Register it with `createAll` in `src/client/javascripts/application.js`.
3. Add a jsdom unit test beside the class (`<name>.test.js`), following
   [`region-code-prefix.test.js`](../../../../../client/javascripts/components/region-code-prefix.test.js),
   that initialises it through `createAll`.
4. For server-rendered markup that must not show without JavaScript, give it
   the existing `app-js-only` class (hidden by
   `.govuk-template__body:not(.govuk-frontend-supported) .app-js-only` in
   `src/client/stylesheets/core/_main.scss`). Never add a second hide mechanism.

For the feature entry route:

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

## Test support

Build test set-up from the shared helpers, and extend them rather than writing
set-up in the test file:

- controller tests:
  [`engine/test-support.js`](../../../engine/test-support.js) exports:
  - `driveHandler` seeds a journey, runs one handler and returns the answers
    before and after, the response, the view, the cookies and the logger; its
    `openingRun` option (`RUN_ACTIVE` or `RUN_COMPLETE`) records that phase of the
    opening run, and `saveFailure` makes every save the handler makes fail with
    the error it is given
  - `getHandlerOf` returns the GET handler of a feature module
  - `postHandlerOf` and `postHandlerEndingWith` return its POST handler
  - `useStubbedJourney` registers the stub records, the stub session, the
    dispatch and a cleared store for a describe
  - `journeyRequest`, `stubH`, `recordingH` and `recordingLogger` build the
    request, toolkit and logger
  - `expectBackLinkIsPage` asserts the Back link is a page of the journey
  - `expectOneRefusalLogged` asserts the logger holds exactly one refusal line
  - `expectOneSaveFallbackLogged` asserts it holds exactly one save fallback line
  - `expectRemovalRefusedLogged` asserts it holds exactly one refused removal line
  - `unavailableBackendError` builds the error a save failure is given
  - `addressBookAnswering` puts the address book on the network boundary, and
    `resetMocksAndConfigAfterTests` resets it after each test
- browser tests:
  [`fit/live-animals-journey.js`](../../../../../../fit/live-animals-journey.js)
  — journey steps such as `startNotification`, `answerOriginEntry`,
  `selectSpecies`, `chooseTypeAheadOption`, `choosePortOfEntry`,
  `visitOverviewThenOpen`, `openNotificationView` and `documentRowFor`;
  `expectThreeSaveControls` proves the primary and Save and return to
  overview sit in the button group and Cancel and return to overview follows
  it, and `expectPageEndsWithPrimaryAlone` proves a page ends with the primary
  alone; `PHONE_VIEWPORT` is the narrow screen every overflow check uses;
  `answerOriginDetails` takes the country, region code and internal reference
  to type, each defaulting to the happy-path fixture; `urlUnderBase` anchors a
  URL matcher at the origin and the mount, because `toHaveURL` matches the whole
  URL, so a pattern anchored nowhere passes on a doubled prefix and one anchored
  at the mount alone never matches
- set-up shared only inside one feature: that feature's `test-support.js`, as in
  [`journeys/linear/features/declaration/test-support.js`](../journeys/linear/features/declaration/test-support.js)

When a second test needs the same set-up, move it into one of these helpers in
the same change and delete every local copy. Importing a sibling feature's test
helper is fine.

## Logging

What to log, and where, is under "Logging" in [`architecture.md`](../../../docs/architecture.md).

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
- while amending, the amend controls (three on a task-row page; two on pickers, the CPH number page and the contact address page; none on add-another sub-pages) and where each one goes
- conditional scope, skip and purge behaviour
- the check-answers rows and Change links

## Accessibility test

Add one axe check for the initial render and one for the validation error
state. Use
[`journeys/linear/features/origin/origin.fit.spec.js`](../journeys/linear/features/origin/origin.fit.spec.js)
as the example.

Call `expectNoSeriousOrCriticalViolations(page, subject)` from
[`fit/live-animals-journey.js`](../../../../../../fit/live-animals-journey.js).
It holds the five WCAG tags, fails if any result has `impact` equal to
`serious` or `critical`, and applies the one proved conditional-reveal filter.
Do not build `AxeBuilder` in a spec.

## 10. Run every check

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.
