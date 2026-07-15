# L1 — i18n, copy and content model — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root:  `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
Ancestor `prototypes/model-spikes/obligations-v4-model/` has **no i18n layer and no browser layer at all** — the only hit for "i18n" in that tree is prose inside its own `obligations.md`. Everything below is fork-only.

---

## Headline

Side B has a **real, deliberately-designed i18n layer**, not a gesture at one. Every user-facing string in the spike lives in one JSON file (`locales/en.json`, **362 leaf keys**, 584 lines). The **model layer emits no English at all** — obligations, evaluator, engine and domain all emit *coded* records (`code: 'domain.string.maxLength'`, `errorCode: 'obligation.unitRecord.identifiersRequired'`), and the English is bolted on at the browser seam. The **8 Nunjucks templates contain literally zero hardcoded copy** — every string arrives pre-resolved in the view context. A build-time coverage test (`i18n-coverage.test.js`, 221 LOC) fails when a declaration-site key is missing from `en.json`.

That is a genuinely strong position and it is the single most transferable thing on this dimension.

It is **not, however, "complete"**, and the docs overstate it in two specific places. There is no `cy.json`, no locale threading, no pluralisation, and — the finding that actually matters — **the coverage gate is a hand-maintained list for controller-authored keys, and it has already drifted (18 keys used in code but not gated), and there are 4 surviving hardcoded English fragments in JS, one of which is on the Check-your-answers critical path.**

**Classification: MODELLED DECLARATIVELY for the declaration sites (flow / presentation / domain / format-errors). HANDLED IMPERATIVELY for controller chrome. PARTIAL on the enforcement gate. ABSENT for Welsh, pluralisation, and content-versioning.**

---

## The i18n stack (7 files, 1,619 LOC incl. tests)

| File | LOC | Role |
|---|---|---|
| `lib/i18n.js` | 82 | `t()` / `tOrNull()` / `hasKey()` — dotted-path lookup + `{name}` interpolation |
| `locales/en.json` | 584 (362 keys) | every user-facing string |
| `lib/presentation.js` | 433 | per-obligation `{pageTitleKey, legendKey, hintKey?}` registry (40 entries) |
| `lib/chrome.js` | 51 | layout chrome bag (10 keys) spread into every view context |
| `lib/format-domain-errors.js` | 158 | domain error `code` → message key + params |
| `i18n-coverage.test.js` | 221 | the build-time gate |
| `lib/i18n.test.js` | 90 | resolver + interpolator semantics (13 cases) |

---

## MECHANISM 1 — `t()`: dotted-path resolver with a *visible-failure* miss policy (DECLARATIVE)

`lib/i18n.js:47-53`:

```js
export function t(key, params) {
  if (key === null || key === undefined) return key
  const value = lookup(key)
  if (value === undefined) return key       // <-- miss renders the dotted path
  if (params) return interpolate(value, params)
  return value
}
```

A missing key renders `flow.section.origin.title` **in the browser**. That is a deliberate design choice, documented at `lib/i18n.js:10-15` ("an obviously-wrong dotted path — a visible signal to the reviewer"). The complementary `tOrNull()` (`:61-67`) returns `null` on a miss so callers with an honest fallback (`tOrNull(labels?.[v]) ?? v` — render the raw code, not a dotted path) can use `??`. Both variants are pinned by `lib/i18n.test.js` (13 cases, including the `t` vs `tOrNull` miss-behaviour distinction at `:59-63`).

`en.json` is loaded **once at module init** via `readFileSync` (`lib/i18n.js:24-27`), with the comment that this avoids "the JSON import-attributes syntax that this repo's ESLint config doesn't yet parse." One consequence: **`t()` has no locale parameter and there is no request in scope.** See Limitation 1.

## MECHANISM 2 — Interpolation: `{name}` substitution, params-in-JS (DECLARATIVE, single-form)

`lib/i18n.js:69-75`:

```js
function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    params[name] !== undefined && params[name] !== null
      ? String(params[name])
      : `{${name}}`)
}
```

Same visible-failure policy: a missing param renders `{actual}` in the UI. Pinned at `lib/i18n.test.js:34-40`. **23 of the 362 keys carry placeholders** (`en.json:485-580`), e.g. `"stringMaxLength": "Enter no more than {max} characters (you entered {actual})"`, `"promptGroupInvariant": "Add at least one identifier for animal {unitN} on commodity line {lineN}"`. Placeholders are named, not positional — which is the right call for translation (Welsh word order differs).

