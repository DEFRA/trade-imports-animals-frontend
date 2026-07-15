# L1 deep read — SIDE B (flow-layer) — Presentation, widget derivation and check-your-answers

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root:  `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
All paths below are relative to that root unless stated.

---

## Headline

Side B's presentation layer is **small, genuinely data-driven at the widget seam, and hand-written everywhere else**. The widget IS derived from the model — 7 ordered rules read the Domain entry's `type` and pick exactly one govuk macro, and 8 templates (299 LOC) serve all 31 pages with zero business logic. That mechanism is real and is the cheapest thing on Side B to steal.

But three things named in the brief are weaker than the docs claim:

1. **The CYA change-link round-trip does not round-trip.** `obligations.md:2338` documents a `?change=1` change-mode that returns the user to CYA on save. Grep across the entire spike returns exactly one hit for `change=1` — that line of the doc. No code implements it. Clicking Change on CYA takes you into the page; saving sends you to the *next unfulfilled page or the task list* (`lib/page-controller.js:92-93`), never back to CYA.
2. **There is no display-value/formatter layer.** There are three near-duplicate ad-hoc formatters — `features/check-your-answers/controller.js:65` `formatSingle`, `features/units/controller.js:62` `labelFor`, `features/commodity-lines/controller.js:76` `labelFor` — with three different levels of capability. The commodity-lines one cannot render an address at all.
3. **Value multiplicity (scalar vs array) is not modelled.** It is a hard-coded 3-name `Set` in the *presentation* layer (`lib/field-widgets.js:56-62`), keyed on `obligation.name`, which `obligations.md:2075` explicitly declares renameable ("Cosmetic renames are safe"). It is not safe: a rename silently flips a checkbox field to radios *and* silently changes the stored value's shape from array to string.

---

## 1. MECHANISMS

### M1 — Widget dispatch: data-shaped, ordered, first-match-wins (MODELLED DECLARATIVELY)

`lib/field-widgets.js` (343 LOC) exports `rules`, an ordered array of 7 rule objects, and `pickWidget(ctx)` which returns the first non-null:

```js
export function pickWidget(ctx) {
  for (const rule of rules) {
    const view = rule.build(ctx)
    if (view) return { rule: rule.id, view }
  }
  return null
}
```
— `lib/field-widgets.js:337-343`

The 7 rules, in order, and the discriminator each reads:

| # | rule `id` | fires when | emits `view.type` | line |
|---|---|---|---|---|
| 1 | `checkboxes` | `entry.type === 'enum'` AND `OBLIGATION_MULTI.has(obligation.name)` | `checkboxes` | :70 |
| 2 | `radios` | `entry.type === 'enum'`, not multi, `options.length <= 5` | `radios` | :102 |
| 3 | `select` | `entry.type === 'enum'`, not multi, `options.length > 5` | `select` | :137 |
| 4 | `address` | `entry.type === 'address'` | `address` | :179 |
| 5 | `date` | `entry.type === 'date'` | **`input`** | :270 |
| 6 | `number` | `entry.type === 'integer'` | **`input`** | :295 |
| 7 | `text` | (unconditional fallback — also fires when there is NO domain entry) | `input` | :317 |

`RADIO_MAX = 5` (`:64`). The radio/select split is computed **at render time from the resolved option list**, so a `computedEnum` whose options shrink below 6 in a given state would render as radios and above as a select. That is genuine state-dependent widget derivation, not a static declaration.

The dispatch ctx is assembled once, in `lib/build-field-descriptors.js:58-110` — the single call site of `pickWidget`. It resolves options through the engine (`optionsFor`), copy through `presentation.forObligation`, labels through `domainEntry.labels`:

```js
const options =
  domainEntry?.type === 'enum'
    ? optionsFor(entry.obligation, state.fulfilments, undefined, domain, { path: entry.path })
    : []
