# L1 — Presentation, widget derivation and check-your-answers — SIDE A (live-animals)

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

## Headline

**There is no widget derivation on side A. None. It is not partial — it is architecturally excluded, deliberately, and documented as such.** An obligation carries no `type`, no `label`, no `hint`, no options list and no widget hint. Every radio, checkbox, select, date input, file upload and text input is hand-written as a `govuk*` Nunjucks macro call in a per-feature `.njk`. Check-your-answers is 495 lines of hand-composed JavaScript building 33 row objects.

What side A *does* derive from the model, and derives well, is a **different** slice of presentation than the one this dimension usually means:

- **Change-link targets on CYA are fully derived** through the dispatch index (`pageOfObligation(id) → slug`), so no CYA row ever hardcodes a page slug. Round-trip is E2E-proven, including through collection loops and PRG cycles.
- **The hub task-list is fully derived** — status tag, link target and "Cannot start yet" all come from the engine's five-status roll-up + derived gates. Copy (titles/hints) is a hand-authored literal; everything dynamic is derived.

And the sharpest negative finding: **the CYA controller never asks the engine for scope.** It re-implements, by hand, seven of the same conditionality decisions the model already expresses in `activatedBy`. It doesn't even destructure `scope` from `state.get`.

---

## 1. Widget derivation — ABSENT (structurally, by design)

### 1.1 The obligation carries zero presentation

`features/origin/obligations.js:1-26` is the whole model for a page that renders a select-with-autocomplete, a radio group with a conditional reveal, and two text inputs:

```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}
export const internalReferenceNumber = { id: 'internalReferenceNumber' }
```

A grep for `type:` / `label:` / `hint:` across all 12 `features/*/obligations.js` files returns **nothing**. The at-most-11-key vocabulary (`docs/obligation-model.md:36`) is: `id, required, requiredAtLeastOne, requiredOneOf, collection, item, system, renderOnly, activatedBy, wipeOnExit, maxEntriesFrom` (+`enforcedAt`). Not one of them is presentational.

This is explicit, not accidental. `docs/architecture.md:202-205`:

> "**The obligation `type` taxonomy and constraint metadata.** A usage trace showed no runtime code read them — every widget and value-domain was already re-declared page-side."

and `docs/architecture.md:209-212`:

> "There is no free rendering and no free Check your answers row."

**Classification: ABSENT — deliberately.** Verified against code, not just docs. This is a *design choice with a stated rationale*, and it is the exact axis on which side B is expected to win. It is also **structural**: the engine (`engine/`, 12 files, ~750 LOC) contains no rendering code path at all; there is no view-model producer, no field descriptor, no registry. Adding widget derivation means adding a layer that does not exist, not extending one that does.

### 1.2 Every widget is a hand-written macro call

32 `.njk`, 1,499 LOC. 145 `govuk*` macro invocations counted across them (import + call sites). Widget spread actually in use:

| Widget | Macro | Templates using it |
|---|---|---|
| radios | `govukRadios` | 7 (import-purpose, contact, transporters, transporters-select, additional-details, import-reason, import-type-filter, origin, address-picker) |
| text input | `govukInput` | 9 |
| select | `govukSelect` | 6 |
| checkboxes | `govukCheckboxes` | 2 (commodities/search, declaration) |
| date | `govukDateInput` | 2 (port-of-entry, documents) |
| file upload | `govukFileUpload` | 1 (documents) |
| summary list | `govukSummaryList` | 5 |
| table | `govukTable` | 4 |
| task list | `govukTaskList` | 1 (hub) |

Example — `features/origin/template.njk:15-45`. The `govukSelect` for `countryOfOrigin`, the `govukRadios` for `regionOfOriginCodeRequirement` with a nested `conditional: { html: regionCodeHtml }`, and the `govukInput` for `regionOfOriginCode` — all authored by hand, with the label, the hint text ("For example, FR-75") and the width class (`govuk-input--width-5`) inline in the markup.

### 1.3 The condition is expressed TWICE

The model says `regionOfOriginCode` is `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` (`features/origin/obligations.js:15`). The template independently says:

```njk
{ value: "yes", text: "Yes", checked: values.regionOfOriginCodeRequirement == "yes",
  conditional: { html: regionCodeHtml } },
```
— `features/origin/template.njk:42`

Nothing connects them. The engine's `reconcile` will wipe `regionOfOriginCode` when the radio goes to `no` (that part *is* derived), but the *reveal markup* is a hand-restatement of the same predicate. The docs are honest about this — `docs/add-a-field.md:213-215`: "The model owns scope and wipe; the page owns how the reveal looks."