## MECHANISM 3 — The model layer speaks CODES, never English (DECLARATIVE — the structural win)

This is the property worth stealing.

- **Domain failure codes** (`domain/index.js:75-125`): a `reasons` registry of 11 entries, each `{ code, explanation }` where `explanation` is explicitly *developer*-facing:
  ```js
  stringMaxLength: {
    code: 'domain.string.maxLength',
    explanation: 'value exceeds the maximum allowed character length'
  },
  ```
- **Group-invariant code** in the manifest (`obligations/obligations.js:592`): `errorCode: 'obligation.unitRecord.identifiersRequired'`.
- **Engine** emits the code and nothing else (`engine/index.js:530-535`): `errors.push({ code: group.requires.errorCode, groupId, groupName, instanceId })`.
- **Enum labels are message KEYS, not literals** (`domain/index.js:413`): `const YES_NO_LABELS = { yes: 'domain.yesNo.yes', no: 'domain.yesNo.no' }` — with the comment "every enum label map holds keys, not literals". Same for `COUNTRY_LABELS`, `SPECIES_LABELS`, `PORT_OF_ENTRY` etc. (26 countries, 18 species, 8 ports, 16 certified-for values, 14 document types — all keyed).

Result: `obligations/evaluator.js` (519 LOC) and `engine/index.js` (601 LOC) contain **zero user-facing strings** — verified by grep for `explanation|message:` across both (no hits). The rationale is written down at `obligations.md:2754-2757`: *"Welsh support is a statutory requirement for Defra services, so inline English literals in evaluator functions were never viable."*

## MECHANISM 4 — Copy is keyed at three declaration sites (DECLARATIVE)

1. **Flow structure** — `flow/flow.js` carries `titleKey` on every section/subsection (22 nodes: 6 + 16), never a literal: `titleKey: 'flow.section.origin-and-reason.title'` (`flow.js:94`). Required-error copy is a key too: `errors: { required: 'errors.regionCode.required' }` (`flow.js:125`). 14 such `errors.required` keys across the flow.
2. **Per-obligation copy** — `lib/presentation.js:69-385`, `OBLIGATION_KEYS`, **40 entries** keyed by obligation *id*, each `{pageTitleKey, legendKey, hintKey?}`. `forObligation()` (`:419-433`) resolves them; if an obligation has no entry, `humaniseId(obligation.name)` (`:401-408`) is the fallback — camelCase → sentence case.
3. **Chrome** — `lib/chrome.js:38-51` returns a resolved bag (service name, phase banner, back link, "Save and continue", error-summary title, select placeholder, page-title suffix). Every render-time controller does `chrome: chrome()`; the layout reads `{{ chrome.* }}`.

## MECHANISM 5 — Templates carry zero copy (DECLARATIVE)

All 8 `.njk` files (299 LOC total) were read. Not one contains a user-facing string literal. `shared/page.njk:5` states the invariant: *"Zero hardcoded copy."* Verified:
- `shared/layout.njk:16-37` — `{{ chrome.pageTitleErrorPrefix }}`, `{{ chrome.serviceName }}`, `{{ chrome.taskListText }}`, `{{ chrome.backText }}` — all from context.
- `shared/partials/error-summary.njk:8` — `titleText: chrome.errorSummaryTitle`.
- `features/hub/template.njk`, `features/check-your-answers/template.njk`, `features/units/list.njk`, `features/commodity-lines/list.njk` — every string is a context variable (`{{ heading }}`, `{{ emptyText }}`, `{{ unit.deleteButtonText }}`).
- `shared/partials/fields.njk` — dispatches on `item.type`; copy already inside `item.args`.

This is a stronger position than "templates use a `t` filter", because it means **the templates cannot leak copy even by accident** — there is no way to author a string there and have it reach the model or the widget layer.

## MECHANISM 6 — `i18n-coverage.test.js`: the build-time gate (PARTIAL — see Limitation 3)

`i18n-coverage.test.js` walks six sources and asserts every key resolves in `en.json`:

