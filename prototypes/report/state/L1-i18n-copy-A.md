# L1 — i18n, copy and content model — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

---

## Headline: this dimension does not exist on side A

There is **no i18n layer of any kind**. Not a partial one, not a stub, not a
TODO. A grep for `i18n|locale|translat|welsh|cymraeg|lang=` across the entire
1,000-file root returns **four hits**, and none of them is an i18n mechanism:

```
features/confirmation/controller.js:11:  new Date(value).toLocaleDateString('en-GB', {
features/dashboard/controller.js:19:    ? new Date(value).toLocaleDateString('en-GB', {
features/declaration/controller.js:25:  new Date(value).toLocaleDateString('en-GB', {
services/address-book/stub.js:217:  'deeside-animal-trade|Deeside Animal Trade|7 Welsh Road|Deeside|CH5 2LR|United Kingdom',
```

Three hardcoded `en-GB` date formats and a stub street name. That is the whole
surface. **0 locale files, 0 translation keys, 0 message catalogues, 0 lookup
functions, 0 coverage tests, no `lang` attribute override, no language
switcher, no locale negotiation.** The host repo has none either
(`grep -rliE "i18n|locales|welsh" clone-live-animals/src` → empty), so a
retrofit has no existing rails to hook into.

This is **not an oversight the docs hide** — it is a *documented paradigm
choice*, and that is what makes it interesting rather than merely absent.

---

## 1. Where copy lives: page-side, inline, English, by design

### 1.1 The design rule

`docs/obligation-model.md:36-42`:

> "There is deliberately no `type`, no copy, no widget choice and no
> validation on an obligation. The v1 model carried all of those, and a usage
> trace during the rebuild found that no runtime code read them — **every
> widget, label and value domain was already re-declared in the page templates
> and controllers**. So v2 dropped the dead copies: pages own presentation…"

`docs/decisions.md:272` — "## 6. Obligation definitions carry no types, options
or copy (resolved)". `docs/features.md:172` — "Copy, headings, row composition
and templates always live page-side." `docs/architecture.md:190` lists
"**Model-owned copy**" as the *rejected* alternative.

So the model is copy-free **by contract**, and a boot guard
(`obligation-purity.js:19-46`) enforces the model can only import another
`obligations.js` or a reference-data service — it physically cannot import a
message catalogue. Copy therefore lives in exactly two places: the `.njk`
template, and the controller that builds its view-model.

**Verified against code — the docs are accurate here.** Every one of the 12
`features/*/obligations.js` files contains zero strings that are not ids or
value-domain operands.

### 1.2 The counts

| Where | Count | Evidence |
|---|---|---|
| Hardcoded English literals in `.njk` (quoted, capitalised, ≥4 chars) | **119** | `grep -rhoE` over 32 templates |
| Hardcoded English literals in controllers + `shared/kit.js` | **315** | same over `*.controller.js`, `controller.js`, `kit.js` |
| **Total user-facing string sites in app code** | **~434** (≈428 after subtracting ~6 internal enum codes: `'COMPLETE'`, `'PENDING'`, `'REJECTED'`) | |
| Display-label data in service stubs (country/port/party/commodity names, code→label enums) | **~351** literal lines across 10 `services/*/stub.js` | |
| English copy re-stated in **unit tests** | **95** assertion sites | `toBe/toContain/toEqual` with capitalised prose, 64 test files |
| English copy re-stated in the **E2E suite** | **616** selector/assertion sites | `prototypes/e2e/live-animals.spec.js` (2,917 LOC) |
| Copy externalised into a locale file | **0** | |

**The tests are the real cost multiplier.** 711 test sites hardcode the exact
English string. `t2-hub-copy.test.js:59-66` is representative — it asserts the
literal group captions `'1. About the consignment'` … `'6. Check and submit'`.
A locale retrofit does not touch 434 sites, it touches ~1,145.

### 1.3 Shape of the copy that exists

Copy is *structured* where a page needed structure, but never keyed for
translation:

