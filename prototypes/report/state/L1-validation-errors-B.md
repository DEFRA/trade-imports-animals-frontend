# L1 — Validation and error-message derivation — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(All paths below are relative to that root unless stated.)

There is **no `docs/validation.md` on Side B** — the validation story is documented inside
`obligations.md` §Layer 1.25 (:793-1010) and §Flow (:1552, :1745, :1950-1970). The code is the
authority and I read all of it.

---

## 1. The shape of it — FOUR separate mechanisms, deliberately not one

Side B does not have "a validator". It has four distinct gates, each owned by a different layer,
each firing at a different moment. This separation is the dimension's headline finding — it is
cleaner than a single Joi-style schema, and it is also why the required-message story is split in
two places.

| # | Mechanism | Owned by | Declared as | Fires | Blocks? |
|---|---|---|---|---|---|
| 1 | **Scope** (`applyTo`) | Obligations (L1) | JS closure + `.metadata` | evaluator, every request | field/page vanishes; nothing to validate |
| 2 | **Completion-mandate** (`obligation.status`) | Obligations (L1) | data (`'mandatory'`/`'optional'`) | task-list status, CYA prompts | never blocks a POST |
| 3 | **Proceed-mandate** (`mandatoryToProceed` + `errors.required`) | **Flow (L2)** | data on the `presents` entry | page POST | 400, flow-authored message |
| 4 | **Value legality** (domain `predicate` / enum `options`) | Domain (L1.25) | JS closure (+ one data rule-table) | page POST, after #3 | 400, code-derived message |
| 5 | **Group invariant** (`requires.anyOf`) | Obligations (L1) | data (array + `errorCode`) | CYA + container status **only** | never blocks anything |

Mechanism 2 and 3 are explicitly two different things, and the code says so:

> `flow/flow.js:17-21` — "`mandatoryToProceed` (default false) is the *submit-mandate* … Distinct
> from the obligation's `status` field, which is the *completion-mandate* (does the journey need
> this to reach F?)."

**Mandate and validation are therefore NOT the same mechanism on Side B — they are three
mechanisms (2, 3, 4) and they interlock.** The interlock is real, not accidental:
`contract.js:315-322` `isSufficientForProceed()` short-circuits the proceed-gate when the
obligation is *effectively optional in the current state*:

```js
function isSufficientForProceed(obligation, path, value, state) {
  if (effectiveStatus(obligation, path, state) === 'optional') return true
  const entry = domain.get(obligation.id)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}
```

That single line is what lets one static flow declaration carry `mandatoryToProceed: true` on
`regionCode` and on the three accompanying-document fields, and have the gate *silently
disappear* when the obligation's `branchedGate` puts it on the optional branch. The flow author
writes "this is required to proceed"; the obligations layer decides whether it is currently a
mandate at all. **This is genuinely elegant and is the single best idea in this dimension on
either side.** It is also lightly built: 13 `mandatoryToProceed: true` sites in `flow/flow.js`.

---

## 2. Where validators live — CODE, with exactly one data-shaped exception

**Verdict: (b) HANDLED IMPERATIVELY, with one island of (a) MODELLED DECLARATIVELY.**

Every value rule is a JS closure in `domain/index.js` (1,194 LOC, 40 entries). The manifest at
`domain/index.js:1150-1194` is a `Map` from obligation id → entry. Entry census:

| Shape | Count | Introspectable? | Evidence |
|---|---|---|---|
| `staticEnum` | 12 | yes — `.metadata.options` | `domain/index.js:134-142` |
| `computedEnum` | 2 | partly — `.metadata.readsFrom` names siblings, options need execution | `:148-157` |
| `predicate` | 16 | only the **failure codes** (`.metadata.reasons`), never the rule | `:163-167` |
| `addressBlock` | 9 | **yes — `.metadata.subFieldRules` is the rule itself** | `:197-281` |
| hand-built enum+predicate | 1 (`transitedCountries`) | `.metadata.max = 12` | `:1080-1106` |
| **Total** | **40** | | |

### 2a. The one place validation IS data

`addressBlock` is the exception that proves the rule. Its per-sub-field rules are a **data table**
interpreted by a single generic predicate:

```js
const ADDRESS_SUB_FIELD_RULES = {
  name: { type: 'string', maxLength: 255 },
  ...
  postcode: { type: 'string', maxLength: 12 },
  country: { type: 'enum', options: COUNTRY_OPTIONS, labels: COUNTRY_LABELS },
  telephone: { type: 'telephone', maxLength: 20 },
  email: { type: 'email', maxLength: 254 }
}
```
(`domain/index.js:861-871`; interpreted by the shared predicate at `:217-268`.)

