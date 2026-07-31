# How to add a field

Use this guide for a scalar field on an existing page. For a field inside a
repeatable group, also follow [add-a-collection.md](add-a-collection.md).

Paths are relative to `src/server/obligation-based-app/obligation-sets/live-animals/`.

## 1. Declare the obligation

Add the field to the right file under `model/obligations/sections/`. Give it:

- a new UUID `id`
- a path-safe `name`
- `status: 'mandatory'` or `status: 'optional'`

The `name` is also the form field name and the key in request-local answers.
Do not put labels, hints or other display copy in the model.

Add `within` when the field belongs to a group. Add an `applyTo` helper when
scope or mandate depends on another answer. The helper metadata must name its
dependency. See [obligation-model.md](obligation-model.md) for the supported
shapes.

Export the obligation from `model/obligations/obligations.js` and add it to
the `obligations` array. The model tests check unique IDs and names, valid
`within` chains and gate dependencies.

## 2. Bind the stored value

Add the field to the owning feature's `evaluation.js`.

Use `scalar({ field, obligation })` for a top-level field. Use `grouped()` with
the full group path for a collection field. Add `convert` only when the stored
value must differ from the cleaned form value.

If this is the feature's first binding file, register it in
`features/evaluation.js`. The fulfilment registry fails at boot if a leaf has
no owner, has two owners or has a group path that differs from the manifest.

## 3. Collect and validate the value

Add the obligation name to the controller's `meta.collects`. A collection page
still names only its root group.

Keep the standard controller shape:

1. GET calls `state.get()` and prefills from `answers`.
2. POST builds raw `values` from `request.payload`.
3. The controller validates with `lib/validate/`.
4. A validation error renders the raw values and returns 400.
5. A valid POST commits cleaned values with `state.commit()`.
6. The redirect uses `await kit.nextTarget(request, page, committed.scope)`.

If the field is conditional, use `scope.has(fieldName)` to decide whether to
render and validate it. Do not commit a hidden field. The evaluator removes a
stored value when its obligation leaves scope.

Wrap the write in `kit.recoverableSave()`. On a marked backend failure, render
the same values with `recoverableError: true` and return 500. Let programming
errors and unmarked errors throw.

## 4. Add copy and markup

Put English and Welsh copy in the feature's `copy/copy.en.js` and
`copy/copy.cy.js`. Keep the same leaf paths and value kinds in both files.
Resolve them with `copyFor({ en, cy })` in the controller.

Pass field options, errors and copy to the template. Use the GOV.UK component
macros. Keep the error target ID the same as the field name so the summary link
can move focus to the field.

Update the feature's `copy/copy.test.js`. The root `copy-parity.test.js` also
checks that both locale bundles have the same shape.

## 5. Add the check-answers row

Add the row to the right card under
`features/check-answers/view-model/cards/`. Put its label and any displayed
value labels in the check-answers copy bundles.

Use `row()` for an editable scalar. Pass the obligation name so
`changeAction()` can resolve the owning page from the dispatch index. Use a
service label accessor when the stored value is a code.

Show a conditional row only when the same condition as the field applies.
Prefer the supplied `scope` when it has the path. Some per-commodity rows use
manifest-backed applicability helpers because they build rows before a record
exists.

## 6. Check status and navigation

The field's model status feeds task and section status. The page's `collects`
feeds dispatch, page gates and the default task-row parts.

If the page is already in a task row, its new collected field joins that row
without another list. If it needs a separate row or a collection facet, update
`flow/task-rows.js`. A new page also needs the registration steps in
[add-a-page.md](add-a-page.md).

Check these states:

- out of scope gives `not-applicable`
- untouched optional work gives `optional`
- missing mandatory work gives `not-started` or `in-progress`
- a complete value gives `fulfilled`

## 7. Add tests

Update `contract.test.js` so the page's valid POST commits exactly its
`collects`. Add or extend the colocated `controller.test.js` for validation,
scope, cleaned values and recoverable saves.

Add browser coverage beside the feature as `*.e2e.spec.js`. Put it in a nested
`e2e/` folder when the feature already has several pages or specs. Cover the
copy, validation, save and reload, check-answers row, change link and any scope
change.

Run the checks in [testing.md](testing.md).