```
— `lib/build-field-descriptors.js:71-76`

**Verdict: the widget is derived from the field type, not hand-wired in a template.** There is exactly one place a govuk widget is chosen. That claim in the inventory is true.

### M2 — The template layer is a shape switch and nothing else (MODELLED DECLARATIVELY)

8 `.njk` files, **299 LOC total**, **32 control-flow tags** (`{% if %}` / `{% elif %}` / `{% for %}`) across all 8 — 11 of them inside the one dispatch macro. Templates never import obligations, domain entries or state; they see only `FieldViewItem`s.

```njk
{% macro field(item) %}
  {% if item.type == 'radios' %}   {{ govukRadios(item.args) }}
  {% elif item.type == 'checkboxes' %} {{ govukCheckboxes(item.args) }}
  ...
{% endmacro %}
```
— `shared/partials/fields.njk:15-44`

`shared/page.njk` (27 LOC) drives **all 20 static pages + all 10 per-record pages**: error summary, `<h1>`, `renderFields(fields)`, submit button. Zero hardcoded copy (`shared/page.njk:11-27`).

Template LOC by file: `layout.njk` 51, `fields.njk` 50, `commodity-lines/list.njk` 47, `units/list.njk` 43, `check-your-answers/template.njk` 36, `hub/template.njk` 34, `page.njk` 27, `error-summary.njk` 11.

### M3 — Composite address widget derived from the domain entry (MODELLED DECLARATIVELY)

The `address` rule (`lib/field-widgets.js:179-269`) reads `entry.subFields`, `entry.required`, `entry.subFieldRules` off the Domain entry and emits one sub-widget per sub-field, choosing `select` for `rule.type === 'enum'` (the country MDM list) and `input` otherwise:

```js
if (rule.type === 'enum' && Array.isArray(rule.options)) {
  return { ...common, widget: 'select', items: [...] }
}
const uiHints = uiHintsFor(sub, rule)
return { ...common, widget: 'input', ...uiHints }
```
— `lib/field-widgets.js:236-264`

9 `addressBlock` entries (`domain/index.js:906-...`), 9 sub-fields each (`ADDRESS_SUB_FIELDS`, `domain/index.js:839-849`), `commercialTransporter` gets a 10th (`:877-888`). That is **82 of the ~113 rendered inputs** in the whole spike, all generated from one declaration.

Sub-field a11y hints (HTML `autocomplete` / `inputmode` / `type` / width classes) are a 7-branch imperative helper — `uiHintsFor(sub, rule)`, `lib/field-widgets.js:23-54`. Half of it keys off `rule.type` (declarative: `email` → `type=email, autocomplete=email`) and half off the *literal sub-field name* (`if (sub === 'postcode')`, `if (sub === 'town')`). **PARTIAL** — a new sub-field name gets no autocomplete hint unless someone edits this function.

### M4 — Copy is a keyed i18n manifest, coverage-tested (MODELLED DECLARATIVELY, one bucket excepted)

`lib/presentation.js` (433 LOC) is `OBLIGATION_KEYS`: a `Map` of **40 obligation ids → `{pageTitleKey, legendKey, hintKey?}`** (`:69-385`) holding *message keys*, not literals. `forObligation()` (`:419-433`) resolves them through `t()`, with `humaniseId()` as the fallback for an unmapped obligation (`:401-408`). `locales/en.json` = **362 keys, 584 LOC**.

`i18n-coverage.test.js` (221 LOC) walks flow `titleKey`s, `errors.required` keys, `OBLIGATION_KEYS`, `PAGE_KEYS`, every domain `labels` map, and every address sub-field label, and asserts each resolves. That is a real anti-rot gate for ~all the *declarative* copy.

### M5 — Error rendering: domain error records → GOV.UK error summary + inline errors (MODELLED DECLARATIVELY)

`lib/format-domain-errors.js` (158 LOC) turns `{code, obligation, path?, subField?, max?, actual?}` records into `{errorList, fieldErrors}`. Anchor computation is path-aware and sub-field-aware:

```js
const base = error.path ? `${error.obligation}-${error.path}` : error.obligation
const useSubField = error.subField && ADDRESS_ERROR_CODES.has(error.code)
const anchor = useSubField ? `${base}__${error.subField}` : base
return `#${anchor}`
```
— `lib/format-domain-errors.js:120-131`

The `#id` matches the rendered input id computed in `lib/build-field-descriptors.js:28-32` and `lib/field-widgets.js:219`, so error-summary links land on the exact input — including the exact sub-field of an address block. 11 error codes have copy (`COPY`, `:21-68`), with an `unknownCode` catch-all.

**POST-error value preservation is real**: `fieldsForPage(page, state, result.fieldErrors, {submittedValues: result.values})` (`lib/page-controller.js:73-75`), and `buildFieldDescriptors` prefers the submitted value over stored state (`:80-82`). Typed input survives a validation failure on all three controller factories.