That table drives **three** things off one declaration: validation (`:230-265`), widget choice +
autocomplete/inputmode (`lib/field-widgets.js:23-54, :236-264`), and error anchoring
(`lib/format-domain-errors.js:120-131`). Nine address obligations × ~9 sub-fields = **~82 of the
~113 rendered inputs on Side B are validated from a data table, not from hand-written code.**
Adding `maxLength: 40` to a new address sub-field is a pure data edit.

### 2b. …and the 12 predicates that should have been data too

Of the 16 `predicate()` entries, **12 are a one-line wrapper around the same helper**:

```js
export const passportDomain = predicate('string', stringMaxLength(58, passport), [reasons.stringMaxLength])
```
(`domain/index.js:976-980`; identical shape at `:424, :728, :735, :742, :749, :984, :990, :996,
:1008, :1016, :1027`.)

`regionCode`, `internalReferenceNumber`, `transportIdentification`, `transportDocumentReference`,
`cph`, `passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`, `description`,
`accompanyingDocumentReference` — **12 of 16 predicate entries (75%) are pure boilerplate that a
`{ type: 'string', maxLength: 58 }` data entry would have eliminated.** Side B invented exactly
that data shape *for address sub-fields* and did not generalise it to scalars. The remaining 4
are 2 date-format and 2 integer-min predicates — also fully data-expressible. On the current
manifest, a scalar rule-table equivalent to `ADDRESS_SUB_FIELD_RULES` would make **16 of 16
predicates data** with zero loss of expressiveness. This is the cheapest, most obvious
improvement available on Side B and it is not a structural limitation — it is unbuilt.

### 2c. Can you add a validation rule without touching code?

**No — except inside an address block.** Adding "max 30 chars" to a new scalar obligation means
editing `domain/index.js` (a new `export const xDomain = predicate(...)` + a new `Map` row). The
recipe is documented as such: `docs/add-an-obligation.md` walks the three-layer edit across all 10
iterations. Adding "max 30 chars" to an address sub-field means adding one object literal to a
rule map.

### 2d. Cross-field validation — mechanism present, **zero live instances**

`engine/index.js:61-103` `validate()` builds a `predicateCtx` carrying `siblingValue(obligation)`,
path-scoped:

```js
const siblingValue = (siblingObligation) => {
  const stored = fulfilments[siblingObligation.id]
  if (path === null) return stored
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) return stored[path]
  return undefined
}
```

`RECOMMENDATION.md:124-135` (D4) presents this as a design decision. **But no domain entry in the
V4 manifest calls `siblingValue`.** `grep -rn siblingValue` across the spike hits only:
`engine/index.js` (definition), `engine/index.test.js:49,:124` (synthetic tests),
`domain/index.test.js:63` (test harness), `controller-sketch.js:52` (stub). The one production
user — a per-species animal-count cap — was **deliberately deleted** as fabricated:

> `domain/index.js:786-797` — "A prior version of this spike carried a fabricated
> `SPECIES_ANIMAL_CAP` map … that map has been removed because it caused the spike to reject
> spec-valid values."

So: **cross-field *value* validation is a supported, tested, unused primitive.** (Cross-field
*scope* — `regionCode` gated on `regionCodeRequirement` — and cross-field *options* —
`speciesDomain` reading the line's `commodityCode` at `domain/index.js:492-502` — are both live
and load-bearing. It is only cross-field predicate-on-value that has no instance.) Honest read:
the mechanism is real and cheap to use; V4 as modelled simply has no such rule.

### 2e. Page-level (whole-form) validation — ABSENT

`contract.js:224-295` `validatePagePayload` is a `for` loop over field descriptors. There is no
hook for a rule that spans two fields *on the same page* and no rule shape that could express one.
The nearest thing is the accompanying-documents block, where "if you set the type, the other three
become required" is expressed as **scope** (a `branchedGate` `applyTo` in the obligations layer)
plus three independent `mandatoryToProceed` flags (`flow/flow.js:378-404`) — i.e. a cross-field
rule was **decomposed into per-field mandates**, which is arguably the better modelling. But a
genuine page-level rule ("start date must be before end date") has nowhere to go today. This is
structural-ish: the error record shape (`{code, obligation, path, subField}`) is per-obligation, so
a page-level error has no natural `obligation` to hang on and no anchor to link to.