**This is exactly one govuk `conditional:` reveal in the entire codebase** (grep for `conditional:` across `features/` → 1 hit). Every other conditional field is either a separate page (gated by the derived flow gate) or a `showX` boolean the controller computes.

### 1.4 Templates never see the model, and never see scope

`grep -rn --include="*.njk" "scope"` → 6 hits, all of them the HTML attribute `scope="col"` / `scope="row"` in `features/dashboard/template.njk`. **No template reads the engine's scope.** Templates receive only a flat, controller-shaped view model (`values`, `errors`, `items`, `cards`, `groups`). Logic in templates is minimal — the largest logic is loops over pre-built arrays.

The one exception, and it's the closest thing on side A to a widget dispatch:

```njk
{% for field in card.addressFields %}
  {% if field.kind == "select" %}
    {{ govukSelect({...}) }}
  {% else %}
    {{ govukInput({...}) }}
```
— `features/commodities/_identification-card.njk:38-59`

A **two-way** kind switch over field descriptors that `animal-identification.controller.js:272-319` builds by hand (`kind: 'input'` / `kind: 'select'`, plus `autocomplete`, `classes`, `type` attributes hardcoded per field). This is a hand-rolled micro-widget-registry for exactly one partial. It is *not* driven by the obligation model — `addressFieldsFor` names the nine address fields as literals in a fixed order.

**Classification: HANDLED IMPERATIVELY, per case, ~145 call sites.**

### 1.5 Progressive enhancement is a per-template opt-in

Autocomplete on long selects is enabled by adding `attributes: { "data-select-autocomplete": "" }` to a `govukSelect` plus a `{% block bodyEnd %}` script tag — 3 templates do it (`origin/template.njk:22,63`, `transport/port-of-entry.njk:26,67`, `transport/transit-countries.njk:26,34,54`). The client bundle lives outside the prototype in the host app (`src/client/javascripts/select-autocomplete.js:5`, webpack entry). Nothing in the model says "this field is a long list, autocomplete it."

---

## 2. Check-your-answers — HANDLED IMPERATIVELY (with one derived seam)

`features/check-answers/controller.js` — **495 LOC**, 29 unit test cases (`check-answers.test.js`), the second-largest file in the prototype after `animal-identification.controller.js`.

### 2.1 What is hand-composed

`buildSections(answers)` (`:431-473`) is a literal tree: 4 sections → groups → cards → rows. Counted **33 row constructions** (`row(` / `readOnlyRow(` / `partyRow(`). Each carries its own English key text:

```js
row('Country of origin', countries.originLabel(answers.countryOfOrigin) ?? '', 'countryOfOrigin'),
```
— `features/check-answers/controller.js:101-105`

Card composition, section headings ("1. About the consignment"), row order, visually-hidden change text, HTML escaping (`escapeHtml`, `:38-45`, hand-rolled), address line joining (`addressLines`, `:61-69`) — all bespoke. `docs/add-a-field.md:100-114` confirms: adding a field means adding one `row(...)` by hand.

### 2.2 What IS derived — the change-link target (the good bit)

```js
const changeHref = (obligationId) =>
  withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))
```
— `features/check-answers/controller.js:30-31`

`pageOfObligation` is the boot-built inverted index from every page's `collects` declaration (`flow/dispatch.js:69-70`), and `ownerOfObligation` (`:15-24`) strips instance indices so a depth-1/depth-2 obligation resolves to the page owning its nearest collection ancestor. **No CYA row hardcodes a slug.** This is a genuine model→presentation derivation and it is the single most reusable idea in this dimension on side A. Cost of adoption: you need a `collects` declaration per page and a boot-time coverage assert — that's ~74 LOC (`flow/dispatch.js`) plus the discipline.

Change context round-trips via `?change=1` (`shared/kit.js:47-54`): `exitTarget` sends the page back to the CYA slug instead of the next-in-section. **E2E-proven**, including the hard cases — the collection loops preserve the context across PRG cycles (`prototypes/e2e/live-animals.spec.js:2537-2591`: Change → identification surface → `change=1` → Save-and-add-another → still `change=1` → Save-and-finish → back on CYA with the new unit rendered; same for the documents loop, including across the "Refresh virus scan status" affordance).

