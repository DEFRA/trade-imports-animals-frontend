# L1 — Validation and error-message derivation — SIDE A (live-animals)

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

## Headline

**Validation on side A is 100% IMPERATIVE and deliberately so.** It is a
small, well-tested Joi helper library (`lib/validate/`, 3 source files,
~250 LOC) invoked by hand from 15 of 22 controllers, with every error
message hand-authored as an English string literal at the call site. The
obligation model — the thing the whole architecture is built around —
**contains zero validation information**: no `type`, no `maxLength`, no
`pattern`, no message, no widget. Not "not built yet": explicitly ruled
out.

> `docs/obligation-model.md:37-41` — "…there is no type, no copy, no
> widget, no validation on an obligation. The v1 model carried all of
> those… pages own their own presentation, controllers own validation,
> and the model keeps only [what the engine needs]"

The engine does own **one** validation-adjacent concept — *completeness*
(`required`, `requiredAtLeastOne`, `requiredOneOf`, `maxEntriesFrom`) —
and that IS declarative. But completeness and validity are **two
separate mechanisms that never meet**: an obligation's `required: true`
produces no error message, blocks no save, and is invisible to Joi;
conversely a Joi rule has no idea an obligation exists. Side A calls this
"the mandate split" (`docs/validation.md:66-97`) and treats it as a
feature.

There is no i18n layer, no locale file, no message catalogue, no
field-widget derivation. Confirmed by grep: nothing under the root
imports an i18n module; copy is inline English in `.njk` and in
controller string literals.

---

## 1. MECHANISMS

### 1.1 `lib/validate/` — a flat Joi factory library (IMPERATIVE, code)

`lib/validate/index.js` (16 LOC) is the single import surface, exporting
one runner + 12 factories from `validators.js` (157 LOC) and
`calendar.js` (12 LOC).

Every factory returns a **single-key** Joi object with `.unknown(true)`:

```js
// lib/validate/validators.js:9
const single = (name, rule) => Joi.object({ [name]: rule }).unknown(true)
```

`compose(...)` concats them (`validators.js:11-15`). Because everything is
`unknown(true)`, a page validates only the keys it names and the CSRF
`crumb` passes through untouched.

The 12 factories: `requiredText`, `optionalText`, `maxText`, `pattern`,
`postcode`, `vehicleReg`, `ukPhone`, `oneOf`, `requiredOneOf`,
`integerInRange`, `currency`, `dateParts`.

**Actual usage in the running journey — 53 factory call sites across 15
controllers:**

| factory | call sites |
|---|---|
| `maxText` | 31 |
| `oneOf` | 14 |
| `requiredOneOf` | 3 |
| `integerInRange` | 2 |
| `dateParts` | 2 |
| `pattern` | 1 |
| `requiredText`, `optionalText`, `postcode`, `vehicleReg`, `ukPhone`, `currency` | **0** |

Six of the twelve factories are dead in the live-animals journey.
`currency` is honestly flagged as dormant in `docs/limits.md:35-37` (the
last live currency field went with the car spike; the persist contract is
pinned against a *synthetic* controller in `t1-currency-persist.test.js`).
So the real validation vocabulary actually exercised is: **length cap,
membership-in-a-list, whole-number-in-range, real-date, one regex.**

### 1.2 The runner — Joi → flat `{field: message}` map (`lib/validate/run.js`, 16 LOC)

```js
// lib/validate/run.js:10-16
export function validate(schema, payload) {
  const { value, error } = schema.validate(payload ?? {}, {
    abortEarly: false,
    convert: true
  })
  return { value, errors: error ? toFieldErrors(error.details) : null }
}
```

`toFieldErrors` (`run.js:1-8`) keeps the **first** message per field
(`if (field != null && errors[field] === undefined)`). One inline error
per input, `abortEarly: false` so all fields report at once. 17 `validate(...)`
call sites.

### 1.3 The Joi → GDS seam (`shared/kit.js`, 2 functions, 11 LOC)

```js
// shared/kit.js:32-39
export const errorSummary = (fieldErrors) => {
  const entries = Object.entries(fieldErrors ?? {})
  if (entries.length === 0) return null
  return {
    titleText: 'There is a problem',
    errorList: entries.map(([field, text]) => ({ text, href: `#${field}` }))
  }
}
export const fieldError = (fieldErrors, field) =>
  fieldErrors?.[field] ? { text: fieldErrors[field] } : undefined
