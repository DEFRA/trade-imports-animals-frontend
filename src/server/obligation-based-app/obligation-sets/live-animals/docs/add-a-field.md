# How to add a field

Use this recipe for a scalar field on an existing page. For a field inside a
repeatable group, also follow [add-a-collection.md](add-a-collection.md).

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/obligation-based-app/obligation-sets/live-animals/`.

## Read these files first

Use the origin feature as the main example. It has several fields, conditional
scope, service-backed options, validation, persistence and check-answers rows.

- [`model/obligations/sections/origin.js`](../model/obligations/sections/origin.js)
- [`features/origin/evaluation.js`](../features/origin/evaluation.js)
- [`features/origin/controller.js`](../features/origin/controller.js)
- [`features/origin/template.njk`](../features/origin/template.njk)
- [`features/origin/copy/copy.en.js`](../features/origin/copy/copy.en.js)
- [`features/origin/copy/copy.cy.js`](../features/origin/copy/copy.cy.js)
- [`features/origin/controller.test.js`](../features/origin/controller.test.js)
- [`features/origin/origin.e2e.spec.js`](../features/origin/origin.e2e.spec.js)
- [`features/check-answers/view-model/cards/consignment/import-details.js`](../features/check-answers/view-model/cards/consignment/import-details.js)
- [`services/persistence/records/notification-mapper/mapper-a/sections/origin.js`](../services/persistence/records/notification-mapper/mapper-a/sections/origin.js)

Read [`features/cph-number/controller.js`](../features/cph-number/controller.js)
and
[`features/cph-number/cph-number.e2e.spec.js`](../features/cph-number/cph-number.e2e.spec.js)
when the field normalises input before it saves.

## 1. Add the obligation and run the focused tests

Add the obligation to the matching file under `model/obligations/sections/`.
Give it:

- a new UUID `id`
- a path-safe `name` with no `.`, `[` or `]`
- `status: 'mandatory'` or `status: 'optional'`, unless an `applyTo` helper
  supplies the status

Use `within` for a collection member. Use a helper from
[`model/obligations/helpers/index.js`](../model/obligations/helpers/index.js)
when another answer controls scope or mandate. The helper metadata must name
its dependency.

Import and export the object in
[`model/obligations/obligations.js`](../model/obligations/obligations.js), then
add it to the `obligations` array.

Do not put a label, title, hint, legend, option or other display logic in the
model. Obligations and domain code stay copy-free. Copy belongs to the feature.
[`obligation-purity.js`](../obligation-purity.js) enforces this at boot.

Run:

```bash
npm run test:live-animals
```

At this point the fulfilment registry fails because the new leaf has no
binding. This is expected. Continue to step 2. Model coverage can also report a
duplicate UUID, duplicate name, invalid `within` chain or missing gate
dependency. Fix those errors in the obligation declaration.

## 2. Bind the field to canonical persistence

Add the field to the owning feature's `evaluation.js`.

- Use `scalar({ field, obligation })` for a top-level field.
- Use `grouped({ field, obligation, groups })` with the full group path for a
  collection member.
- Add `convert` only when canonical fulfilment needs a different value from the
  cleaned page value.

If this is the feature's first binding file, import its `evaluationBindings`
in [`features/evaluation.js`](../features/evaluation.js) and add it to
`featureEvaluationBindings`.

Run `npm run test:live-animals` again. The fulfilment-registry error should be
gone. The boot-time `buildDispatch` check now reports the new obligation as
collected by no page. Step 3 satisfies that check.

## 3. Collect, validate and save the field

Add the obligation name to the owning controller's `meta.collects`. A page
that owns a repeatable collection still names only the root group.

Keep the controller in this order:

1. GET calls `state.get()` once and prefills the field from `answers`.
2. POST reads raw values from `request.payload`.
3. POST validates with the factories from
   [`lib/validate/index.js`](../lib/validate/index.js).
4. An invalid POST renders the user's raw values and returns 400.
5. A valid POST commits the cleaned values with `state.commit()`.
6. The redirect uses `await kit.nextTarget(request, page, committed.scope)`.

Build service-backed membership rules inside POST, or through a function that
POST calls. This uses the values primed at boot. Do not freeze a service list in
a module-level schema.

For a conditional field, use `scope.has(fieldName)` to decide whether to render
and validate it. Do not commit a hidden value. The evaluator removes stored
data when the obligation leaves scope.

Wrap the write in `kit.recoverableSave()`. On a marked persistence failure,
render the same values with `recoverableError: true` and return 500. Let other
errors throw.

Run `npm run test:live-animals`. `buildDispatch` should now pass. Update the
existing case for this controller in
[`contract.test.js`](../contract.test.js): add the field to the valid payload
and seed any answer that puts it in scope. The test expects a valid POST to
commit exactly the committable names in `meta.collects`.

The contract cases are a manual list. A new field on a listed controller often
makes its case fail. A controller that is not listed is not detected
automatically, so add a case rather than relying on a red test.

## 4. Add copy and markup

Add English and Welsh copy to the feature's `copy/copy.en.js` and
`copy/copy.cy.js`. Keep the same leaf paths and value kinds in both files.
Resolve the bundle with `copyFor({ en, cy })` in the controller.

Render the field with a GOV.UK or MoJ macro in the feature's `.njk` template.
Keep the input name, input id and validation error key the same. This lets the
error-summary link target `#<fieldName>` and move focus to the control.