Two exceptions where the derivation is bypassed and a page is named directly: the species-card change links (`:226`, `:235-241`) hardcode `consignmentDetailsPage.slug` and `animalIdentificationPage.slug` + an `#identification-card-{i}` fragment. Reasonable (the entry doesn't correspond to a single obligation id) but it is a hand-wire.

### 2.3 The sharp finding — CYA re-implements the model's conditionality, seven times

`get` at `:485-488` destructures **only** `{ journey }` from `state.get`. It never takes `scope`. So every "should this row appear?" decision is a hand-written predicate that duplicates an `activatedBy` literal the model already holds:

| CYA row | Hand-coded predicate | The model already says |
|---|---|---|
| Region of origin code | `answers.regionOfOriginCodeRequirement === 'yes'` (`:111`) | `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` |
| Includes unweaned animals | `unweanedApplies(answers)` (`:136`, defined `additional-details/controller.js:13-18`) | `anyItem` gate over `commodityLines[].commoditySelection` |
| Purpose in the market | `answers.reasonForImport === 'internalMarket'` (`:150`) | `activatedBy: { equals: 'internalMarket' }` |
| Number of packages | `packagesApply(entry.commoditySelection)` (`:253`) | item-level `includes` gate on `numberOfPackages` |
| Transit countries | `transportReference.overlandMeans().includes(answers.meansOfTransport)` (`:275`) | `activatedBy: { includes: [...] }` on `transitedCountries` |
| Transporter branch | `activeTransporter()` equals-checks on `'Commercial'`/`'Private'` (`:300-308`) | two `equals`-gated obligations |
| CPH number | `cphApplies(answers)` (`:376`, defined `cph-number/controller.js:12-17`) | `anyItem` gate |

The engine can answer all seven. `engine/read.js:27-35` exposes `has: (id) => inScope.has(id)` over a `Set` of **instance path keys** (`engine/evaluate/reconcile.js:9-30` + `pathKey`), so `scope.has('countyParishHoldingCph')` and `scope.has('commodityLines[0].numberOfPackages')` would both work today.

**This is a `structural=false` limitation** — the derivation is available and unused. Closing it is a ~1-day refactor of `check-answers/controller.js` and would delete the four exported helper predicates (`unweanedApplies`, `cphApplies`, `packagesApply`, and the inline equals-checks). Note the drift risk is live and real: change an `activatedBy` in the model and the CYA silently keeps showing/hiding on the stale rule. Nothing catches it — `contract.test.js` covers commit-vs-`collects`, not CYA row visibility.

Exactly **one** controller in the entire codebase asks scope for field visibility: `features/additional-details/controller.js:61,67` — `const showUnweaned = scope.has('containsUnweanedAnimals')`, and it uses it for both render *and* the validation schema *and* the commit set. It is the proof that the pattern works; it is used once.

### 2.4 Doc/code disagreements found (both are docs lagging the code)

- `docs/limits.md:58` claims: *"Check your answers is deliberately shallow at depth: it composes one row per collection entry (Commodity N, Document N), but shows no per-entry field detail"*. **This is false in the current code.** `speciesCards` (`check-answers/controller.js:214-259`) builds a full summary card per commodity line with commodity code, common name, species, animal count, conditional package count, **and** a per-line `govukTable` of every animal identifier with dynamically-selected columns (`identifierColumns`, `:185-192`, includes a column only if some unit has a value for it). `documentsCard` (`:400-429`) does the same for documents. The doc predates M3.
- `docs/limits.md:74` says adding a field is *"three edits"*; `docs/add-a-field.md:16` says *"Adding a field touches five places"* (obligations, controller schema, controller GET/POST, template, CYA row — plus the contract-test payload named by a failing test). **Five is the accurate number** (six if you count the test payload). The limits ledger undercounts by omitting the CYA row and the contract-test line — i.e. it undercounts precisely the presentation cost.

---

## 3. Display-value / formatter layer — PARTIAL, and it lives in `services/`, not in the model

There is a real code→label layer, but it is scattered one function per service, hand-called from the CYA and from controllers:

- `services/countries/index.js:13` — `originLabel(code)`
- `services/commodities/index.js:25` — `speciesLabel(code)`
- `services/ports/index.js:14` — `label(code)`
- `services/import-reason-purpose/index.js:12,20` — `reasonLabel`, `purposeLabel`
- `services/certification-purposes/index.js:11` — `certificationLabel`
- `features/commodities/animal-identification.controller.js:23-30` — `IDENTIFIER_LABELS`, a hardcoded map, imported *by the CYA* (`check-answers/controller.js:15`) to build the identifier table columns.

Type-shaped formatters live in the CYA itself: `dateText` (`:35-36`, `d/m/y` join), `valueText` (`:33`, blank → `'Not provided'`), `YES_NO_LABEL` (`:26`), `escapeHtml` (`:38-45`). There is **no generic formatter registry keyed on a field type** — because there is no field type.

**Classification: PARTIAL — real, working, hand-wired per value domain, no registry, no type key to hang it off.**

---

## 4. Where the model→presentation seam DOES work: the hub

`features/hub/controller.js` is the counter-example worth stealing. The dynamic half is entirely derived:

- `rowStatus(row, answers, scope.inScope)` (`:155`) → the engine's five-status roll-up (`engine/status.js`)
- `STATUS_TAG` (`:120-129`) maps `FULFILLED/OPTIONAL/IN_PROGRESS/NOT_STARTED` → GDS tag objects — a 10-line mapping, the *only* place the status vocabulary meets GDS presentation
- `rowGatePasses(row, scope)` (`:158`) → grey `Cannot start yet` text with no link, derived from the flow's derived gates
- `rowEntry(row, scope)` (`:161`) → the link target, derived
- `if (row.conditional && status === NA) return null` (`:156`) → a whole row disappears from the task list, derived
- collection FACET rows (`flow/task-rows.js`) split one stored collection across two hub rows — a presentation concern solved *in the model layer's status vocabulary* rather than by moving data

The static half — `GROUPS` (`:21-118`, ~100 LOC) — is a hand-authored literal of six group captions and eleven row titles + hints. Copy is code.

**Classification: status/link/gating MODELLED DECLARATIVELY (derived); copy HANDLED IMPERATIVELY.**

---

## 5. Retrofit cost — what it would take to give side A widget derivation

Adding a type-to-widget layer to side A means **building a layer that does not exist**, and the codebase actively argues against it:

1. Add a presentational key set to the obligation (`type`, `label`, `hint`, `options`). This breaks the stated purity contract — `obligation-purity.js:1-46` text-scans every `obligations.js` and rejects any import that is not another `obligations.js`, so options lists sourced from `services/` (countries, ports, commodities — all of them today) **cannot be imported into the model**. Either the purity guard goes, or option sources must be injected. That guard is a boot assert; changing it is a deliberate architectural reversal, not a tweak.
2. Build the renderer: a `page.njk` + widget registry + view-model producer. ~0 LOC exist today.
3. Then re-do 20 pages. But `docs/decisions.md:19` records that v1 *had* a generic renderer and it "failed on every page that mattered" — the commodities loop, CYA, the declaration, the hub all bypassed it. Side A's bespoke pages (search with round-trip checkboxes, the counter-driven identification card, the consignment-details count-drop block, the address picker) are the pages that would bypass it again.

The honest read: side A's boring pages (origin, import-reason, contact, cph, declaration, import-purpose — maybe 8 of 20) would take a generic renderer fine. The interesting 12 would not. That is the same conclusion side A reached and *chose to act on by deleting the renderer*.

**Conversely, the two things side A has that are cheap to lift into a third option:**
- the `collects` → inverted dispatch index → `pageOfObligation` change-link derivation (~74 LOC + a boot coverage assert). Zero coupling to how pages render.
- the status-roll-up → GDS task-list tag mapping with facets and derived gates (~10 LOC of mapping over `engine/status.js` + `flow/task-rows.js`). Also render-agnostic.

Both are *orthogonal to widget derivation* — they'd sit happily on top of a config-driven renderer.

---

## 6. Quantified summary

| Metric | Value |
|---|---|
| `.njk` templates / LOC | 32 / 1,499 |
| `govuk*` macro invocations across templates | 145 (import + call sites) |
| Distinct widget types in use | 9 (radios, input, select, checkboxes, date, file upload, summary-list, table, task-list) |
| Widgets derived from the model | **0** |
| Presentational keys on an obligation | **0** of 11 (+`enforcedAt`) |
| Templates reading engine scope | **0** |
| govuk `conditional:` reveals in the codebase | **1** (`origin/template.njk:42`) |
| Controllers using `scope.has()` for field visibility | **1** of 22 (`additional-details/controller.js:61`) |
| CYA controller LOC / unit test cases | 495 / 29 |
| CYA hand-composed rows | 33 |
| CYA conditional-row predicates hand-restated from `activatedBy` | 7 |
| CYA change-links derived via dispatch index | yes — `pageOfObligation` (2 hardcoded exceptions, both collection cards) |
| CYA change-link round-trip E2E coverage | yes — `prototypes/e2e/live-animals.spec.js:2537-2591` |
| Display-value/formatter functions | 6 service-level `*Label()` + 4 CYA-local formatters; no registry |
| i18n / locales | **none** — copy is hardcoded English in `.njk` and in controller literals |
| Places touched to add a field | 5 (+1 test payload) — `docs/add-a-field.md:16` |
