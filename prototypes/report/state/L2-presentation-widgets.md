# L2 — Presentation, widget derivation and check-your-answers

**Verdict: B-better — and it is the MODEL that wins, not the build.**

A is further along and has more features. On this dimension that buys it almost nothing. Strip the build-loop breadth away and score the models, and B carries a value domain that A's obligation vocabulary has no slot for. Everything A does better on this dimension is *unbuilt* on B, not *impossible* on B. The reverse is not true.

---

## 1. Rationale

### 1.1 The core axis — widget derivation — is a clean B win, and it is structural

A's obligation vocabulary is 11 keys (`id, required, requiredAtLeastOne, requiredOneOf, collection, item, system, renderOnly, activatedBy, wipeOnExit, maxEntriesFrom` + `enforcedAt`). **Not one is presentational.** A grep for `type:` / `label:` / `hint:` / `options:` / `widget:` across all 12 `features/*/obligations.js` returns **nothing**. This is not an oversight — `docs/architecture.md:192-205` records that the obligation `type` taxonomy *was deleted* from v1 because "every widget and value-domain was already re-declared page-side", and `docs/decisions.md:19` records that v1's generic renderer "failed on every page that mattered".

The consequence, measured:

| | A (live-animals) | B (flow-layer) |
|---|---|---|
| Templates / LOC | **32 / 1,499** | **8 / 299** |
| Pages served | ~20 | 31 (30 via one 27-LOC `page.njk`) |
| `govuk*` macro call sites | ~145, hand-authored | **1 dispatch macro** (`fields.njk:15-44`) |
| Places a widget is chosen | ~145 | **1** (`build-field-descriptors.js:84`) |
| Widgets derived from the model | **0** | 7 ordered rules, first-match-wins |

B's `pickWidget` (`lib/field-widgets.js:337-343`) reads the Domain entry's `type` and the *state-resolved* option count — `RADIO_MAX = 5` (`:64`), `options.length > RADIO_MAX` (`:117`, `:152`) — so radios-vs-select is decided at render time from live state, not statically declared. That is genuine derivation, verified in source.

### 1.2 The knockout: A's code already contains a hand-rolled, degenerate copy of B's best mechanism

B's `addressBlock` factory (`domain/index.js:197-281`) declares `subFields`, `required`, `subFieldRules` and an `isComplete()` closure. The address rule (`field-widgets.js:179-269`) reads those and emits one `govukSelect` per enum sub-field and one `govukInput` otherwise, wrapping them in a fieldset, with per-sub-field error anchors (`#obligation__subField`, `:219`) that land error-summary links on the exact missing input. **82 of ~113 rendered inputs in the whole spike come from 9 declarations.**

A does the *same job* by hand, once, locally: `features/commodities/animal-identification.controller.js:272-319` builds the nine address fields as a literal descriptor array with hardcoded `kind: 'input'` / `kind: 'select'`, autocomplete attributes and classes, consumed by a **two-way `kind` switch** in `_identification-card.njk:38-59`. That is a hand-rolled, single-use, untyped micro-widget-registry — i.e. A independently reinvented B's abstraction, worse, in one corner of the app. Meanwhile A's model declares the whole thing as one opaque id: `permanentAddress = { id: 'permanentAddress', required: true, activatedBy: …, wipeOnExit: true }` (`features/commodities/obligations.js:80-85`) — **no sub-field structure at all**. A's other address surfaces are hand-written templates: `_address-picker.njk` (119 LOC), `create-address.njk` (95 LOC).

This is the single most direct evidence that B's abstraction is the right one.

### 1.3 i18n — B wins outright, and this one has statutory teeth

A has **no copy layer whatsoever**: zero `locales/` files, no translation helper. All copy is hardcoded English in 32 `.njk` files and in controller literals (`features/hub/controller.js:21-118` GROUPS; `features/check-answers/controller.js:98-473`, 33 row keys). B has a 40-entry message-key manifest (`lib/presentation.js:69-385`), 362 keys in `locales/en.json`, a `t()`/`tOrNull()` split (`lib/i18n.js:47-67`) where `t()` renders the raw dotted path on a miss (visible failure) and `tOrNull()` falls back to the raw code rather than shipping `domain.country.FR` to a user, plus an `i18n-coverage.test.js` anti-rot gate.