### M6 — CYA summary list: derived from the model, but ordered by the *manifest* (MODELLED DECLARATIVELY, with a caveat)

`features/check-your-answers/controller.js` (351 LOC) walks `state.obligations` — the evaluator's output — not a hand-written row list:

```js
for (const [oblId, impl] of Object.entries(state.obligations)) {
  const obligation = obligationsById.get(oblId)
  if (!obligation || !impl.inScope) continue
```
— `features/check-your-answers/controller.js:207-210`

Every in-scope obligation with a non-blank value gets a row; blank mandatories become a soft prompt in a notification banner; group-invariant violations become prompts (`:318-331`); structurally-incomplete addresses become "Complete the … address" prompts by consulting `domainEntry.isComplete(leaf)` (`:247-255`, `:283-298`). Records fan out to one row per line / per unit with ordinal-based labels ("Photo (animal 2 on commodity line 1)", `keyLabelFor`, `:139-151`).

**Caveat:** `state.obligations` is built by `buildImplications(obligations, …)` iterating the manifest array (`obligations/evaluator.js:115`), so **CYA row order is obligations-manifest declaration order, not flow order**. Nothing in the flow layer influences the order the user sees their answers back. Not structural, but it means the CYA page's reading order is an accident of the manifest.

### M7 — Change links: model-derived target, no round-trip (PARTIAL)

`changeLinkFor(obligationId)` → `firstPagePresentingObligation(flow, obligationId)` (`contract.js:164-166`) — the page is found by walking the flow, so a page move automatically moves the change link. `hrefForChange` then builds the URL at the right depth:

```js
if (changePage.presentsForEach) {
  if (unitId) return `${BASE}/lines/${lineId}/units/${unitId}/${changePage.page}`
  return `${BASE}/lines/${lineId}/${changePage.page}`
}
return `${BASE}/pages/${changePage.page}`
```
— `features/check-your-answers/controller.js:115-129`

The *target* is correct at all three depths. The *return* is not — see L2 below.

---

## 2. WHAT IS DECLARATIVE vs IMPERATIVE — the honest split

**MODELLED DECLARATIVELY (engine interprets data):**
- widget choice from `domainEntry.type` + option-count + state (M1)
- address sub-widget composition from `subFields`/`subFieldRules` (M3)
- option lists + option labels from the Domain entry (`labels` map, resolved via `tOrNull`)
- page copy from `OBLIGATION_KEYS` message keys (M4)
- error anchors + inline errors from domain error records (M5)
- CYA row set (which obligations appear) from the evaluator's in-scope set (M6)
- change-link target from a flow walk (M7)
- per-line / per-unit summary rows: `LINE_PAGES` / `UNIT_PAGES` are **derived from the flow at import time** (`features/commodity-lines/controller.js:43,56-65`; `features/units/controller.js:36,44-60`) — with a comment recording that this was previously hand-maintained and *had already silently dropped a row*: "iteration 6 (commodityType) forgot to add itself, so the Commodity type row was silently missing from every line's summary block" (`commodity-lines/controller.js:36-42`).

**HANDLED IMPERATIVELY (real, working, coded by hand per case):**
- **value multiplicity** — `OBLIGATION_MULTI = new Set(['transitedCountries','species','animalsCertifiedFor'])` (`lib/field-widgets.js:56-62`)
- **display formatting** — 3 near-duplicate formatters (L3 below)
- **address sub-field autocomplete hints** — 7 name-literal branches (`lib/field-widgets.js:39-53`)
- **payload coercion** — keyed off the *widget rule id*, not the model: `if (descriptor.widget === 'checkboxes') …` / `=== 'number'` (`contract.js:324-338`)
- **hub special-casing** — three literal subsection ids branch the task-list href and status: `subsection.id === 'commodity-lines-manage' || … 'commodity-lines-details' || … 'per-unit-records'` (`features/hub/controller.js:80-85`), plus `linesManageStatus` overriding the engine's container status (`:60-69, 103-105`)
- **status tag colours** — `STATUS_CLASSES` map (`features/hub/controller.js:25-32`) — reasonable, it is GDS styling not copy
- **multi-field page titles** — a page presenting ≥2 obligations has no authored title; it falls through to `pageCopy(page.page)` → `humaniseId(slug)` (`lib/page-controller.js:32-39`, `lib/presentation.js:410-417`). `PAGE_KEYS` has exactly **1** entry (`commodity-lines-intro`), and that page is not even routable (`routes.js:189` `if (!hasPresents) continue`). So the titles of `transport-identification`, `arrival-details`, `accompanying-documents` and `transporter-details` are **derived from the URL slug**, not from an i18n key.

