# L1 — Accessibility, no-JS and progressive enhancement — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root:  `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (all paths below are relative to it unless prefixed)
Ancestor root `prototypes/model-spikes/obligations-v4-model/` contributes **nothing** to this dimension — it has no templates, no routes, no browser layer at all (it is the frozen pre-fork model). Everything below is the live spike.

## Headline

Side B has **no progressive enhancement, because it has nothing to enhance**. The spike ships **zero lines of client-side JavaScript** and **zero client-JS-dependent markup**. Every page is a server-rendered GOV.UK form, every mutation is a `POST` + redirect, every conditional question is resolved by a server round-trip through the obligations evaluator. The journey therefore works with JavaScript off *by construction* — not because anyone designed a no-JS path, but because no JS path was ever built.

That is a genuinely strong position, and it is **structurally supported**, not accidental: show/hide-page, show/hide-question and show/hide-option all ride `applyTo` + `optionsFor`, which are pure functions evaluated server-side on every GET (`lib/build-field-descriptors.js:67` — `if (!entryInScope(entry, state)) continue`). A field that is out of scope is *not in the HTML at all*. There is no client-side reveal to break.

The honest counterweight: **the no-JS story is untested as such** (no no-JS Playwright project, no axe/pa11y/Lighthouse anywhere), the GDS *question-page* pattern is not followed (h1 + separate `--m` label rather than label-as-h1), **long option lists fall back to a bare `<select>`** with no autocomplete, `date` renders as a **single free-text input** rather than the three-part GDS date input (and the doc claims otherwise), and **file upload does not exist at all** — not as a widget, not as a route, not as a domain type.

---

## Mechanisms

### M1. No client JavaScript in the spike — structural, not incidental

The spike contains 82 files. **None** is a client-side script. Grep for `<script`, `data-module`, `onclick` across the whole spike root returns exactly one hit:

`shared/layout.njk:50`
```njk
  <script type="module" src="{{ getAssetPath('application.js') }}"></script>
```

That is the **host frontend's** bundle (`src/client/javascripts/application.js`, shared-ancestor code, pre-fork), which does:
```js
createAll(Button); createAll(Checkboxes); createAll(ErrorSummary); createAll(Radios); createAll(SkipLink)
```
(`src/client/javascripts/application.js:10-14`)

So the spike **inherits** govuk-frontend's component JS for free — error-summary focus-on-load, radios/checkboxes ARIA sync + conditional-reveal support, skip link, double-click guard on buttons. It **adds** none of its own and **relies on** none of it: with the bundle blocked, every one of those components degrades to its documented no-JS behaviour.

Classification: **no client JS = ABSENT by design**; **GDS component JS = INHERITED from the host, used passively**.

### M2. Conditional questions = server round-trip, driven declaratively by the model

This is the one place Side B is genuinely strong on this dimension, and it is a *model* property, not a *template* property.

- `engine/index.js:248` `expandPresents(page, state)` expands a page's `presents` / `presentsForEach` into entries.
- `lib/build-field-descriptors.js:64-67`:
```js
  const entries = expandPresents(page, state)
  const out = []
  for (const entry of entries) {
    if (!entryInScope(entry, state)) continue
```
- Scope comes from the evaluator's `applyTo` closures (`obligations/obligations.js`, ~17 conditional obligations; gate factories at `obligations/helpers.js:39,65,101,132`).
- Option filtering is the same mechanism one level down: `optionsFor` (`engine/index.js`), called at `lib/build-field-descriptors.js:73`, so **show/hide-option** is also a server-side, declarative computation.

Net effect: an out-of-scope question is **absent from the DOM**, not hidden by CSS/JS. There is no `govuk-radios__conditional` markup anywhere in the spike (grep for `conditional` in `.njk`: zero hits). Show/hide is **MODELLED DECLARATIVELY**.

### M3. Flow composition deliberately puts every gate on its own page

Every conditional obligation's *gate source* sits on a **different, earlier page** from the obligation it gates:

| Gated obligation | Gate source | Gate page | Gated page |
|---|---|---|---|
| `regionCode` | `regionCodeRequirement` | `flow/flow.js:111` | `flow/flow.js:120` |
| `purposeInInternalMarket` | `reasonForImport` | `flow/flow.js:137` | `flow/flow.js:145` |
| `commercialTransporter` / `privateTransporter` | `transporterType` | `flow/flow.js:171` | `flow/flow.js:193` |
| `cph`, `containsUnweanedAnimals` | line `commodityCode` (via `anyAllowListed`) | `flow/flow.js:438` | `flow/flow.js:586`, `:607` |