### 2f. Cross-record validation — MODELLED DECLARATIVELY, but toothless

`obligations/obligations.js:581-593` declares the V4 "at least one animal identifier per unit"
rule as **pure data on the group obligation**:

```js
requires: {
  get anyOf() { return [passport, tattoo, earTag, horseName, identificationDetails, description] },
  errorCode: 'obligation.unitRecord.identifiersRequired'
}
```

`engine/index.js:512-539` `groupInvariantErrors()` interprets it generically (it is not
`unitRecord`-specific: it reads `group.requires.anyOf` off whatever group it is handed), correctly
skips instances where *no* required leaf is in scope (vacuous truth, `:524`), and
`containerStatus` counts each violation as an unsatisfied mandatory concern (`:472-473`,
`:398-400`), so a subsection stays *In progress* until it is fixed. **This is the best-modelled
validation rule on Side B — genuinely declarative, generically evaluated, correctly integrated
with status.**

Its enforcement is the weak half:
- It is **never checked at page POST** (`grep groupInvariantErrors` → `contract.js`,
  `engine/index.js`, `features/check-your-answers/controller.js` only).
- It surfaces **only** as a CYA prompt (`features/check-your-answers/controller.js:318-331`).
- There is **no submit** on Side B at all, so nothing ever hard-blocks on it.
- The declared `errorCode` is **dead for message derivation**: the CYA controller ignores
  `err.code` and hardcodes `t('cya.promptGroupInvariant', {lineN, unitN})` (`:323-330`). The code
  is referenced only by tests (`engine/index.test.js:1001`). The model declares an error code and
  the presentation layer does not use it.

---

## 3. How an error MESSAGE is derived — TWO paths, and they disagree about who owns copy

`lib/format-domain-errors.js:92-102` `textFor()` is the fork:

```js
export function textFor(error) {
  if (error.message) return error.message        // ← path A: flow-authored, per-obligation
  const copy = COPY[error.code]                  // ← path B: code-keyed, per-RULE
  if (copy) return copy(error)
  return t('errors.domain.unknownCode', { code: error.code })
}
```

### Path A — required messages: hand-written PER OBLIGATION, declared in the FLOW

`flow/flow.js` carries a message **key** on the presents entry; `contract.js:275-282` resolves it:

```js
const key = descriptor.errors?.required
errors.push({ code: 'flow.required', obligation: ..., path: ..., message: key ? t(key) : t('errors.defaultRequired') })
```

13 such keys are live (`flow/flow.js`, 13 × `mandatoryToProceed: true`), resolving to 13
hand-written strings under `errors.*.required` in `locales/en.json:522-564` — "Choose the means of
transport", "Complete the contact address", "Enter the region of origin code". **GDS-correct
copy, per field, written by a human.** Cost: one flow edit + one locale key per required field.

Dead copy found: `locales/en.json:523-525` `errors.countryOfOrigin.required` is an **orphan** —
`flow/flow.js:103-108` removed that field's `mandatoryToProceed` ("Was previously marked
mandatoryToProceed by mistake — corrected in the spec-conformance mandate audit") but left the
key. 14 keys, 13 users.

### Path B — domain-rule messages: DERIVED from the error CODE, not the field

`lib/format-domain-errors.js:21-68` is a dispatch table of **10 live entries keyed by error code**,
each pulling a parameterised template out of `locales/en.json:565-581`:

| code | rendered text |
|---|---|
| `domain.string.maxLength` | "Enter no more than {max} characters (you entered {actual})" |
| `domain.integer.min` | "Enter a whole number of at least {min}" |
| `domain.date.format` | "Enter a valid date in DD/MM/YYYY format" |
| `domain.array.maxSelections` | "Select no more than {max} items (you selected {actual})" |
| `domain.enum.notInOptions` | "Select a value from the list (invalid: {invalid})" |
| `domain.address.subFieldMaxLength` | "**{subField}** must be {max} characters or fewer (you entered {actual})" |
| `domain.address.subFieldEmailFormat` | "**{subField}** must be a valid email address" |
| `domain.address.subFieldEnumInvalid` | "Choose a value from the list for **{subField}**" |