| Source | How collected | Gated? |
|---|---|---|
| `flow.js` `titleKey` + `errors.required` | tree walk (`:78-87`) | ✅ automatic |
| `presentation.js` `OBLIGATION_KEYS` / `PAGE_KEYS` | map walk (`:89-101`) | ✅ automatic |
| `domain/index.js` enum `labels` | manifest walk (`:103-113`) | ✅ automatic |
| address sub-field labels | derived from `entry.subFields` (`:115-124`) | ✅ automatic |
| `format-domain-errors.js` | `FORMAT_ERROR_KEYS` export (`format-domain-errors.js:76-90`) | ✅ exported list |
| hub / CYA / commodity-lines controllers | **hand-typed arrays** (`:37-76`) | ⚠️ manual, drifted |

Each block also carries a "collects at least one key (guards against a silent walk regression)" test — a nice touch: it fails if the walker silently stops finding anything.

---

## LIMITATIONS

### L1. No Welsh, no locale threading — `t()` cannot take a locale (structural=false, but load-bearing)

`lib/i18n.js:24-27` loads `en.json` **once, at module scope**, into a module-level `const en`. `lookup()` (`:32-40`) closes over it. There is no `locale` argument anywhere in `t()`, `tOrNull()`, `hasKey()`, `chrome()`, `forObligation()`, `pickWidget()` or any controller. No `cy.json` exists (`find … -name "*.json"` returns exactly 4 files: `en.json` + 3 fixtures).

The spike is honest about this. `NEXT.md:1207-1211`:
> `⏳ Locale threading — reading locale from request headers / session / query param and passing to t(). Currently English only. Approach when picked up: chrome() gains a request argument and passes locale down; t() gains a locale param.`

**structural=false.** The architecture is *right* for Welsh — keys everywhere, no English in the model, named interpolation params, a single load point. The remaining work is genuinely mechanical: add a `locale` param through `t()`, thread `request` into `chrome()` / `forObligation()` / `pickWidget()`, and populate `cy.json`. But it is not free: **`t()` is called from 9 source files** (`contract.js:40`, `features/{check-your-answers,commodity-lines,units,hub}/controller.js`, `lib/{format-domain-errors,line-page-controller,unit-page-controller,chrome,field-widgets,presentation,page-controller}.js`) with **~93 call sites** — and today none of them have a `request` in scope at the point of the call (`presentation.forObligation(obligation)` takes only an obligation; `field-widgets.pickWidget(ctx)` takes no request). Threading locale means changing every one of those signatures or introducing request-scoped context (AsyncLocalStorage / a per-request `t` factory). Call it a day's work, not an hour's.

### L2. Four hardcoded English fragments survive in JS — one is on the CYA critical path (structural=false)

Grep-verified. These are NOT in `en.json` and NOT reachable by the coverage test:

1. **`features/check-your-answers/controller.js:139-151`** — `keyLabelFor()` builds CYA row keys with template literals:
   ```js
   return `${presentation.pageTitle} (animal ${ordinalOfUnitId(state, lineId, unitId)} on commodity line ${ordinalOfLineId(state, lineId)})`
   ...
   return `${presentation.pageTitle} (commodity line ${lineNumber(lineId)})`
   ```
   This string is then used as the CYA **row key**, the **visuallyHiddenText** on the Change link (`:190-192`), *and* interpolated into `t('cya.promptEnterValue', { label })` (`:156`) — so a "translated" prompt reads `Enter a value for Passport number (animal 1 on commodity line 2)` with the English parenthetical baked in. This is the one crack that actually breaks the Welsh story mid-sentence, and it is invisible to the coverage gate because the gate only checks *keys*, never *literals*.
2. **`lib/field-widgets.js:225-227`** — the optional-field suffix:
   ```js
   text: t(`presentation.address.subField.${sub}`) + (optional ? ' (optional)' : ''),
   ```
   Applied to every optional sub-field on all 9 address blocks (~82 rendered address inputs).
3. **`lib/field-widgets.js:287`** — date-widget fallback hint: `hint: hint ? { text: hint } : { text: 'DD/MM/YYYY.' }`.
4. **`lib/presentation.js:401-408`** — `humaniseId()` derives English copy from a camelCase id (`'reasonForImport'` → `'Reason for import'`). This is a *fallback*, and in a fully-wired manifest it never fires — but it is a copy-generation path that is English-only by construction and cannot be translated.

None are structural. All are one-line fixes plus an `en.json` entry. But they are exactly the class of thing that a "we have i18n" claim hides.