- **Page titles** — one string argument to `kit.base(...)` per controller,
  ~18 call sites. `kit.js:65` `export const base = (title, {...}) => ({ layout: LAYOUT, pageTitle: title, breadcrumbs: breadcrumbs(title), ... })`.
- **The hub** — `features/hub/controller.js:21-118` holds a `GROUPS` const:
  6 groups × `{ id, caption, rows: [{ id, title, hint }] }`. This is the
  closest thing on side A to a *content model*: row `id` → `{title, hint}`.
  It is a local `const` in one controller, and the ids are flow row ids, not
  message keys.
- **Status vocabulary** — `features/hub/controller.js:120-135`, a
  `STATUS_TAG` map from the engine's five statuses to English tags
  (`'Completed'`, `'Optional'`, `'In progress'`, `'Not yet started'`) plus
  `CANNOT_START_STATUS = { text: 'Cannot start yet' }`. Derived status →
  English label is an imperative per-controller mapping.
- **Option labels** — code→label maps in the service stubs, e.g.
  `services/import-reason-purpose/stub.js:1-23` (`REASON_FOR_IMPORT_LABEL`,
  `PURPOSE_IN_INTERNAL_MARKET_LABEL`). This *is* an externalised, keyed
  content store — but it is a reference-data stub with no locale dimension,
  no namespace and no fallback. `docs/services.md:45-50` documents the
  convention: "Most code→label enums store the code and look the label up at
  check-answers."
- **Validation messages** — passed as literal arguments to Joi factories from
  the controller (`lib/validate/validators.js:17-24`, `:49`, `:57`…), with
  English defaults baked into the factory
  (`postcode = (name, message = 'Enter a valid postcode')`).
- **Check-your-answers rows** — hand-composed, label-by-label, in
  `features/check-answers/controller.js` (495 LOC). `docs/add-a-field.md:11`
  is blunt: "You author the rendering, the validation, the persistence wiring
  and the **Check your answers row by hand**."

---

## 2. Copy is duplicated, and nothing enforces consistency

### 2.1 The V4 Standard Address Block is typed out three times