**The critical asymmetry: the three ADDRESS messages name the field; the five SCALAR messages do
not.** A too-long CPH and a too-long passport number both produce the identical string "Enter no
more than 58 characters (you entered 60)". GDS content guidance wants "County parish holding number
must be 58 characters or fewer". **There is no per-obligation override for a domain-rule message** —
`COPY` is keyed by `error.code` alone (`format-domain-errors.js:21`), and domain error records never
carry a `message` field, so path A can never rescue them. To give one field bespoke max-length copy
you must edit `format-domain-errors.js`. Not structural (a two-line change — try
`errors.${error.obligation}.${error.code}` before falling back to `COPY[error.code]`) but **not
achievable in data today**.

Two of the 11 declared reason codes are **unreachable**: `reasons.stringRequired`
(`domain/index.js:84-87`) and `reasons.addressSubFieldRequired` (`:104-107`) — both have a COPY
dispatcher (`format-domain-errors.js:37, :49-53`) and a locale key (`en.json:571, :576`), but no
predicate ever emits them. `addressSubFieldRequired` was retired by "interpretation A" (blank
sub-fields are not validated at page save — `domain/index.js:182-191`), `stringRequired` never
existed.

### Presentation is fully i18n-keyed — infrastructure done, Welsh not threaded

Every user-facing string, including every error, is a message key resolved through
`lib/i18n.js:47-53` `t()` against `locales/en.json` (362 keys). Missing keys render as the raw
dotted path — a deliberate visible failure signal (`lib/i18n.js:10-15`). **No `cy.json` and no
locale parameter anywhere** (`chrome()` at `lib/chrome.js:38` takes no request). So: error copy is
100% externalised, 0% translated.

---

## 4. Error summary — ordering, anchoring, and one real defect

`lib/format-domain-errors.js:139-157` `formatDomainErrors()` walks the error array in order and
emits `{ errorList, fieldErrors }`, the exact shape `govukErrorSummary` wants
(`shared/partials/error-summary.njk:6-10`). The `<title>` gets the "Error: " prefix
(`shared/layout.njk:16`); the form is `novalidate` (`shared/page.njk:20`) so validation is
server-side only — GDS-correct, and there is no client JS anywhere on Side B.

**Ordering — correct by construction, not by explicit rule.** `validatePagePayload` iterates
`fieldsForPage()` descriptors (`contract.js:225-292`), which come from `expandPresents()` in
declared `presents` order (`engine/index.js:248-272`), which is also the render order
(`shared/page.njk:23` → `renderFields`). Address sub-field errors are pushed in `subFields` order
(`domain/index.js:221`). So the error summary is in DOM order for free. Nobody wrote an ordering
rule; nobody had to. That is a genuine win of the presents-array-is-the-page model.

**Anchoring — `hrefFor` (`format-domain-errors.js:120-131`) builds `#${obligation}` /
`#${obligation}-${path}` / `#${obligation}-${path}__${subField}`**, gated so the `__sub` suffix
only appears for the 4 address-family codes (`:108-113`, a deliberate hardening from a prior code
review). Those anchors resolve because the widget ids are built the same way
(`lib/build-field-descriptors.js:28-32`).

**…except for one case, which is a live defect.** A blank/partial **address** that trips the
`mandatoryToProceed` gate produces `{ code: 'flow.required', obligation: 'commercialTransporter',
path: null }` — **no `subField`**. So:

- `hrefFor` → `#commercialTransporter`. But the address widget renders **no element with that
  id**: `shared/partials/fields.njk:26-40` emits a bare
  `<div class="govuk-form-group…">` and then one `govukInput`/`govukSelect` per sub-field with
  ids `commercialTransporter__name`, `…__addressLine1`, etc. `item.args.id` is passed into the
  template and never rendered. **The error-summary link is a dead anchor — clicking it moves focus
  nowhere.**
- `fieldErrors` gets the key `commercialTransporter`, but the address rule only ever reads
  `fieldErrors[`${id}__${sub}`]` (`lib/field-widgets.js:206, :220`) and its `hasErrors` flag is
  computed from those sub-keys only (`:205-207`). So the page renders **no inline error and no
  `govuk-form-group--error` outline** — just an orphan line in the summary.

This affects the 3 address obligations with `mandatoryToProceed` (`commercialTransporter`,
`privateTransporter`, `contactAddress`). The tests miss it precisely: `routes.test.js:462-478` and
`:506-531` assert only `statusCode === 400` and that the message text appears in the payload;
`routes.test.js:432-460` asserts `govuk-form-group--error` but does so for a **sub-field** error,
which does work. Cheap fix (put `id` on the fieldset wrapper, or synthesise a `subField` on the
required error), but it is broken today and the doc does not know it.