**ABSENT:**
- change-mode / return-to-CYA (L2)
- back-link derivation — `backLinkFor()` returns the task list unconditionally, `// Best-effort` (`lib/page-controller.js:41-45`), directly contradicting `obligations.md:2347-2354` "Back is contextual"
- GOV.UK 3-part date input — `govukDateInput` is imported at `shared/partials/fields.njk:9` and dispatched at `:23`, but **no rule ever emits `type: 'date'`** (the `date` rule emits `type: 'input'`, `lib/field-widgets.js:279`). Dead branch. Same for `textarea` (`fields.njk:8,24`) — no rule emits it.
- accessible-autocomplete / typeahead for long lists. `countryOfOrigin` (25 options) renders as a bare `govukSelect`; `transitedCountries` (26 countries) renders as **26 checkboxes**. Grep for `accessible-autocomplete` across the spike: zero hits outside `NEXT.md:264` (a TODO).
- any client-side JS at all (no progressive enhancement)
- Welsh (`locales/` has `en.json` only; `chrome()` takes no request/locale arg — `lib/chrome.js:38`)
- a shared display-value/formatter module

---

## 3. LIMITATIONS, with structural / not-structural called

### L1 — Value multiplicity is a presentation-layer hard-code keyed on a renameable field (STRUCTURAL-ish; cheap to fix, but the model has no slot for it today)

```js
const OBLIGATION_MULTI = new Set([
  'transitedCountries',
  'species',
  'animalsCertifiedFor'
])
```
— `lib/field-widgets.js:56-62`

Grep of `domain/index.js` for any multi/array declaration: the only hits are `Array.isArray` guards inside predicates. **The Domain type alphabet is `{enum, integer, string, date, address}` — there is no `multi` flag and no `array` type.** `transitedCountriesDomain` even carries `metadata.shape: 'staticEnumWithMaxSelections', max: 12` (`domain/index.js:1099-1105`) — and the widget layer does not read it.

Two consequences:

1. **The rename hazard.** `obligations.md:2075` states "**Cosmetic renames are safe.**" It is not. `OBLIGATION_MULTI` matches on `obligation.name`. Rename `species` → `speciesList` and the checkbox rule stops firing; the radios rule fires instead (species options are commodity-code-derived and can be ≤5); and because `contract.js:331-335` coerces to an array **only when `descriptor.widget === 'checkboxes'`**, the stored fulfilment silently changes shape from `['bovine']` to `'bovine'`. A "cosmetic" rename corrupts persisted data shape with no test failure — `obligations/coverage.test.js` checks id/name *uniqueness*, not that every `OBLIGATION_MULTI` name resolves to a real obligation.
2. **The widget id leaks into the data layer.** `coerceValue(descriptor, raw)` branches on `descriptor.widget` — a *rendering* decision — to decide the stored type. Presentation is deciding persistence shape.

Fix cost: add `multi: true` to the domain entry shape (or a `type: 'enumMulti'`), read it in rules 1-3 and in `coerceValue`. ~15 lines across 2 files + the 3 domain entries. Cheap — but it is a *model* change, not a presentation change, which is why I call it more than "merely not built".

### L2 — The CYA change-link does not round-trip back to CYA (NOT structural — unbuilt)

`obligations.md:2338-2345`:
> The Change flow uses the `?change=1` pattern from the existing prototype: User clicks Change → page is rendered in change mode. On submit, the runtime returns to CYA instead of advancing to the next Page in the SubSection.

Code: `grep -rn "change=1|query.change|changeMode|returnTo|referrer"` over the whole spike returns **one hit — that doc line**. No controller reads a query param. `page-controller.js` POST unconditionally does:

```js
writeAnswer(request, result.values)
const stateAfter = readState(request)
const target = nextAfter(page, stateAfter)
return h.redirect(urlForNext(target))
```
— `lib/page-controller.js:90-93`

`nextAfter` (`contract.js:115-127`) returns the next unfulfilled page in the subsection, then the section, then `{kind:'task-list'}`. The line and unit controllers are the same, landing on `/lines` and `/lines/{id}/units` respectively (`lib/line-page-controller.js:128-129`, `contract.js:135-161`).