That is why the server round-trip suffices: by the time the gated page is rendered, the gate's fulfilment is already in session. This is a **deliberate flow-authoring convention** — obligations.md never states it as a rule, but the 31-page composition honours it without exception.

### M4. The one same-page dependency is solved by "always show, conditionally mandate" — not by reveal

`flow/flow.js:379-404` — the `accompanying-documents` page presents **four** obligations, three of which are gated on the first (`accompanyingDocumentType`). They are NOT hidden/revealed. The `branchedGate` (`obligations/helpers.js:132-141`) keeps all four **in scope in both branches** and flips only the *mandate*:

> `flow/flow.js:357-363`: "The four fields share a `branchedGate` applyTo (see obligations.js): all optional when documentType is blank; the OTHER THREE flip to mandatory the moment documentType is filled"

So the page renders all four inputs on first GET, and `mandatoryToProceed: true` (`flow/flow.js:384,392,399`) makes the page-save block once the type is chosen. **No reveal, no JS, no stale render.** It is a legitimate no-JS answer to the reveal problem — and notably the *host* frontend solves the same page with client JS (`src/client/javascripts/accompanying-documents.js`, 217+ LOC, pre-fork commit 5b8d12c), which the spike simply ignores.

### M5. Every mutation is a POST form with a CSRF crumb — no JS-dependent controls

- `shared/page.njk:20-26` — `<form method="post" novalidate>` + hidden `crumb`, submit is `govukButton`.
- `features/hub/template.njk:29-32` — reset is a POST form, not a link.
- `features/commodity-lines/list.njk:24-40` — add-a-line and delete-a-line are **POST forms**, not `<a>` links and not JS handlers.
- `features/units/list.njk` — same at depth 2.
- `routes.js:97-132` — all add/delete/reset routes are `method: 'POST'`. No GET-mutation route exists.