```

`shared/error-summary.njk` (5 LOC) is a pass-through to `govukErrorSummary`.

The convention that makes this work with no mapping table: **field name ===
input id === error key === summary anchor**. Nothing enforces it — it is a
naming discipline, not a mechanism.

**Inline errors are hand-wired per input in the template**, e.g.
`features/origin/template.njk:20` —
`errorMessage: errors.countryOfOrigin and { text: errors.countryOfOrigin }`.
**18 `.njk` templates** do this by hand, once per input.

### 1.4 Completeness — the ONE declarative half (engine, data)

Separately from Joi, four **model** keys are engine-interpreted:

- `required: true` — 32 obligations
- `requiredAtLeastOne` — on `commodityLines` and `animalIdentifiers`
- `requiredOneOf: [ids…]` — 1 carrier (`animalIdentifiers`, a 6-member group)
- `maxEntriesFrom` — 1 carrier (`animalIdentifiers` → `numberOfAnimalsQuantity`)

Evaluated in `engine/evaluate/complete.js` (93 LOC):

```js
// engine/evaluate/complete.js:19-22
const groupSatisfied =
  !obligation.requiredOneOf ||
  !groupOwned ||
  obligation.requiredOneOf.some((id) => isAnswered(entry?.[id]))
```

This is real, declarative, scope-aware (an out-of-scope required
obligation is not owed) and drives hub tags + the submit gate. **It emits
no messages and blocks no save.** `engine/write.js:89-95` — `submitJourney`
returns `{ ok: false }` when `!scope.readyForCheckYourAnswers`, and the
declaration controller's response to that is
`if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))`
(`features/declaration/controller.js:66`) — **a silent redirect with no
error message at all.** The engine knows exactly which obligations are
unsatisfied; nothing turns that into user-facing copy.

`maxEntriesFrom` is the one place a *model* fact does block a write:
`engine/write.js:23-24` — `appendEntryAt` returns `null` at the cap. But
even there the **message** is hand-written in the controller
(`animal-identification.controller.js:526`).

### 1.5 Cross-field / cross-collection validation — hand-rolled per case

Three genuinely non-trivial rules exist, all imperative:

1. **The count-drop block** (`consignment-details.controller.js:126-145`).
   Lowering a species' animal count below its existing identifier-record
   count is rejected, with a message that names the species and an anchor
   that deep-links to the other page's card:
   ```js
   text: `You have ${plural(records, 'identifier record')} for ${species} but entered ${plural(entered, 'animal')}. Remove identifier records or keep the higher count.`,
   href: `${kit.withChangeContext(request, pagePath(animalIdentificationPage.slug))}#identification-card-${index}`
   ```
   This is a **cross-collection, cross-page** rule (parent field vs child
   collection length). It cannot be expressed anywhere in the obligation
   vocabulary, and side A does not pretend otherwise.

2. **"At least one identifier"** (`animal-identification.controller.js:481-486`).
   The rule is *already in the model* as
   `requiredOneOf: ANIMAL_IDENTIFIER_GROUP` (`features/commodities/obligations.js:109`),
   but the save-blocking check and its message are re-written by hand:
   ```js
   errors[fieldName(first.id, addIndex)] = 'Enter at least one identifier for this animal'
   ```
   **The same rule is expressed twice, in two mechanisms, with no link
   between them.** This is the single sharpest illustration of the
   validation/mandate split's cost.

3. **All-or-nothing address block** (`animal-identification.controller.js:218-225`)
   — if any address field is filled, 7 named fields become mandatory, via
   a hand-written `ADDRESS_MANDATORY_MESSAGES` constant map.

### 1.6 Error-summary ordering — insertion order, unpinned

`kit.errorSummary` iterates `Object.entries(errors)`. That order is Joi's
`error.details` order, i.e. the order keys were `compose`d in the
controller. It happens to match DOM order because authors compose in
template order. **Nothing asserts it.** Four controllers bypass
`kit.errorSummary` entirely and hand-build the summary list to control
ordering:

- `documents/controller.js:186-202` — virus-scan rejections first, then
  page errors, then field errors.
- `animal-identification.controller.js:363-377` (`summaryOf`) — field
  errors then card-level errors.
- `consignment-details.controller.js:170-173` — count-drop issues only.
- `party-picker.controller.js:76-82` — one error, anchor switches between
  `#party` and `#q` depending on whether results are rendered.