So: user on CYA clicks Change on "Country of origin", edits it, saves — and is dumped into the *next unfulfilled page of the origin subsection*, not back on CYA. `urlForNext(target, opts)` even accepts `opts.query` (`lib/page-controller.js:27-30`) but **no caller ever passes it** — a stub for the feature that was never wired.

This is the single biggest gap in this dimension, and it is a **documented capability that does not exist**. Not structural: `nextAfter` already takes the page + state, so threading a `?change=1` through the three controller factories is ~20 lines. But it is 3 factories, not 1 (see L5).

### L3 — Three duplicate display-value formatters; no formatter layer (NOT structural — unbuilt, but the duplication is already causing divergence)

| where | LOC | arrays | address composite | unknown object |
|---|---|---|---|---|
| `features/check-your-answers/controller.js:65` `formatSingle` | 42 | yes | yes | `JSON.stringify` (deliberate — `:98-104`) |
| `features/units/controller.js:62` `labelFor` | 37 | yes | yes (copy-paste of the above, with a `2nd-code-review #12` comment duplicated verbatim) | `String(value)` → `[object Object]` |
| `features/commodity-lines/controller.js:76` `labelFor` | 13 | yes | **no** | `String(value)` → `[object Object]` |

The commodity-lines one is structurally incapable of rendering an address:
```js
const labels = domain.get(obligation.id)?.labels
const resolve = (v) => tOrNull(labels?.[v]) ?? v
if (Array.isArray(value)) return value.map(resolve).join(', ')
return String(resolve(value))
```
— `features/commodity-lines/controller.js:82-87`

No bug **today**, because the `commodity-lines-details` subsection happens to present no address obligation. Add one line-scoped address to the flow and the `/lines` summary renders `[object Object]` with no test failure. The two address-capable copies also share the same `2nd-code-review #12` fix comment — evidence the duplication has already forced the same fix to be applied twice by hand.

There is also **no type-aware formatting at all** for dates or integers: `formatSingle` ends `return String(label(value))`. A date stored as `12/12/2026` round-trips only because it is stored in display format in the first place (`lib/field-widgets.js:274-278` explains this is deliberate: "we render a single text input … so the round-trip is trivial").

### L4 — Long option lists have no accessible pattern (NOT structural)
26 checkboxes for transited countries, a bare `<select>` for 25 countries of origin. `NEXT.md:264` names an "autocomplete-search picker" as a TODO. Zero client JS in the spike, so an autocomplete requires the first bundle.

### L5 — Presentation is hard-coded per depth: 3 parallel page-controller factories (STRUCTURAL for the browser layer)
`lib/page-controller.js` (111), `lib/line-page-controller.js` (141), `lib/unit-page-controller.js` (179) are three near-identical GET/POST factories differing only in id-params, scope guard and next-URL builder. Every presentation change described above (change-mode, back links, POST-error preservation) has to be made **three times**. The POST-error-preservation fix was in fact applied three times; the comment in `line-page-controller.js:107` reads `// Preserve user input on re-render (see page-controller.js).` A depth-3 group needs a fourth.

### L6 — The i18n coverage gate is hand-maintained for controller copy, and has already drifted (NOT structural)
`i18n-coverage.test.js` walks the *declarative* copy automatically, but controller copy is three hand-typed arrays: `HUB_KEYS` (13), `CYA_KEYS` (6), `COMMODITY_LINES_KEYS` (13) — `i18n-coverage.test.js:37-76`. Already missing:
- **`units.*` entirely** — 12+ keys used in `features/units/controller.js` (`units.notFilled`, `units.unitHeading`, `units.deleteHidden`, …); `locales/en.json:507` has the bucket; **no coverage list references it**.
- **3 CYA keys**: `cya.promptCompleteAddress`, `cya.promptCompleteAddressForUnit`, `cya.promptGroupInvariant` (`en.json:486-488`) — used at `check-your-answers/controller.js:171,291,324`, absent from `CYA_KEYS`.

A missing `units.*` key would ship the raw dotted path to the UI and no test would fail.

### L7 — Multi-obligation page titles come from the URL slug (NOT structural)
`PAGE_KEYS` has 1 entry, for a page that is not routable. The 4 real multi-obligation pages get `humaniseId(page.page)`. Ten minutes of work; noted because it is the one place authored copy silently isn't authored.