Welsh is a statutory requirement for a DEFRA public service. A's retrofit touches every template and several controllers. This is not a footnote.

### 1.4 A's counter-evidence (the deleted renderer) does not refute B — but it does bound B's claim

A's recorded rationale for deleting the generic renderer is that it "failed on every page that mattered". The honest reading is that A drew the wrong conclusion: *the renderer failed on the 12 hard pages, therefore delete it* — instead of *keep it for the 8 easy pages, hand-write the 12*. **B's own architecture is exactly that hybrid**: `shared/page.njk` drives 30 form pages, and four bespoke feature templates (`hub`, `check-your-answers`, `commodity-lines/list`, `units/list`) sit alongside it. B proves the hybrid works.

**But B's renderer has never met A's hard pages, and that caveat is load-bearing.** B emits **5** FieldViewItem types; A uses **9** distinct widget types. B has **no file-upload rule** (A has cdp-uploader with virus-scan polling), no table, no summary-list, no task-list widget, no search-and-select surface, no address picker, and **zero client-side JS** — `govukDateInput` and `govukTextarea` are imported and switched on in `fields.njk:8-9,23-25` but **no rule ever emits them** (dead branches; the date rule returns `type: 'input'`, `field-widgets.js:279`). B renders 26 raw checkboxes for transited countries and a bare `<select>` for 25 countries of origin, with no autocomplete.

So B's derivation is validated against the *easy half* of the real page population. A third option must assume the rule table needs an escape hatch, and B has not proven one.

### 1.5 Where A genuinely wins — all of it retrofittable into B, hence none of it `aOnly`

**(a) The CYA change-link round-trip. A has it; B's is documentation fiction.**
`obligations.md:2338` documents a `?change=1` change-mode returning the user to CYA on save. **A grep for `change=1|query.change|changeMode|returnTo|referrer` across B's entire spike returns exactly ONE hit — that doc line.** No code implements it. `lib/page-controller.js:90-93` unconditionally advances via `nextAfter()`. The stub is visible: `urlForNext(target, opts)` accepts `opts.query` (`:27-30`) and no caller ever passes it. Clicking Change on B's CYA, editing and saving dumps the user into the next unfulfilled page — losing their place.

A's works and is proven at three levels: `shared/kit.js:47-54` (`exitTarget`, `withChangeContext`), unit tests (`shared/change-context.test.js`, 8+ assertions covering collection loops and PRG redirects), and E2E (`prototypes/e2e/live-animals.spec.js:2543-2584` — Change → identification surface → `change=1` survives Save-and-add-another → Save-and-finish → back on CYA).

This is half of what the dimension is *named after*, and B does not have it.

**(b) Fail-fast totality vs silent degradation.**
A's `buildDispatch` (`flow/dispatch.js:41-65`) inverts every page's `collects` declaration at boot and **throws** if an obligation is collected by two pages (`:45-50`) or by no page (`:55-63`, excluding `system`). B's `firstPagePresentingObligation` returns `null` for an unpresented obligation (`engine/index.test.js:903`), and `hrefForChange` returns `null` (`check-your-answers/controller.js:117`) — **a CYA row silently loses its Change link.** B's `coverage.test.js` asserts obligation→*domain* wiring and id/name uniqueness, but **never** obligation→*page* presentation totality.

**(c) A's CYA renders per-entry depth-2 detail** — per-species summary cards with a dynamic-column identifier table (a column appears only if some unit has a value, `check-answers/controller.js:185-192`). Note `docs/limits.md:58` claims the opposite; the doc is stale.

### 1.6 Where BOTH are bad — and B's irony

Neither side has a display-value/formatter layer. A: 6 service-level `*Label()` functions + 4 CYA-local formatters, **no registry, no type key to hang one off** — because no field type exists. B: **three near-duplicate formatters at three capability levels** — `cya formatSingle` (42 LOC, address-capable), `units labelFor` (37 LOC, copy-paste including the same `2nd-code-review #12` comment), `commodity-lines labelFor` (13 LOC, **cannot render an address** — `String(resolve(value))` emits `[object Object]`, with no test to catch it). No unit test for any of the three; no unit test for B's CYA controller at all.

