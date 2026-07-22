# The validation seam

Validation lives in two places, each with one job.

- **Page controllers** decide what a well-formed answer looks like when
  a user submits a page. They run Joi field validators from
  `lib/validate/` against the POST payload and return GDS field errors.
- **The domain layer** (`model/domain/index.js`) declares what a legal
  value _is_ for each obligation — enum membership, string length,
  date shape, address rules — as pure, introspectable data.

The obligation model records what is owed; a page decides what a
well-formed answer looks like in its own context. The same value can
validate differently on different pages, so field validity is never
stamped on an obligation. The model stores; the page validates shape;
the domain declares legality.

## Controller-owned field validation, by design

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
    ),
    pattern(
      'internalReferenceNumber',
      /^[a-zA-Z0-9]*$/,
      'Internal reference must only contain letters and numbers'
    )
  )
```

When a membership list comes from a service (`countries`, `ports`, the
address book), the schema is a **function** evaluated per POST —
`validate(fields(), payload)` — never a module-level constant. A frozen
schema would capture the stub list at import time and go stale when
real-mode boot `prime()` replaces the service cache. A page whose
options are a fixed literal list (the import-type filter, the
declaration) can hold its schema as a constant.

Nothing in `lib/validate/` knows about obligations, and no obligation
names a validator. The coupling is loose: a validator is a fact about a
value — a shape or a domain — reusable by any page.

## The library shape

`lib/validate/index.js` is the single import surface. It re-exports the
runner from `run.js` and a flat set of small, named Joi factories from
`validators.js`:

`compose`, `requiredText`, `requiredExactDigits`, `optionalText`,
`maxText`, `pattern`, `postcode`, `vehicleReg`, `ukPhone`, `oneOf`,
`requiredOneOf`, `integerInRange`, `currency` and `dateParts`.

- Each factory returns a single-key schema, built by the internal
  `single(name, rule)` helper as `Joi.object({ [name]: rule }).unknown(true)`.
- `compose(...)` concatenates schemas into one page schema.
- Because every schema is `unknown(true)`, sibling fields and the CSRF
  `crumb` pass through untouched. A page validates only the fields it
  names.

## The mandate split: save-blocking vs completion-required

The journey splits "must not save malformed" from "must be answered to
finish". They live in different places.

### Save-blocking (hard)

`requiredText`, `requiredExactDigits` and `requiredOneOf` are the
save-blocking primitives — they carry no `.allow('')`, so a blank value
fails on submit. They guard the journey's three flow-control points and
the CPH number:

- `importType` on the import-type filter (`features/import-type-filter`).
- `countryOfOrigin` on the origin page (`features/origin`).
- `declaration` on the declaration page (`features/declaration`).
- `countyParishHoldingCph` on the CPH page (`features/cph-number`) —
  `requiredExactDigits` blocks blank, wrong-length and non-digit values,
  checked on the slash-stripped value.

Every other validator is optional: it carries `.allow('')`, so a blank
value saves and only a malformed non-blank value fails. A user can walk
most of the journey saving blanks.

Follow the convention when adding a validator: an optional factory must
allow `''`. Leave that out and the field silently becomes save-blocking.

### Enforced-at-continue (a second hard gate on navigation)

Two obligations must be answered before the journey lets the user move
past them, not just at submit. They are named in `ENFORCED_AT_CONTINUE`
(`flow/obligation-source.js`):

```js
export const ENFORCED_AT_CONTINUE = new Set([
  'countryOfOrigin',
  'commoditySelection'
])
```

`flow/prerequisites.js` turns that set into per-page and per-section
prerequisites: `pagePrerequisites(pageId)` lists the enforced-at-continue
obligations owned by earlier pages. `flow/gates.js` then holds a later
page or section shut until those answers exist:

```js
// flow/gates.js
prerequisitesMet(pagePrerequisites(page.id), scope) &&
  inScopeReachable(collectsOf(page.id), scope)