`novalidate` on every form is the GDS convention (suppress browser-native validation in favour of the server's error summary). Add-another at both depths is therefore **fully functional with JS off**, at the cost of a full page load per add/delete.

### M6. Error handling — server-rendered summary, correct anchors, 400 status, input preserved

- `lib/page-controller.js:69-88`: on validation failure the controller **re-renders the same page with `.code(400)`** and passes `errorSummary` + `fieldErrors` + the **submitted values** so typed input survives.
- `shared/partials/error-summary.njk:6-11` — `govukErrorSummary({ titleText, errorList })`.
- `shared/layout.njk:16` — `{% if errorSummary and errorSummary.length %}{{ chrome.pageTitleErrorPrefix }}{% endif %}` — the GDS "Error: " page-title prefix.
- `lib/format-domain-errors.js:120-131` `hrefFor()` — builds `#<field-id>` anchors, extended to `#<id>__<subField>` for address-block sub-inputs so the summary jumps to the exact missing input.

Focus management on error is **not implemented by the spike** — it is whatever `createAll(ErrorSummary)` gives you from the host bundle (focus the summary on load). With JS off, the summary still renders and its links still work as fragment anchors. That is the correct degradation and it is what GDS expects.

### M7. GDS component usage — macros only, no bespoke CSS/widgets

Widget choice is a **data-shaped, ordered dispatch table** (`lib/field-widgets.js:68-335`, first-match-wins), and the template is a pure shape switch (`shared/partials/fields.njk:15-44`). Components used: `template`, `back-link`, `breadcrumbs`, `phase-banner`, `service-navigation`, `button`, `error-summary`, `input`, `select`, `radios`, `checkboxes`, `fieldset`, `task-list`, `summary-list`. No custom CSS partials, no hand-rolled widgets. 8 templates serve all 31 pages.

Accessibility polish is present but **imperative and per-case**, added in a code review rather than derived from the model — `lib/field-widgets.js:190-198`:
```js
      // Accessibility / GDS polish (2nd code review, findings #3 / #10 / #11):
      //  - Hint carries an id + fieldset gets `describedBy` so screen
      //    readers announce the hint alongside the legend (#3).
      //  - When ANY sub-field has an error, the whole widget wraps in
      //    a `.govuk-form-group--error` (#10)
```
This applies to the `address` composite only (`:204-217`), because that is the one widget the spike hand-rolls rather than taking whole from govuk-frontend (`shared/partials/fields.njk:26-40`).

### M8. `autocomplete` attributes — derived, but only for address sub-fields

`lib/field-widgets.js:23-54` `uiHintsFor(sub, rule)` maps sub-field name/type → `autocomplete` / `type` / `inputmode` / `spellcheck`: 7 mappings (`email`, `tel`, `postal-code`, `address-line1`, `address-line2`, `address-level2`, `address-level1`, `organization`). This satisfies WCAG 2.1 SC 1.3.5 (Identify Input Purpose) for the ~82 address sub-inputs.

The ~31 **top-level** fields get no `autocomplete` at all — the `text` / `number` / `date` rules (`:270-334`) emit no autocomplete. Coverage is therefore partial and is driven by sub-field *name*, not by anything in the model.

### M9. The whole journey is proven drivable by raw form POSTs

Not framed as a no-JS test, but it functions as one. **≥76 HTTP-level cases** run through Hapi `server.inject` with plain form payloads and a cookie jar — `routes.test.js` (40 cases, 1011 LOC), `e2e-commodity-lines.test.js` (22), `e2e-units.test.js` (12), `e2e-walk.test.js` (2 full journey walks, `:106-148` inject + cookie-jar helpers). `server.inject` cannot execute JavaScript. Every asserted behaviour — page visibility, option filtering, error rendering, redirect chains, add/delete of lines and units, task-list statuses, CYA — is therefore reachable with JS entirely off.

The two Playwright specs (`e2e/walk.spec.js`, 2 tests × N journeys) run with **JS on** (`playwright.config.js:49` — a single `chromium` project, no `javaScriptEnabled: false`), so nothing *explicitly* pins the no-JS behaviour. The guarantee is a side-effect of the test strategy, not an assertion of it.

---

## Limitations

### L1. No file upload — at all (structural=false, but the model has an answer already)
Zero `type="file"`, zero `govukFileUpload`, zero multipart route, zero `file` domain type (`domain/index.js` has exactly 4 shapes: staticEnum, computedEnum, predicate, addressBlock). The *documentation* has a considered position — `obligations.md:1847`: "**file-upload** | If the canonical data IS the file: obligation type is `file`. If the canonical data is something extracted from a file: obligation type is whatever's extracted; 'upload' is a Flow-side method." — and `NEXT.md:1058` lists `file-upload` as a needed widget shape. So this is **not built**, but the model does not obstruct it: it needs one new domain entry shape + one new rule in `lib/field-widgets.js` + a multipart route. The hard part (cdp-uploader integration, no-JS upload-and-scan round trip) is entirely absent and would be net-new.

### L2. Long option lists degrade to a bare `<select>`, no autocomplete (structural=false)
`lib/field-widgets.js:64` `export const RADIO_MAX = 5`; `:152` `if (options.length <= RADIO_MAX) return null` → anything with >5 options is a `govukSelect` with a placeholder (`:162-173`). Country lists, commodity codes, ports and species all land here. GDS guidance is that `<select>` is the *last* resort for long lists; the accessible-autocomplete enhancement is standard on GOV.UK country pickers. The spike knows this — `NEXT.md:260-269`: "Under the real MDM commodity list this becomes an autocomplete-search picker with three parallel search indexes (common / scientific / code) … needs a `search-select` variant" — and hasn't done it. On the plus side, `<select>` **is** the correct no-JS base for an accessible-autocomplete enhancement, so this is a cheap retrofit: one new rule in the dispatch table + progressive enhancement in the host bundle.

### L3. `date` renders as a single free-text input, not the GDS 3-part date input — and the doc says otherwise (structural=false; DOC↔CODE DISAGREEMENT)
`lib/field-widgets.js:271-293`:
```js
    id: 'date',
    build({ entry, id, value, legend, hint, error }) {
      if (entry?.type !== 'date') return null
      // DD/MM/YYYY string is stored back as a single value; we render a
      // single text input labelled as such rather than the composite
      // date-input widget so the round-trip is trivial.
      return { type: 'input', args: { ..., hint: hint ? { text: hint } : { text: 'DD/MM/YYYY.' }, ... } }
```
Meanwhile `obligations.md:2458-2460` describes the intended "Type alignment" check as "`date` → three-part widget". And `shared/partials/fields.njk:21-22` imports and dispatches `govukDateInput` for `item.type == 'date'` — **a dead branch**: no rule ever emits `type: 'date'`. Same for `textarea` (`fields.njk:23-24`) — imported, dispatched, never emitted. So two of the seven template branches are unreachable, and the *actual* date UX is a free-text `DD/MM/YYYY` box, which is a GDS pattern violation (date input is the prescribed component) and materially worse for screen-reader and low-literacy users.

### L4. The GDS question-page pattern (label-as-h1) is not followed (structural=false, but it is 31 pages wide)
`shared/page.njk:14` always renders `<h1 class="govuk-heading-l">{{ heading }}</h1>`, where `heading` = the obligation's **pageTitle** (`lib/page-controller.js:32-39`). The widget then renders its **legend/label** separately at `--m` size (`lib/field-widgets.js:124` `govuk-fieldset__legend--m`, `:159` / `:285` / `:325` `govuk-label--m`). These are *different strings*:
```json
"countryOfOrigin": { "pageTitle": "Country of origin",
                     "legend": "Which country are the animals coming from?" }   // locales/en.json:75-79
```
So a single-question page presents a short h1 plus a separate medium-weight question — not the GDS "the label/legend **is** the h1 (`isPageHeading: true`, `--l`)" pattern. Not a WCAG failure (labels are correctly associated, headings exist), but it is a systematic departure from the GDS question-page pattern across all 31 pages, and no `isPageHeading` appears anywhere in the spike.

### L5. Zero automated accessibility testing (structural=false)
No axe, no pa11y, no Lighthouse, no `@axe-core/playwright` anywhere in the spike or its Playwright config. A11y assertions are **4 hand-written regex/DOM checks**, all bolted onto existing suites:
- `routes.test.js:410` — "renders the address fieldset with accessible hint (#3), M-sized legend (#11), and no error state on first render (#10)", asserting `:426` `/aria-describedby="[^"]*commercialTransporter-hint/`
- `e2e-commodity-lines.test.js:451`, `:467`, `:524` — human-friendly `aria-label` / `visuallyHiddenText` on Change links and Delete buttons.

`docs/testing.md` (644 LOC, four named test levels + an 11-item mutation register) does **not mention accessibility, no-JS or progressive enhancement once**. Neither does `RECOMMENDATION.md`'s trade-offs table. The dimension is simply not on the spike's radar as a concern — which is consistent with it having no JS to get wrong.

### L6. No no-JS regression guard (structural=false)
`playwright.config.js:49` — `projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]`. One project, JS on. Nothing stops a future contributor adding a client-JS-dependent control; the `server.inject` suites would keep passing because they never render the client bundle. The no-JS property is real today and **unenforced**.

### L7. Intra-page conditional *scope* would render stale — the only structural corner (structural=TRUE, narrow)
The evaluator runs once per request, on the fulfilments in session (`contract.js:50` `evaluateState(fulfilments)`; the evaluator is constructed once at module load). A page's fields are filtered by scope at GET time (`build-field-descriptors.js:67`). Therefore **an obligation whose `applyTo` reads a gate answered on the SAME page cannot be revealed within that page** without either (a) a client-side re-run of the evaluator (there is none, and the evaluator is not shipped to the browser), or (b) a self-POST-and-re-render round trip (no controller does this — `page-controller.js:92-93` always advances via `nextAfter`). The spike sidesteps this entirely by page composition (M3) and by the always-show/conditionally-mandate trick (M4). It is structural in the sense that *the architecture as built has no mechanism for it* — but it is cheaply fixable in either direction (the evaluator is pure, sync and dependency-free, so it could be bundled to the client for a true progressive enhancement; or a self-POST could be added). Flagging it because it is the exact place a designer asking for a GDS conditional reveal would hit a wall.

### L8. No Welsh / no `lang` threading (structural=false)
`lib/i18n.js` + `locales/en.json` (362 keys, coverage-tested) is complete infrastructure with **no `cy.json` and no locale parameter** — `lib/chrome.js:35-38`: "Currently English-only; when locale threading lands (see NEXT.md P0.5), this gains a `request` argument". The `<html lang>` is whatever `govuk/template.njk` defaults to. Statutory Welsh is a live a11y-adjacent requirement (`obligations.md:2754`) and is acknowledged-not-done. But 362 keys of externalised copy is 90% of the job — retrofit is a `cy.json` plus threading a locale through `t()`.

---

## Retrofit cost — what it would cost to take Side B's approach

- **Free / already paid:** the "scope filters the DOM server-side" property. It falls out of `applyTo` + `optionsFor` + `build-field-descriptors.js:67`. If you adopt B's obligations model at all, you get the no-JS conditional-question behaviour for nothing. This is the single most valuable thing on Side B for this dimension.
- **Free / already paid:** POST-form add/delete, CSRF crumb, 400-on-error re-render with input preservation, error-summary anchors incl. address sub-field anchors (`format-domain-errors.js:120-131`).
- **Cheap (~1 rule each in `lib/field-widgets.js`):** accessible-autocomplete select, three-part date input, textarea, telephone. The dispatch table is the right shape for these; the template branches for date/textarea already exist and are dead.
- **Cheap and systematic:** `isPageHeading` / label-as-h1. One change in `page.njk` + the widget rules, driven by "does the page present exactly one obligation" — which `flow.js` already knows.
- **Moderate:** axe in the Playwright run, plus a `javaScriptEnabled: false` project to pin the no-JS property.
- **Expensive / net-new:** file upload end-to-end (cdp-uploader, virus scan, no-JS redirect dance). B has a written model position and nothing else.
- **Expensive / net-new:** Welsh threading (infrastructure exists; translation + locale plumbing does not).

## Doc ↔ code disagreements found

1. `obligations.md:2458-2460` says type alignment should map `date` → "three-part widget"; `lib/field-widgets.js:271-293` renders a single text input with a `DD/MM/YYYY.` hint. The doc describes an *aspirational tooling check* that would fail against the code as written.
2. `obligations.md:2461-2462` lists "**A11y / required-attribute alignment** — for `mandatoryToProceed: true` entries, the HTML signals 'required' appropriately" as a check. Nothing in the rendered HTML signals required — no `required`, no `aria-required`, no "(required)" suffix (the code only suffixes " (optional)" on *optional* address sub-fields, `field-widgets.js:226`). The check is unimplemented and would currently fail.
3. `shared/partials/fields.njk` imports and dispatches `govukDateInput` and `govukTextarea`; no widget rule emits `type: 'date'` or `type: 'textarea'`. Two dead branches.

## Numbers

| Metric | Value |
|---|---|
| Client-side JS files / LOC in the spike | **0 / 0** |
| `<script>` tags in spike templates | 1 (`shared/layout.njk:50`, loads the host's `application.js`) |
| govuk-frontend components initialised (inherited from host) | 5 — Button, Checkboxes, ErrorSummary, Radios, SkipLink (`src/client/javascripts/application.js:10-14`) |
| Conditional-reveal markup (`govuk-radios__conditional` / `conditional:`) | **0** |
| Widget types the dispatch table can emit | 5 — radios, select, checkboxes, address, input (`lib/field-widgets.js:68-335`) |
| Template dispatch branches | 7, of which **2 are dead** (`date`, `textarea`) (`shared/partials/fields.njk:15-44`) |
| Radios→select threshold | `RADIO_MAX = 5` (`lib/field-widgets.js:64`) |
| `autocomplete` mappings | 7 — address sub-fields only (`lib/field-widgets.js:23-54`); 0 on the ~31 top-level fields |
| File-upload inputs / routes / domain types | **0 / 0 / 0** |
| Forms with `novalidate` | all 5 form sites (page, hub-reset, lines add/delete, units add/delete) |
| Mutating routes that are GET | **0** (`routes.js:80-132` — reset/add/delete are all POST) |
| Validation-failure response | re-render same page, HTTP **400**, submitted values preserved (`lib/page-controller.js:73-88`) |
| Explicit a11y assertions in tests | **4** (`routes.test.js:410`; `e2e-commodity-lines.test.js:451,467,524`) |
| Automated a11y tooling (axe / pa11y / Lighthouse) | **0** |
| Playwright projects | 1 (chromium, JS **on**); no `javaScriptEnabled: false` project |
| HTTP-level test cases driven by raw form POSTs (`server.inject`, no browser, no JS) | **≥76** across 4 files |
| Mentions of "accessibility"/"JavaScript"/"progressive enhancement" in `docs/testing.md` (644 LOC) | **0** |