Update the feature's `copy/copy.test.js`. The automatic convention checks are:

- [`copy-convention.test.js`](../copy-convention.test.js), which requires every
  feature with a template to own `copy/copy.en.js`, `copy/copy.cy.js` and
  `copy/copy.test.js`, and requires valid copy leaves
- [`copy-parity.test.js`](../copy-parity.test.js), which requires English and
  Welsh bundles to have the same shape

For a field in an existing feature, parity is normally the first copy check to
fail when only one locale changes. Add both locale leaves and update the local
copy test.

## 5. Add the check-answers row

Add the row to the matching card under
[`features/check-answers/view-model/cards/`](../features/check-answers/view-model/index.js).
Add its label and any displayed value labels to both check-answers copy
bundles.

Use `row()` for an editable scalar. Pass the obligation name so
`changeAction()` resolves the owning page through the dispatch index. Use a
service label function when the stored value is a code. Show a conditional row
only while the same obligation path is in scope.

Extend
[`features/check-answers/check-answers.e2e.spec.js`](../features/check-answers/check-answers.e2e.spec.js)
to cover the displayed value and Change link.

## 6. Update downstream persistence when the backend needs the field

The feature binding is always required. The notification mappers are required
only when a backend notification projection has a home for the field.

If it does, update the matching module under
[`services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/index.js)
and extend
[`services/persistence/records/notification-mapper/notification-mapper.test.js`](../services/persistence/records/notification-mapper/notification-mapper.test.js).
Both Mapper A and Mapper B read canonical fulfilment. Mapper B layers its extra
fields over Mapper A, so check both outputs before choosing the edit.

If the backend has no field home, leave the mapper unchanged and add or update
an explicit omission assertion. Do not invent a payload property.

## 7. Register client JavaScript when the field needs it

Prefer server-rendered controls. If the page needs a new client bundle:

1. Put its entry module under the feature, following
   [`features/documents/client/index.js`](../features/documents/client/index.js).
2. Add a named `entry` in the repo-root `webpack.config.js`.
3. Load that entry from the template with `getAssetPath('<entry>.js')`, following
   [`features/documents/template.njk`](../features/documents/template.njk).

Without the webpack entry, the template still renders but the bundle returns a 404. The failure is easy to miss.

## 8. Add or extend unit tests

Extend the feature's `controller.test.js`. Cover:

- GET prefill
- every validation branch
- raw input on a 400 response
- cleaned input on a successful commit
- conditional render, validation and purge when relevant
- the marked recoverable-save failure and the 500 response
- unexpected errors still throwing

Add focused model, gate, mapper and check-answers tests when the field changes
those contracts.

## Playwright feature test

Keep the spec with the feature. Extend its existing `*.e2e.spec.js`. For a
multi-page feature, use `features/<feature>/e2e/<page>.e2e.spec.js` as shown by
[`features/transport/e2e/arrival-transit.e2e.spec.js`](../features/transport/e2e/arrival-transit.e2e.spec.js).
Small single-page features currently keep the spec at the feature root, as
shown by
[`features/origin/origin.e2e.spec.js`](../features/origin/origin.e2e.spec.js).

Keep each test independent. Start a new notification for each test. Do not use
page objects. Use raw Playwright role, label and visible-copy locators. Use
Playwright assertions and locator auto-waiting. Use `expect.poll` for state that
has no locator assertion. Do not add sleeps.

Cover:

- the field's initial render, label, hint and options
- a happy-path save, redirect, reload and persisted value
- each validation rule in its own test
- the raw entered value and the other entered values on error
- the error-summary link moving focus to the field
- conditional show, hide and persisted-value purge when relevant
- the check-answers value and Change link

## Accessibility test

Add an axe test for both page states the field changes:

- initial render
- validation error state, after the inline error and error summary appear

Use `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])` and fail when any
violation has `impact` equal to `serious` or `critical`. Use the initial and
error-state examples in
[`features/origin/origin.e2e.spec.js`](../features/origin/origin.e2e.spec.js).
Filter a known component false positive only when the exemplar does and the
same markup proves it applies.

## 9. Run every check

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:features
npm run lint
```

Green means every command exits with code 0, Vitest reports no failed tests,
Playwright reports no failed specs, and lint reports no errors. Check the page
in both initial and error states before finishing.