---

## 4. DOC vs CODE — where they disagree

| `obligations.md` claim | reality | evidence |
|---|---|---|
| :2338 "The Change flow uses the `?change=1` pattern … on submit the runtime returns to CYA" | not implemented; save always advances via `nextAfter` | `lib/page-controller.js:90-93`; grep for `change=1` hits only the doc |
| :2347-2354 "Back is **contextual**" (from task list → back to task list; else previous page) | `backLinkFor()` returns the task list, always. `// Best-effort` | `lib/page-controller.js:41-45` |
| :2459-2460 type alignment "`date` → three-part widget" | date renders as a single text input; `govukDateInput` is imported and switched on but never reached | `lib/field-widgets.js:271-293` vs `shared/partials/fields.njk:9,23` |
| :2075 "**Cosmetic renames are safe.**" | renaming a multi-valued obligation silently changes widget AND stored value shape | `lib/field-widgets.js:56-62` + `contract.js:331-335` |
| inventory "31 pages (… + 1 read-only intro)" | the intro page has no route | `routes.js:189` `if (!hasPresents) continue` |

The doc is honest about most of its gaps (`NEXT.md` has a long known-limitations register); these five are cases where a *capability* is written in the present tense and the code does not do it. That matters for this comparison because the change-link round-trip is one of the two things the brief asks about.

---

## 5. TESTS in this dimension

| file | LOC | what it pins |
|---|---|---|
| `lib/field-widgets.test.js` | 134 | **8 cases** — one per rule + label-miss fallback + errorMessage injection. Tests `pickWidget` on synthetic entries, so it is decoupled from the V4 manifest. |
| `lib/build-field-descriptors.test.js` | 106 | descriptor assembly, scope filtering |
| `lib/format-domain-errors.test.js` | 119 | error text + anchor computation |
| `i18n-coverage.test.js` | 221 | every declarative message key resolves (see L6 for the drift) |
| `routes.test.js` | 1011 | the only CYA coverage — via `server.inject` + string assertions on the rendered payload (`:613-857`: address-completeness prompt, group-invariant prompt, accompanying-doc all-or-nothing prompts, a filled row) |
| `features/commodity-lines/controller.test.js` | 81 | `LINE_PAGES` derivation |

**There is no unit test for the CYA controller and no test for `formatSingle`.** There is no test asserting a Change link, once followed and saved, returns the user to CYA — which is consistent with the feature not existing. There is no test that `OBLIGATION_MULTI`'s three names resolve to real obligations.

---

## 6. RETROFIT COST — what a third option would pay to take these

| idea | cost to port | note |
|---|---|---|
| **Ordered first-match widget-rule table** (`field-widgets.js` + `fields.njk`) | ~400 LOC, self-contained, depends only on a `{type, labels, subFields}` entry shape | the strongest thing here. Requires the target to have a field-type concept the rules can read. |
| **Composite `addressBlock` domain entry → 10-input widget + per-sub-field errors + `isComplete`** | ~150 LOC across `domain/index.js` `addressBlock` factory, the address rule, `format-domain-errors.js` sub-field anchors, and `isSufficientForProceed` | 82 of 113 inputs come from this. High leverage. But it drags in the "interpretation A" semantic (blank sub-fields don't error at save; incompleteness surfaces at CYA) — that is a *product* decision, not just code. |
| **Message-key copy manifest + `i18n-coverage.test.js`** | ~300 LOC + a locales file | cheap, high value; but fix L6 (auto-walk the controllers, don't hand-list keys) before porting. |
| **`t()` vs `tOrNull()` split** (`lib/i18n.js:47-67`) | 20 LOC | genuinely nice: `t()` renders the dotted path on a miss (visible failure), `tOrNull()` returns null so enum labels fall back to the raw code rather than shipping `domain.country.FR` to a user. |
| **CYA controller** | do **not** port as-is — 351 LOC with an unimplemented round-trip, manifest-ordered rows, and one of three duplicate formatters | port the *idea* (walk `state.obligations`, prompts for blanks, `isComplete` for composites), write the formatter once. |

**What Side B's presentation layer would have to import from elsewhere to be production-shaped:** a change-mode round-trip, a formatter layer, a `multi` type in the domain alphabet, an autocomplete component (and therefore any client JS at all), Welsh threading, and a single page-controller factory that is parameterised by depth rather than triplicated.