Five separate literal `titleText: 'There is a problem'` constructions
exist in the codebase (`kit.js:36` plus those four).

### 1.7 Two controllers skip `lib/validate` entirely

- `transit-countries.controller.js:28-38` — membership + max-12 rule
  hand-coded against the countries service.
- `search.controller.js:127` — `errors: { search: 'Select a commodity' }`.

### 1.8 The spec DOES carry declarative validation metadata — and it is never loaded

`spec/journey-spec.json` (2,014 LOC) carries, per obligation, an `input`
block with `widget`, `maxLength`, `pattern`, `hint`, `example`, plus a
structured `mandate: { required, enforcedAt }` and a `label`. **39
`widget` entries, 13 `maxLength` entries.** E.g.
`spec/journey-spec.json:626-632`:

```json
"input": { "widget": "input", "maxLength": 58, "pattern": "^[a-zA-Z0-9]*$", … }
```

…and the running code re-types those same two constraints by hand in
`features/origin/controller.js:34-48` (`maxText(…, 58, …)` +
`pattern(…, /^[a-zA-Z0-9]*$/, …)`).

**Grep confirms no `.js` file under the root imports `journey-spec.json`.**
The spec is an upstream design artefact for humans and the build loop; it
is not a runtime schema. So side A *has* the data to derive validation
declaratively and *chose not to*. That matters enormously for the retrofit
question (see §4).

---

## 2. DOC vs CODE DISAGREEMENT (a finding in its own right)

`docs/validation.md:73-78` states:

> "`requiredText` and `requiredOneOf` are the save-blocking primitives.
> **Exactly one field uses one:** `countryOfOrigin` on the origin page…"

and `docs/obligation-model.md:49` repeats "the journey's only hard mandate
is `countryOfOrigin`".

**The code has three save-blocking `requiredOneOf` fields:**
- `features/origin/controller.js:28` — `countryOfOrigin`
- `features/import-type-filter/controller.js:26` — `importType`
- `features/declaration/controller.js:17` — `declaration`

Both docs are stale. The claim "a user can walk the whole journey saving
blanks apart from country of origin" is false: they cannot get past the
import-type filter or the declaration either.

---

## 3. CAPABILITY LEDGER

| capability | verdict |
|---|---|
| Field-level format validation | **HANDLED IMPERATIVELY** — Joi factories, hand-composed per page |
| Error messages | **IMPERATIVE** — ~54 hand-authored English literals in controllers; 2 constant maps |
| Message derivation from obligation/field metadata | **ABSENT** |
| Completeness / mandate ("is it owed") | **MODELLED DECLARATIVELY** — `required`, `requiredAtLeastOne`, `requiredOneOf`, scope-aware |
| Completeness → error message | **ABSENT** — silent redirect on a not-ready submit |
| Cardinality cap enforcement | **PARTIAL** — cap declared (`maxEntriesFrom`), enforced by the engine, message hand-written |
| Cross-field, same page | **IMPERATIVE** |
| Cross-collection / cross-page | **IMPERATIVE** (count-drop) — not expressible in the model at all |
| Conditional validation (validate only if in scope) | **PARTIAL** — the *schema* is built from the obligation's `activatedBy` in one controller (`animal-identification.controller.js:42-43,67-68,131-132`, reading `obligation.activatedBy.includes` / `notInUnionOf` directly). Everywhere else the schema is unconditional and blank-tolerant. |
| Error-summary ordering | **IMPERATIVE / accidental** — insertion order, unpinned; 4 controllers hand-build to override |
| i18n / locales | **ABSENT** |
| Widget derivation from field type | **ABSENT** at runtime (present in the spec JSON, never loaded) |
| Add a validation rule without touching code | **NO** — always a code edit |