The spec models it **once** as a reusable field group
(`spec/journey-spec.json:194`: "V4 Standard Address Block (#address_block):
Name or Organisation name (string max 255, Mandatory); …" — 9 fields). The
code has no reuse unit for copy, so it is re-typed:

- 9 English labels ("Address line 2 (optional)" etc.) in **3 places** —
  `features/transport/private-transporter-details.njk`,
  `features/addresses/create-address.njk`,
  `features/commodities/animal-identification.controller.js`
- 16 English error messages ("Name or organisation name must be 255 characters
  or less" etc.) in **3 places** —
  `features/transport/private-transporter-details.controller.js`,
  `features/commodities/animal-identification.controller.js`,
  `features/addresses/create-address.controller.js`

That is ~75 duplicated copy sites for one reusable field group. The `_address-picker.njk`
partial proves shared partials *are* possible in this architecture — they just
were not used for the address block.

### 2.2 'There is a problem' exists five times

`shared/kit.js:36` (`errorSummary`), plus four hand-rolled copies:
`features/commodities/animal-identification.controller.js:375`,
`features/commodities/consignment-details.controller.js:171`,
`features/addresses/party-picker.controller.js:79`,
`features/documents/controller.js:201`.

### 2.3 The spec holds English page titles that the runtime does not read

`spec/journey-spec.json` carries a `title` for all 27 pages and 10 sections
(e.g. `:206 "title": "Import notification service"`, `:214 "title": "What are
you importing?"`, `:223 "title": "Origin of the import"`). **Nothing imports
it** — `grep -rn "journey-spec"` across the whole root returns one hit, in
`PROVENANCE.md`. So every page title exists twice (spec + `kit.base(...)`) with
no test asserting they agree. The upstream content source of truth is
disconnected from the runtime.

### 2.4 There is no copy-coverage test

Side A has strong *structural* coverage enforcement — `flow/dispatch.js:74`
coverage-asserts every obligation is collected by exactly one page (boot
crash otherwise), and `contract.test.js` asserts each handler commits exactly
its declared `collects`. **None of this extends to copy.** There is no
equivalent of "fail if a key is missing". `t2-hub-copy.test.js` (221 LOC) pins
hub copy by asserting exact literals, and `docs/testing.md:104` concedes the
gap: "The E2E specs navigate hub rows by **title** and never read the hint
text, so hint copy has no E2E coverage… If a row's hint copy matters, pin it
there." `docs/limits.md:88` goes further:

> "The `.njk` templates and the route wiring never got a sweep. Template-level
> GDS component usage, and **copy correctness** beyond the hub fix that was
> found by other means, **are unexamined**."

---

## 3. Pluralisation, interpolation, formatting

- **Interpolation** — JS template literals only. ~10 sites, e.g.
  `features/commodities/animal-identification.controller.js`:
  `` `Enter details for ${species} ${records + 1} of ${cap}` ``,
  `` `You have entered details for all ${cap} ${species} animals. Remove a record if you need to replace it.` ``.
  No named placeholders, no ICU, no message-with-args API.
- **Pluralisation** — exactly one helper, English-only, 1 line:
  `features/commodities/consignment-details.controller.js:120`
  ```js
  const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`
  ```
  Two plural categories, suffix `s`. Used at one call site (`:138`). Welsh has
  six CLDR plural categories and does not pluralise by suffix — this helper
  cannot express it.
- **English grammar baked into a shared helper** —
  `features/check-answers/controller.js:55` derives the GDS visually-hidden
  Change text by lowercasing the row label:
  `visuallyHiddenText: visuallyHiddenText ?? key.toLowerCase()`. Correct for
  English sentence case; wrong for any language with grammatical
  capitalisation or initial-consonant mutation (Welsh).
- **Dates** — `toLocaleDateString('en-GB', …)` hardcoded at three sites
  (confirmation, dashboard, declaration controllers). Date *entry* is
  day/month/year GDS parts (`kit.js:85-100`), hardcoded to that order.
- **`lang` attribute** — never set. `shared/layout.njk:1` extends
  `govuk/template.njk` and overrides `head`, `pageTitle`, `beforeContent`,
  `content`, `bodyEnd` — but not `htmlLang`, so the page ships the
  govuk-frontend default `lang="en"`. No override exists anywhere in
  `prototypes/`.
- **Error page-title prefix** — `shared/layout.njk:16`
  `{% if errorSummary %}Error: {% endif %}{{ pageTitle }} | Import notification service (standalone)` —
  the GDS "Error: " prefix is a hardcoded literal in the layout.

---

## 4. THE ASYMMETRIC FINDING: A's model has no copy, but it has **English data as its predicate operands**

This is the one place where "side A has no i18n" stops being a boring absence
and becomes a **structural coupling that a retrofit cannot cheaply undo**.

The obligation model is genuinely copy-free. But `decisions.md` #6 also removed
`options` (the value domain) from the obligation. The consequence: an
obligation's `activatedBy` predicate must compare against the **stored answer**,
and for three fields the stored answer **is the English display label**.

`features/transport/obligations.js:17-47` — verbatim:

```js
export const transitedCountries = {
  id: 'transitedCountries',
  required: true,
  activatedBy: {
    obligation: meansOfTransport,
    includes: ['Railway', 'Road Vehicle']
  },
  wipeOnExit: true
}
…
export const commercialTransporter = {
  id: 'commercialTransporter',
  required: true,
  activatedBy: { obligation: transporterType, equals: 'Commercial' },
  wipeOnExit: true
}
```

The gate operands are English UI strings. `services/transport-reference/stub.js:1-8`
confirms the value domain *is* the label list
(`MEANS_OF_TRANSPORT = ['Airplane', 'Railway', 'Road Vehicle', 'Vessel']`), and
`docs/services.md:47-50` documents it as a deliberate exception:

> "The `transport-reference` enums are the exception: `meansOfTransport` and
> `transporterType` are **persisted as their V4 display label**, so their
> check-answers rows render the raw stored value with no lookup — **do not add
> one**."

The same holds for the model's centre of gravity. `commoditySelection` stores
an English commodity display name, and **all seven conditional
animal-identifier fields gate on it**
(`features/commodities/obligations.js:25-53`, `enclosingCommodity(commodities.passportCommodities())`),
where the operand lists are English strings like `'Cow'`, `'01064100 - Bees'`,
`'01063980 - Game Birds - Day old chicks - Partridge'`
(`services/commodities/stub.js:1`, `:30-50`).

And it is **persisted**: `services/persistence/records/notification-mapper.js:451`
maps `meansOfTransport: answers.meansOfTransport` straight through to the
backend notification, and `skeleton-equivalence.test.js` pins the result
byte-for-byte against what the legacy service POSTs.

**So the retrofit chain is:** translate a label → either (a) the stored value
diverges from the predicate operand and *15 conditional obligations silently
fall out of scope, wiping their answers* (all 15 carry `wipeOnExit: true`), or
(b) you introduce a code→label indirection, which changes the persisted value,
which breaks the backend notification contract and the skeleton parity pin.

The obligation model **cannot express** "gate on the code behind this label",
because `decisions.md` #6 deliberately deleted `options`/`type` from the
obligation. There is no code↔label seam in the model. That is a **structural**
limitation, and it is the single most expensive thing about side A on this
dimension — far more expensive than the 434 inline strings, which are merely
tedious.

Note the honest counter-point: the *majority* of enums (`certification-purposes`,
`import-reason-purpose`, `countries`) already store a code and look the label up
in the service — so the pattern for doing this right exists in the codebase and
is documented (`docs/services.md:45-47`). Three fields are the exception, not
the rule. The structural gap is that **the model cannot enforce or even express
the distinction** — the discipline lives in a doc.

---

## 5. Retrofit cost (first-class, not a footnote)

| Work item | Sites | Nature |
|---|---|---|
| Extract inline copy to a catalogue | ~428 strings across 32 `.njk` + 22 controllers | Mechanical. A build loop closes this cheaply. |
| Update tests that pin English literals | 95 unit + 616 E2E = **711** | Mechanical but larger than the source change. Every E2E `getByRole({name: 'Save and continue'})` becomes a key lookup or the suite is locale-locked. |
| De-duplicate the address block (9 labels + 16 messages × 3) | ~75 | Needs a shared macro/content unit that the paradigm currently forbids by convention ("pages own copy"), though `_address-picker.njk` shows it is possible. |
| Add a `lang` attribute + locale negotiation + switcher | ~3 files | Trivial; nothing exists. |
| Replace `plural()` and `key.toLowerCase()` | 2 helpers, 3 call sites | Trivial to delete, non-trivial to replace with a real plural-rule engine. |
| **Decouple code from label for `meansOfTransport` / `transporterType` / `commoditySelection`** | Model (3 obligation files, 15 `activatedBy` gates), 2 mappers, the skeleton parity pin, the backend contract | **Structural.** Not a build-loop job. Requires either a new obligation key (`options`/`valueDomain`) — reversing `decisions.md` #6 — or a controller-side code↔label translation on every read/write of those three fields. |
| Wire the spec's 27 page titles into the runtime | 18 `kit.base()` call sites + a coverage test | Not built; would give A its first content source of truth. Cheap. |

**What A buys with the absence** (`docs/limits.md:76`): "bespoke layout on every
page, copy beside the markup that renders it, and onboarding that is 'read the
page you are changing' rather than 'learn the engine and its config DSL'." That
is a real benefit and it should be priced honestly — for a prototype whose
purpose is to interrogate the *obligation model*, deferring i18n was a
defensible trade. But it means side A contributes **nothing** to a third-option
content model except a cautionary tale.

---

## 6. Verdict on the docs

The docs are **accurate and unusually candid** on this dimension. They claim no
copy in the model (true — verified across all 12 `obligations.js` files), they
name the cost ("there is no free CYA row", `docs/limits.md`), and
`docs/limits.md:88` volunteers that copy correctness is unexamined. The one
thing the docs do *not* say — and the thing this analysis adds — is that "no
copy in the model" is true for **labels** and false for **value domains**: the
model's conditionality is keyed on English display strings for three fields,
and that is the only genuinely structural i18n problem side A has.