---

## 5. Tests

| File | `it(` count | What it pins |
|---|---|---|
| `domain/index.test.js` (804 LOC) | 56 | every domain entry's options + predicate against real V4 values |
| `routes.test.js` (1011 LOC) | 42 | 10+ POST-400 cases through the real server: invalid enum, blank required, blank vs partial address, per-field required on the accompanying-doc block, input preservation on re-render |
| `contract.test.js` (171 LOC) | 16 | 4 `validatePagePayload` cases |
| `lib/i18n.test.js` | 13 | `t()` / interpolation / missing-key |
| `i18n-coverage.test.js` | 11 | **the copy gate** — see below |
| `lib/format-domain-errors.test.js` (119 LOC) | 9 | `textFor` / `hrefFor` / `formatDomainErrors` |
| `engine/index.test.js` | (63 total) | `validate` + `groupInvariantErrors` on **synthetic** obligations |

**The i18n coverage gate is the good idea here** (`i18n-coverage.test.js`): it walks `flow.js` for
every `errors.required` key (`:78-87`), the domain manifest for every enum label (`:103-113`) and
every address sub-field label (`:115-124`), and `FORMAT_ERROR_KEYS` for every dispatcher key
(`:190-202`), asserting each resolves in `en.json`. Add a required message key and forget the
copy → red build. **That is data-driven and worth stealing.**

But it is **half hand-maintained and already stale**: the controller-key lists are literal arrays
(`HUB_KEYS :37-51`, `CYA_KEYS :53-60`, `COMMODITY_LINES_KEYS :62-76`), and they have drifted —
`CYA_KEYS` omits `cya.promptCompleteAddress`, `cya.promptCompleteAddressForUnit` and
`cya.promptGroupInvariant` (all three used at `features/check-your-answers/controller.js:171,
:291, :324`); `HUB_KEYS` omits `hub.status.optional`; there is no `UNITS_KEYS` list at all despite
14 `units.*` keys in `en.json:507-521`. The keys happen to exist, so nothing is red — but the gate
does not cover them.

`docs/testing.md:593-618` (Mutation 16) honestly records that **copy changes are not caught at
all** — a subtly-altered message passes all 385 tests. Declared a deferred gap, not a bug.

---

## 6. Doc vs code disagreements found

1. **`obligations.md` / `RECOMMENDATION.md:124-135` present `siblingValue` cross-field predicates
   as a working design decision (D4).** True as a primitive; **zero live users** in the V4 manifest
   (§2d). The doc does not say so.
2. **`i18n-coverage.test.js:12-14` claims it collects `errors.required` "on every presents /
   presentsForEach entry with `mandatoryToProceed: true`".** The code (`:81-86`) collects
   `entry.errors?.required` regardless of the flag. Harmless (stricter than advertised), but the
   comment is wrong.
3. **`obligations.md:836-839` documents the error record as `{code, obligation, path, ...extra}`.**
   The real records also carry `subField` (address family) and `message` (flow.required) — both
   load-bearing in `format-domain-errors.js`. The doc's type is incomplete.
4. **`domain/index.js:104-107` + `format-domain-errors.js:37` keep dispatchers for two error codes
   nothing emits** (§3). Dead code the docs still imply is live.

---

## 7. Honest scorecard for this dimension

**What Side B genuinely does better than a conventional schema approach:**
- Required-ness is *state-aware*: one `mandatoryToProceed: true` declaration that automatically
  stops being a mandate when the obligation's gate flips it optional (`contract.js:316`). A Joi
  schema cannot do that without re-deriving the schema per request.
- Scope removes fields from validation entirely — an out-of-scope obligation is not in
  `expandPresents`, so it is never validated, never required, never errored. Show/hide and
  validate are the same mechanism.
- Address blocks: one data table drives validation + widget + anchor + completeness.
- Cross-record `requires.anyOf` is real declarative data with a generic evaluator.
- Error-summary ordering is free.

**What is missing or wrong:**
- Scalar validators are 12 lines of boilerplate that should be a data table (unbuilt, not
  structural).
- Domain-rule messages cannot be overridden per field (needs a code change, not a data change).
- Blank-address required errors produce a dead summary anchor and no inline error (live defect).
- No page-level cross-field rule shape.
- Cross-field predicate machinery has no live user.
- No Welsh, no client-side enhancement, no submit-time gate — the group invariant can never
  actually stop anyone.
