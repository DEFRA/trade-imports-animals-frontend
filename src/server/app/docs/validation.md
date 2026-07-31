# Validation

Controllers own field validation. Obligations decide whether data is owed; they do
not define form schemas or messages.

## Library surface

[`src/server/app/lib/validate/index.js`](../lib/validate/index.js) exports the runner
and named Joi schema factories. Each field factory accepts unknown sibling keys so
a controller can compose only the rules it owns.

`validate(schema, payload)` returns `{ value, errors }`. `errors` is `null` on
success or a flat `{ fieldId: message }` map. Validation runs with
`abortEarly: false`, while only the first message for each field is exposed.

## Controller contract

A collecting controller:

1. reads raw payload values
2. builds any service-backed schema at POST time
3. validates the payload
4. renders raw values with status 400 on error
5. commits the cleaned values on success

Build service-backed membership rules inside POST so they use reference data primed
at boot. A module-level schema can freeze an outdated service list.

Normalising validators return cleaned values. Persist `value` from the validation
result, not the raw payload. The guarantee is pinned by
[`src/server/app/lib/validate/persists-cleaned-value.test.js`](../lib/validate/persists-cleaned-value.test.js).

## GDS error wiring

Keep the field name, input id and error-map key identical.
[`kit.errorSummary()`](../shared/kit.js) turns the map into links to `#fieldId`, and
the GOV.UK or MoJ macro renders the matching inline error.

## Save rules and completion rules

A required Joi rule can block a malformed or blank page save. Obligation `status`,
scope and `requires` rules decide whether the journey is complete. These are
separate checks: saving an optional blank is allowed, while submit readiness still
reflects every in-scope mandatory obligation and group invariant.

[`src/server/app/flow/prerequisites.js`](../flow/prerequisites.js) adds the separate
continue-time gate for configured fields that must be answered before later pages
open.

## Dates and structured values

The date helpers validate a `dd/mm/yyyy` text value, then
[`kit.readDate()`](../shared/kit.js) stores `{ day, month, year }`.
`kit.dateField()` creates the MoJ date-picker view model.

Structured values such as addresses are opaque to model completeness: a non-blank
object is filled. The collecting controller must validate required subfields before
it commits the object.