**Add a field** touches 5 places (`docs/add-a-field.md:16`); the validation
share of that is 2 of the 5 — the controller schema (`add-a-field.md:57-62`)
and the template's `errorMessage` line (`add-a-field.md:96`).

**Test coverage:** `lib/validate/validate.test.js` — 26 `it()` cases,
covering all 12 factories including the 6 unused ones. The library itself
is well tested; what is untested is the *derivation*, because there is none.

---

## 4. LIMITATIONS

| limitation | structural? |
|---|---|
| No message can be derived from the model — an obligation carries no label, type or message, so nothing can generate "Enter a passport number" from `animalIdentifierPassport`. | **NO** (false). The 11-key vocabulary is a *choice*, and `spec/journey-spec.json` already holds `label`, `widget`, `maxLength`, `pattern` for 39 fields. Adding a `label`/`input` key to the runtime obligation and a derivation step is additive — the purity guard (`obligation-purity.js`) forbids *imports*, not *keys*. Cost: it breaks the stated design axiom (`docs/obligation-model.md:37-41`), and every one of the ~54 bespoke messages would have to be reconciled against a generated default. |
| Completeness failures produce no user-facing message anywhere. | **NO** (false). `engine/evaluate/complete.js` already computes satisfaction per obligation per instance; a "what's missing" list is a ~30-LOC function away. It was simply never built, because the hub tags + the derived gate were considered sufficient UX. |
| Validation and mandate are two unlinked mechanisms; `requiredOneOf` exists in both the model and (hand-copied) the controller. | **YES, structurally** — as long as the model refuses to carry messages, the save-blocking half must live in code. Unifying them requires either (a) messages in the model or (b) an engine that can emit typed failure objects a controller maps to copy. Either is a model change, not a build-loop task. |
| Cross-collection rules (count-drop) cannot be expressed declaratively. | **YES** — the vocabulary has 4 activation operators over scalar references (`engine/evaluate/predicate.js`, 69 LOC); there is no arithmetic, no comparison, no `length-of`. The docs concede the pressure valve explicitly: *"anything that needs real branching belongs in a page controller"* (`docs/obligation-model.md:139-143`). |
| Error-summary order is not guaranteed to match DOM order. | **NO** (false) — a `fieldOrder` argument to `kit.errorSummary` closes it. |
| No i18n / no locale extraction — every message is an inline English literal in a `.js` or `.njk`. | **NO** (false) but **expensive**: ~54 message literals + 18 templates' worth of inline copy would need extracting. Nothing in the architecture resists it; nothing in the architecture helps either. |
| 6 of 12 validator factories are dead code in this journey. | NO — cosmetic. |

---

## 5. WHAT SIDE A HAS THAT IS WORTH STEALING (and its cost)

1. **The mandate split itself** (`docs/validation.md:66-97`). Separating
   "must not save malformed" (Joi, per page, per context) from "must be
   answered to finish" (obligation, scope-aware, engine-evaluated) is a
   genuinely good idea and lets a user save blanks and come back. The cost
   is that you now maintain two mechanisms and can — as `requiredOneOf`
   proves — express the same rule twice with no consistency check.

2. **The scope-aware completeness engine** (`complete.js`). "Required, but
   only when in scope, at depth 2, per collection instance" is real and
   proven. Any third option needs this whatever it does about messages.

3. **The convention** field-name = input-id = error-key = summary-anchor.
   Trivially cheap, removes an entire class of mapping table.

4. **Normalising validators with a persist contract** (`currency` →
   commit the cleaned value, echo the raw on error; `docs/validation.md:99-132`
   + `t1-currency-persist.test.js`). Small, but a real regression was caught
   by pinning it.

5. **Schema-as-a-function when the domain comes from a service**
   (`origin/controller.js:26`, `port-of-entry.controller.js:44`) — a
   module-level constant schema captures the stub list at import time and
   goes stale after real-mode `prime()`. That is a bug any config-driven
   model with a service-backed `oneOf` will hit too.

## 6. WHAT SIDE A CANNOT DO (state plainly)

- Derive a single error message from data. Not one.
- Tell the user *what* is missing when a submit is refused.
- Express any rule involving arithmetic, comparison or collection length
  declaratively.
- Change a max-length, a regex or a message without a code edit, a test run
  and a deploy.