### L3. The coverage gate is hand-maintained for controller keys, and has already drifted (structural=false, but the *mechanism* is the flaw)

`i18n-coverage.test.js:31-35` admits it:
> `Static lists of keys used by the hub / CYA / commodity-lines controllers + their templates. Keep in sync with the t() calls in those files.`

The test only checks **key → en.json**. It never checks **code → key list**. So a controller can add a `t('foo.bar')` that is absent from both the list and `en.json`, and the suite stays green while the browser renders `foo.bar`. And it *has* happened. Drift found by comparing `t()` call sites against the arrays:

| Key used in code | Where | In the gate's list? |
|---|---|---|
| `hub.status.optional` | `features/hub/controller.js:37` | ❌ absent from `HUB_KEYS` (`:37-51`) |
| `cya.promptCompleteAddress` | `features/check-your-answers/controller.js:291` | ❌ absent from `CYA_KEYS` (`:53-60`) |
| `cya.promptCompleteAddressForUnit` | `.../controller.js:171` | ❌ absent |
| `cya.promptGroupInvariant` | `.../controller.js:324` | ❌ absent |
| `commodityLines.manageAnimalsButton` | `features/commodity-lines/controller.js:172` | ❌ absent from `COMMODITY_LINES_KEYS` (`:62-76`) |
| **the entire `units.*` bucket (13 keys)** | `features/units/controller.js` (15 `t()` calls: `:139,144,145,157,163,164,244-249,255-261`) | ❌ **no `UNITS_KEYS` array exists at all** |

**18 of 362 keys (5%) are used in code but ungated.** They all happen to exist in `en.json` today, so nothing is broken — but the gate that is supposed to prevent that is not watching them. The declaration-site walks (flow / presentation / domain / format-errors) are automatic and sound; the controller-site list is a manual register that is already 18 entries behind.

There is also **no orphan check** — nothing asserts that every key in `en.json` is *used*. Dead copy accumulates silently.

### L4. No pluralisation, at all (structural=true for the current resolver)

`interpolate()` (`lib/i18n.js:69-75`) does exactly one thing: `String.replace(/\{(\w+)\}/g, …)`. There is no count-aware form selection, no ICU MessageFormat, no `_one`/`_other` key convention. Nothing in `en.json` carries a plural variant. Consequences visible in the shipped copy:
- `"arrayMaxSelections": "Select no more than {max} items (you selected {actual})"` (`en.json:575`) — reads "Select no more than 1 items".
- `"integerMaxDigits": "Enter a whole number with no more than {maxDigits} digits"` (`:573`).

**structural=true against the current resolver**: adding plurals means replacing `interpolate()` with a real message formatter (or adopting `i18next`/ICU), and re-authoring every count-bearing key. It is not a "the build loop didn't get to it" gap — the resolver has no concept of a count. That said, the *blast radius* of swapping the resolver is small (one 82-LOC file behind a 3-function API), so the cost of fixing it is low even though the current design cannot express it. Welsh makes this sharper, not softer: Welsh has more plural categories than English.

### L5. Copy is not versioned, not owned, and not review-gated (structural=false)

All 362 strings are **hand-authored by the spike author**, and the spike says so — `NEXT.md:359-362`:
> `#29 Hand-authored legends + hints — the spec provides field names but not question wording. Legends and hints in locales/en.json are hand-authored. Content design review before implementation.`

There is no content-design source of truth, no link from a key back to a spec clause, and no test that a key's *value* is correct. `docs/testing.md:593-618` (Mutation 16) is candid: changing `'Country of origin'` to `'Country of origin (subtly changed)'` **passes all 385 tests**, and the gap is explicitly deferred as "UX-review territory". So: the *presence* of copy is enforced; the *content* of copy is not enforced at all.

Also note `en.json:396-397` ships two literal placeholders into the UI:
```json
"placeholder-1": "PLACEHOLDER 1 — real values come from MDM",
```

### L6. `humaniseId` and `presentation.js` are English-shaped by construction (structural=false, minor)

`humaniseId` (`lib/presentation.js:401-408`) inserts spaces before capitals and sentence-cases — an English orthographic convention. It is the fallback for any obligation absent from `OBLIGATION_KEYS`. Harmless today (all 40 wired obligations have entries), but it means "add an obligation and forget the copy" degrades to *English-derived* copy rather than a visible failure — the opposite of the `t()` dotted-path policy. Note the inconsistency: the spike chose *visible failure* for missing keys and *silent English guess* for missing presentation entries.