```

`prerequisitesMet` checks `scope.answered(id)` for every prerequisite. So
a downstream page will not open until the enforced-at-continue answers
upstream are present. `countryOfOrigin` is enforced both ways — a
save-blocking `requiredOneOf` on its own page and a continue gate for
everything after it.

### Completion-required (soft)

Whether an answer is owed to finish lives on the obligation, not in any
Joi schema (`model/obligations/obligations.js`):

- Each obligation carries `status: 'mandatory' | 'optional'`.
- A group carries `requires: { minEntries, errorCode }` for a collection
  floor (`commodityLines` requires `minEntries: 1`) and/or
  `requires: { anyOfIds, errorCode }` for a per-instance "at least one
  of" rule (a `unitRecord` requires at least one identifier obligation).

The engine checks completion in two places:

- **The hub.** `statusOfFromB` (`model/bridge/status.js`), reached
  through `flow/task-rows.js` `rowStatus` and `flow/section-status.js`
  `sectionStatus`, reports a row or section Fulfilled only when every
  in-scope obligation it covers is satisfied.
- **Submit.** The declaration page POST calls `state.submitJourney`
  (`engine/write.js`), which re-checks `scope.readyForCheckYourAnswers`
  server-side:

  ```js
  // engine/write.js
  if (!scope.readyForCheckYourAnswers) return { ok: false, journey, scope }
  ```

  A not-ready submit does not finalise — the controller redirects back
  to Check your answers. The button is a soft gate, not the real check.

So `status: 'mandatory'` never blocks a save, and a Joi rule never
decides completion.

## Normalising validators: persist the clean value

Two validators return a changed value, and the contract matters.

**`currency`** strips `£`, commas and spaces and returns the cleaned
digit string. A controller collecting a currency amount must persist the
value the validator returns, not the raw payload:

```js
const { value: clean, errors } = validate(fields(), payload)
if (errors) return render(h, value, errors) // raw value echoed back
state.commit(request, h, { amount: clean.amount ?? '' })
```

- **Success path: commit the cleaned string.** A stored `'£9,000'` would
  reach downstream arithmetic as `Number('£9,000')` — `NaN`. No
  live-animals page collects a currency amount today, so the contract is
  pinned against a synthetic currency controller — see
  [limits.md](limits.md).
- **Error path: echo the raw input.** A malformed amount re-renders the
  user's own text (`'£9,00x'`, not a half-cleaned version) and commits
  nothing.

**`integerInRange`** checks that the value is a whole number in range but
returns the trimmed _string_, not a number. Stored answers are strings
throughout; a validator never changes a stored type.

## Dates

Dates are stored as a `{ day, month, year }` object — never a `Date`,
never a formatted string.

- The govuk date input posts three fields: `<name>-day`, `<name>-month`,
  `<name>-year`.
- `dateParts(name)` (`lib/validate/validators.js`) validates the triple.
  All three blank passes — dates are optional. A partial or unreal date
  fails; real-date checking is `isRealDate` in `lib/validate/calendar.js`.
- The rule is anchored on the day part, so the error lands under the
  `<name>-day` key and the error-summary link focuses the first box of
  the date input.
- `kit.readDate(payload, name)` assembles the stored object from the
  three payload parts; `kit.dateField` builds the `govukDateInput`
  view-model, taking the inline error from the day key (see
  `features/transport/port-of-entry.controller.js`).

## The Joi → GDS wiring

`validate(schema, payload)` (`lib/validate/run.js`) returns
`{ value, errors }`:

- `errors` is `null` when the payload is clean.
- Otherwise it is a flat `{ fieldId: message }` map. Validation runs with
  `abortEarly: false`, then the first message wins per field — one inline
  error per input (`toFieldErrors`).

That map is the whole seam. Two consumers turn it into GDS output:

- `kit.errorSummary(errors)` (`shared/kit.js`) builds the error-summary
  view-model: `{ titleText, errorList: [{ text, href: '#fieldId' }] }`,
  rendered by `shared/error-summary.njk`. Each link targets the input by
  id.
- Each govuk macro, given `errorMessage` and a matching `id`, emits the
  inline `#fieldId-error` message and wires `aria-describedby` itself.

Field name, input id and error key are the same string, so the summary
link, the inline message and the input all line up without any mapping
table.

## Value legality in the domain layer

`model/domain/index.js` is the model's declaration of what a legal value
is. `domain` is a `Map` keyed by obligation id; each entry is a pure
function of state, the same idiom as an obligation's `applyTo`. Entry
shapes:

- `enum` — `options(fulfilments, ids, ctx) → string[]`.
- `integer` / `string` / `date` — `predicate(value, ctx) → error[]`
  (empty on pass) plus a `reasons` list of the failure codes it can emit.
- `address` — a composite: `subFields`, `required`, `subFieldRules`,
  `isComplete(value)` and a `predicate` that checks per-sub-field
  max-length, email format and MDM country membership.

Factories `staticEnum`, `computedEnum`, `predicate` and `addressBlock`
build the entries, each hanging a `.metadata` sidecar so the data
dictionary and reachability tooling can read the rule without running the
closure. The `reasons` const map at the top of the file names every
failure code (`domain.enum.notInOptions`, `domain.string.maxLength`, and
so on).

Enum options are delegated to the MDM services — `countries`, `ports`,
`commodities`, `document-types`, `certification-purposes`,
`import-reason-purpose`, `transport-reference` — through the same
accessors the controllers call, returning codes and values only. So a
`computedEnum` for `countryOfOrigin` reads
`countries.originCountries()`, exactly what `features/origin` renders and
validates against.

The domain layer holds no identity, cardinality or scope — those live in
the obligations manifest — and no display copy. That last rule is
enforced at boot: `obligation-purity.js` walks both the obligations
manifest and the domain map through `assertNoDisplayKeys`
(`model/no-display-keys.js`), so a `label`, `title`, `hint`, `legend` or
`widget` on any entry fails the boot, not just a test.

The domain layer is the single source of truth for value legality that
tooling reads. The per-page Joi validators are the runtime enforcement a
user meets on POST. Keep the two in step: when a domain rule changes
(a max-length, an option source), update the page validator that
enforces it.

## Related

- [persistence.md](persistence.md) — what happens to a committed value.
- [scope-and-wipe.md](scope-and-wipe.md) — how `status` and scope drive
  section status.
- [limits.md](limits.md) — the currency-persist contract test.
