# The validation seam

Validation lives in the controllers, on purpose. The obligation model
records what is owed; a page decides what a well-formed answer looks
like in its own context. The same value could validate differently on
different pages, so validity is never a fact stamped on an obligation —
the model is ignorant of validators, and the engine only stores.

## Controller-owned, by design

Each collecting controller composes its own field → validator map from
the shared library and runs it against its own payload:

```js
// features/origin/controller.js
const fields = () =>
  compose(
    requiredOneOf(
      'countryOfOrigin',
      countries.originCountries().map(({ value }) => value),
      'Select the country where the animal originates from'
    ),
    oneOf('regionOfOriginCodeRequirement', ['yes', 'no']),
    maxText(
      'regionOfOriginCode',
      5,
      'Region of origin code must be 5 characters or less'
    ),
    maxText(
      'internalReferenceNumber',
      58,
      'Internal reference must be 58 characters or less'
    )
  )
```

When a membership list comes from a service (`countries`, `ports`, the
address book), the schema is a **function** evaluated per POST —
`validate(fields(), payload)` — never a module-level constant. A frozen
schema would capture the stub list at import time and go stale when
real-mode boot `prime()` replaces the service cache (the party-select
spokes set the precedent; origin, port-of-entry and the create-address
country field follow it).

Nothing in `lib/validate/` knows about obligations, and nothing in an
`obligations.js` names a validator. The coupling is loose: a validator
is a fact about a value (a shape or a domain), reusable by any page.

## The library shape

`lib/validate/` exports one runner and a flat set of small, named Joi
factories (`lib/validate/index.js` is the single import surface):

- Each factory returns a single-key schema:
  `Joi.object({ [name]: rule }).unknown(true)`.
- `compose(...)` concatenates them into one page schema.
- Because every schema is `unknown(true)`, sibling fields and the CSRF
  `crumb` pass through untouched. A page validates only the fields it
  names.

The factories are: `requiredText`, `optionalText`, `maxText`,
`pattern`, `postcode`, `vehicleReg`, `ukPhone`, `oneOf`,
`integerInRange`, `currency` and `dateParts`
(`lib/validate/validators.js`).

## The mandate split: save-blocking vs completion-required

The journey splits "must not save malformed" from "must be answered to
finish". They live in different places.

**Save-blocking (hard).** `requiredText` and `requiredOneOf` are the
save-blocking primitives. Exactly one field uses one: `countryOfOrigin`
on the origin page (spec ruling c-023: `enforcedAt=continue`) is a
`requiredOneOf` over the countries service list — blank and
out-of-list values both block the save. Every other validator is
optional: it carries `.allow('')`, so a blank value saves, and only
a malformed non-blank value fails. A user can walk the whole journey
saving blanks, apart from the country of origin.

Follow the convention when adding a validator: an optional factory must
allow `''`. Leave that out and the field silently becomes
save-blocking.

**Completion-required (soft).** Whether an answer is owed lives on the
obligation def (`required: true`, or `requiredAtLeastOne` on a
collection), not in any schema. The engine checks it in two places:

- The hub: `statusOf` (`engine/status.js`) reports a section Fulfilled
  only when every in-scope required obligation is satisfied.
- Check your answers: the POST calls `state.submitJourney`, which
  re-checks readiness server-side (`engine/write.js`). A not-ready
  submit does not finalise — it re-renders the page. The button is a
  soft gate, not the real check.

So `required: true` never blocks a save, and a Joi rule never decides
completion. See `features/origin/obligations.js` for the def-side
note.

## Normalising validators: persist the clean value

Two validators return a changed value, and the contract matters.

**`currency`** strips `£`, commas and spaces and returns the cleaned
digit string. A controller collecting a currency amount must persist
that cleaned value, not the raw payload:

```js
// the idiom every currency page follows
const { value: clean, errors } = validate(fields, payload)
if (errors) return render(h, value, errors) // raw value echoed back

state.commit(request, h, { amount: clean.amount ?? '' })
```

The two halves of the contract:

- **Success path: commit the cleaned string.** This was a real
  regression. Handlers once discarded the cleaned value and persisted
  the raw payload, so a stored `'£9,000'` reached downstream arithmetic
  as `Number('£9,000')` — `NaN`. No live-animals page collects a
  currency amount today (the car modifications value field was the last,
  removed inc-026), so `t1-currency-persist.test.js` pins the stored
  value against a synthetic currency controller — see
  [limits.md](limits.md).
- **Error path: echo the raw input.** A malformed amount re-renders the
  user's own text (`'£9,00x'`, not a half-cleaned version) and commits
  nothing. The same test file pins this too.

**`integerInRange`** validates that the value is a whole number in
range, but returns the trimmed _string_, not a number. Stored answers
are strings throughout; a validator never changes a stored type.

## Dates

Dates are stored as a `{ day, month, year }` object — never a `Date`,
never a formatted string.

- The govuk date input posts three fields: `<name>-day`,
  `<name>-month`, `<name>-year`.
- `dateParts(name)` (`lib/validate/validators.js`) validates the
  triple. All three blank passes (dates are optional). A partial or
  unreal date fails — real-date checking is `isRealDate` in
  `lib/validate/calendar.js`.
- The rule is anchored on the day part, so the error lands under the
  `<name>-day` key and the error summary link focuses the first box of
  the date input.
- `kit.readDate(payload, name)` assembles the stored object from the
  three payload parts; `kit.dateField` builds the `govukDateInput`
  view-model, taking the inline error from the day key
  (see `features/transport/port-of-entry.controller.js`).

## The Joi → GDS wiring

`validate(schema, payload)` (`lib/validate/run.js`) returns
`{ value, errors }`:

- `errors` is `null` when the payload is clean.
- Otherwise it is a flat `{ fieldId: message }` map. Validation runs
  with `abortEarly: false`, then the first message wins per field — one
  inline error per input.

That map is the whole seam. Two consumers turn it into GDS output:

- `kit.errorSummary(errors)` (`shared/kit.js`) builds the error summary
  view-model: `{ titleText, errorList: [{ text, href: '#fieldId' }] }`,
  rendered by `shared/error-summary.njk`. Each link targets the input
  by id.
- Each govuk macro, given `errorMessage` (via `kit.fieldError` or an
  inline `errors.field and { text: errors.field }`) and a matching
  `id`, emits the inline `#fieldId-error` message and wires
  `aria-describedby` itself.

Field name, input id and error key are the same string, so the summary
link, the inline message and the input all line up without any mapping
table.

## Related

- [persistence.md](persistence.md) — what happens to a committed value.
- [scope-and-wipe.md](scope-and-wipe.md) — how `required` and scope
  drive section status.