---

## DOC vs CODE — two disagreements found

**1. `obligations.md:2749-2752` claims the failure code *is* the message key. It is not.**
> *"**The code** follows a dot-separated naming convention and doubles as the i18n message key."*

In the implementation there is a **hand-maintained translation table** between the two. `lib/format-domain-errors.js:21-68` maps `'domain.string.maxLength'` → `t('errors.domain.stringMaxLength')`, `'domain.enum.notInOptions'` → one of *two* keys depending on whether `error.options` is populated (`:26-30`). The codes are `domain.*.camelCase`; the keys are `errors.domain.camelCase`. They are similar but **not the same string**, and the mapping is a 12-entry JS object that must be maintained by hand. Worse, `'domain.address.subFieldRequired'` has a `reasons` entry (`domain/index.js:104-107`) and an `en.json` key (`:576`) but **no COPY dispatcher** — a retired path, flagged in a comment at `format-domain-errors.js:49-53`. And the group-invariant code `'obligation.unitRecord.identifiersRequired'` (`obligations.js:592`) has **no `en.json` key at all** — the CYA controller ignores `err.code` entirely and hardcodes `t('cya.promptGroupInvariant')` (`check-your-answers/controller.js:324`). So the code-as-key claim is contradicted in three ways. (The *good* half of the claim survives: the model still emits codes, not English. Only the "doubles as the key" mechanism is aspirational.)

**2. `RECOMMENDATION.md:206-209` — "i18n infrastructure is complete … covering every declaration-site key".**
The qualifier "declaration-site" is doing real work and is *technically accurate* — flow/presentation/domain/format-errors are all covered automatically. But read in context ("infrastructure is complete") it invites the reader to conclude the whole surface is gated. It is not: the entire `units.*` bucket is ungated, and the CYA controller has un-keyed English literals. The disagreement is one of emphasis, not fact — but the emphasis is what a decision-maker will remember.

---

## WHAT TO STEAL, AND WHAT IT COSTS

**Steal (high value, low cost):**
1. **The zero-English-in-the-model rule.** `reasons` registry (`domain/index.js:75-125`) + coded engine errors + enum labels-as-keys. Cost of adopting on a codebase that currently inlines English in validators: one pass per validator, plus an `en.json` bucket. The payoff is that Welsh (statutory for Defra) becomes a browser-layer concern forever after.
2. **Zero-copy templates.** Enforced by convention here, but the convention holds across all 8 templates. Cheap to adopt; makes the i18n boundary un-leakable.
3. **The automatic declaration-site walks** in `i18n-coverage.test.js:78-124`. A ~50-LOC tree/manifest walk that hard-fails on a missing key. This is the good half of the gate.
4. **`t()` vs `tOrNull()`** — the two miss-policies (visible dotted path vs `null` for `??` fallbacks) is a small, well-reasoned distinction worth copying verbatim.

**Do NOT steal:**
5. **The hand-maintained `HUB_KEYS` / `CYA_KEYS` / `COMMODITY_LINES_KEYS` arrays** (`i18n-coverage.test.js:37-76`). They are the *anti*-pattern in the file and have already drifted by 18 keys. Replace with a source-scanning test (regex `t\(['"]([\w.]+)['"]` over `features/**` + `lib/**`, assert every hit resolves, assert every `en.json` leaf is hit) — that closes L3 *and* the orphan-key gap in one ~30-LOC test, and would have caught all 18 drifted keys and (if extended to flag adjacent template literals) points at L2.

**Cost of the un-built parts if the third option adopts B's model:**
- Welsh threading: ~93 `t()` call sites across 9 files, none of which currently have a request in scope. Signature changes to `chrome()`, `forObligation()`, `pageCopy()`, `pickWidget()`, `formatDomainErrors()`, `validatePagePayload()`. Plus `cy.json` (362 strings, translator).
- Pluralisation: replace `interpolate()` (7 LOC) with ICU/i18next, re-author the count-bearing keys. Small blast radius, but the current resolver genuinely cannot express it.
- Content ownership: 362 hand-authored strings with no content-design provenance and a documented, deliberate gap in copy-regression testing (`docs/testing.md:628` — Mutation 16, "0 tests caught it").