The irony: **B has a type system and still didn't key a formatter off it.** Having the abstraction and not using it is a weaker excuse than A's (not having it). Call this a tie, and put "build the formatter once, keyed on domain type" on the shopping list.

### 1.7 B's sharpest defect — and it is a MODEL defect

Value multiplicity (scalar vs array) is **not in B's model**. The Domain type alphabet is `{enum, integer, string, date, address}` — no `multi` flag. Instead it is a hard-coded 3-name `Set` **in the presentation layer**, keyed on `obligation.name`: `OBLIGATION_MULTI = new Set(['transitedCountries','species','animalsCertifiedFor'])` (`field-widgets.js:56-62`) — and `obligations.md:2075` declares names renameable ("Cosmetic renames are safe").

They are not safe. **Verified in source:** `contract.js:331-335` coerces a value to an array **only when `descriptor.widget === 'checkboxes'`**. So a *rendering* decision decides the *persisted type*. Rename `species` → `speciesList` and: the Set misses → the checkboxes rule stops firing → the radios rule fires (species options are commodity-code-derived and can be ≤5) → **the stored fulfilment silently changes shape from `['bovine']` to `'bovine'`**. No test catches it. A does not have this class of bug because A never derives anything from the widget.

Fix is ~15 LOC + a `multi` field on the domain entry shape — cheap, but it is a *model* change.

### 1.8 A correction to the Layer-1 A read (material)

L1-A claims A's obligation-purity guard "actively FORBIDS an obligations.js importing anything but another obligations.js, so a service-sourced options list cannot live in the model", and rests A's "structural" resistance to widget derivation on it. **This is false.** `obligation-purity.js:13-17` explicitly *permits* reference-service imports:

```js
export const isReferenceServiceImport = (specifier) =>
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)
```

and **three `obligations.js` files already import `services/commodities/index.js`** today (`commodities/`, `cph-number/`, `additional-details/`) — using it for predicate data (`commodities.cphCommodities()`). An obligation carrying `options: commodities.speciesOptions()` would pass the guard **today, unchanged**.

A's real blocker is narrower and simpler: **there is no descriptor/renderer/view-model layer at all (0 LOC)**, plus a recorded decision not to have one. That makes A's retrofit *cheaper* than L1-A claimed, and it removes A's strongest "we couldn't even if we wanted to" defence.

### 1.9 The prior, tested

The standing prior was that B's model is better. I tried hard to refute it. My best candidate for a structural A-only win was **per-record conditionality**: A's `scope` is a `Set` of *instance path keys* (`commodityLines[0].numberOfPackages`, `engine/read.js:31`), so it can say a field is in scope for line 1 (a horse) but not line 2 (a cow). B's `isInScope` is memoised **per `obligation.id`** with no record argument (`evaluator.js:305-321`), and the `field` category hands *every* record of the parent group the *same* status (`evaluator.js:469-479`) — which looked like a genuine structural gap.

**It is not.** B expresses per-record conditionality through a different and arguably more principled mechanism: `applyTo: allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, [passportReason])` (`obligations/obligations.js:631-639`) — a *derived-leaf* whose record **set** is computed by the applyTo predicate, projected onto depth-2 unit instance paths. `numberOfPackages` does the same at depth 1 (`:469-477`). B's version additionally carries a **reason code** per applicability decision (`obligation.passport.applicable.becausePassportCommodity`) that A has no equivalent for.

The prior survives. `aOnly` is empty, and that is the finding.

---

## 2. Bottom line for the third option

Take from **B**: the ordered widget-rule table (~400 LOC, self-contained), the `addressBlock` composite (~150 LOC — highest leverage single item), the message-key i18n manifest + `t()`/`tOrNull()` + coverage gate, the domain-error → anchored error-summary layer, and CYA row-set derivation from the evaluator.

Take from **A**: the `collects` → boot-inverted dispatch index with totality + uniqueness asserts, the `?change=1` round-trip threaded through collection loops and PRG cycles, and the five-status roll-up with collection facets.

Build once, new: **the display-value formatter, keyed on the domain type** — neither side has it, and both are quietly broken without it. Add `multi` to the domain alphabet before anything else touches persistence.
