# L1 — Accessibility, no-JS and progressive enhancement — SIDE A (live-animals)

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/` (+ two host-repo files it depends on)

## Headline

**The journey works with JavaScript off, and that is not an accident — but it is also not modelled.**

Two distinct things are true at once, and keeping them apart is the whole finding:

1. **The MODEL makes no-JS the default by construction.** Conditionality in A is
   `activatedBy` → derived scope → derived page/row gates → server-side routing. A
   conditional field is either on a different page, or rendered/omitted server-side per
   collection item. There is no client-side "show/hide the rest of the form" anywhere in
   the model's vocabulary, because the model has no `type`, no widget and no copy at all
   (docs/obligation-model.md — 11 keys max, none of them presentational). You cannot
   express a JS-only reveal in A's model. That is a structural property, not a discipline.
2. **Everything else about a11y and PE is HAND-CODED PER PAGE.** The error summary,
   the ARIA names, the `autocomplete` tokens, the no-JS add-another, the server-side
   search/pagination, the one autocomplete enhancement — all imperative, per controller
   and per template, with nothing enforcing them. The engine cannot see them and the
   test suite barely checks them.

Corroborating evidence for (1) being structural rather than diligent: **`DESIGN-DELTA.md`
(761 LOC, 15 numbered engine divergences) contains not one word about JavaScript,
accessibility or progressive enhancement.** A grep for `progressive|javascript|noscript|no-js`
across the whole root returns 15 hits — all in `docs/features.md`, `spec/*.json` and one
E2E describe block. **Zero in `engine/`, zero in `flow/`, zero in DESIGN-DELTA.** The PE
work never touched the model, because it never needed to.

## Client-side JavaScript: the entire surface

| Thing | Value |
|---|---|
| Client JS files attributable to A | **1** — `src/client/javascripts/select-autocomplete.js` (host repo) |
| Its size | **12 LOC** |
| Webpack entries added | **1** — `webpack.config.js:35-37` (`selectAutocomplete`) |
| Templates opting in | **3** of 32 (origin, port-of-entry, transit-countries) |
| Custom `addEventListener` / `data-module` in the prototype root | **0** (grep) |
| In-page client-side conditional reveal | **1** (`features/origin/template.njk:42`) |
| govuk-frontend components initialised | **5** (Button, Checkboxes, ErrorSummary, Radios, SkipLink) |

`src/client/javascripts/select-autocomplete.js` in full:

```js
import accessibleAutocomplete from 'accessible-autocomplete'

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('select[data-select-autocomplete]')
    .forEach((selectElement) => {
      accessibleAutocomplete.enhanceSelectElement({ selectElement, showAllValues: true })
    })
})
```

That is 100% of the client-side JavaScript A wrote. Everything else in the journey is a
server round-trip. (`src/client/javascripts/{notification-view,accompanying-documents,commodity-subtotal-autocomplete}.js`
belong to the legacy `src/server` skeleton, not to the prototype — no prototype template
references them.)

The enhancement is a textbook PE layer: the server renders `govukSelect` with
`attributes: { "data-select-autocomplete": "" }` (`features/origin/template.njk:22`,
`features/transport/port-of-entry.njk:26`, `features/transport/transit-countries.njk:26,34`),
the template ships the bundle by extending the layout's `bodyEnd`:

```njk
{% block bodyEnd %}
  {{ super() }}
  <script type="module" src="{{ getAssetPath('selectAutocomplete.js') }}"></script>
{% endblock %}
```
(`features/origin/template.njk:61-64`)

With JS off, `enhanceSelectElement` never mounts and the plain `<select>` — which is
always the control that submits — is untouched. **Verdict: PARTIAL/imperative.** It is
opt-in per template via a hand-typed data attribute; nothing in the model or the engine
knows a field is a "big list" that wants a combobox. Adding it to a fourth select is a
template edit, not a data edit.

## Does the journey work with JS off? Yes — and here is the mechanism

### The one client-side reveal is *safe by the model*, not by the page

`features/origin/template.njk:37-45` is the only `govukRadios({ conditional: ... })` in
the entire prototype (grep for `conditional:` returns exactly 2 hits, one of which is a
`flow/task-rows.js` flag). govuk-frontend's conditional reveal degrades to
always-visible without JS, so a no-JS user sees `regionOfOriginCode` even when they pick
"No" — and can fill it in and submit it.

Nothing in the controller guards against that:

```js
const values = {
  countryOfOrigin: payload.countryOfOrigin ?? '',
  regionOfOriginCodeRequirement: payload.regionOfOriginCodeRequirement ?? '',
  regionOfOriginCode: (payload.regionOfOriginCode ?? '').trim(),   // committed regardless
  ...
}
const { scope } = await state.commit(request, h, values)
```
(`features/origin/controller.js:79-91`)

The **engine** guards against it, on every single write:

```js
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  ...
```
(`engine/write.js:11-18`)

`regionOfOriginCode` declares `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }`
and `wipeOnExit: true` (`features/origin/obligations.js:12-17`), so a value submitted
while off-gate is reconciled out of scope and destroyed before it is saved. **The
show/hide is a pure affordance; the truth is derived server-side.** This is the one place
where A's *model* buys a no-JS guarantee outright: any page can render a hidden/revealed
field however it likes and the persisted answers still match the model's scope. 15 of the
44 obligations carry `activatedBy`, and all 15 carry `wipeOnExit: true` — the protection
is uniform, not spot-applied.

### Everything else conditional is a page, not a reveal

- Transit countries: a separate conditionally-routed page whose hub row disappears when
  the gate fails (`flow/task-rows.js:39`, `features/hub/controller.js:156`).
- Transporter branches (commercial vs private): separate pages.
- Per-animal typed identifier fields and `permanentAddress`: rendered/omitted **server-side
  per collection item**, driven by the enclosing frame's species
  (`features/commodities/_identification-card.njk:22-60`, fields computed in
  `animal-identification.controller.js`). A no-JS user gets exactly the fields the model
  says are in scope for that animal, on a full page render.

### No-JS "add another" and "remove" are named submit buttons

```njk
{{ govukButton({ text: "Add another country", classes: "govuk-button--secondary",
                 name: "addCountry", value: "add" }) }}
```
(`features/transport/transit-countries.njk:39-46`)

Same pattern for commodity de-selection (`features/commodities/search.njk:60-66`,
`name: "action", value: "remove:" + item.key`) and per-record add
(`_identification-card.njk:62-67`, `value: "add:" ~ card.index`). Server re-renders with
one more/fewer row. Imperative, per controller — 5+ separate hand-rolled action-dispatch
switches — but genuinely JS-free.

### The address picker is explicitly no-JS, and knows its own hole

`features/addresses/_address-picker.njk:8-12`:

```njk
{# Search + paginated results table with a radio per row (design 05-03..06).
   The whole picker is one form: the search button and Save and continue are
   both submits, told apart by their `action` value. Paging is a link, so the
   selection travels in the link's query string and in a hidden field — no
   client JS anywhere. #}
```

Search + `govukPagination` + radio-per-row + `<details>` "View details" (native element,
no JS). Selection survives paging via a hidden `selected` field and query-string carry
(`party-picker.controller.js:34-40`, `:108`). The documented residual hole: *"Following a
pagination LINK still discards a tick not yet submitted — stock govukPagination renders
anchors, and a submit-driven pagination would need custom CSS (banned) or client JS
(banned)"* (`spec/journey-spec.json:330`). Honest, recorded, and a usability defect for
everyone, not just no-JS users.

### File upload without JS: yes, genuinely

`features/documents/template.njk:15` — `<form method="post" enctype="multipart/form-data" novalidate>`
with a plain `govukFileUpload` (no `javascript: true`, so no drag-and-drop enhancement).
Bytes go to the Hapi handler (`multipart: { output: 'annotated' }`,
`features/documents/controller.js:341-345`), which forwards them to cdp-uploader
server-side (`documentUploads.upload(...)`, `:260`). Oversize is caught as a 413 Boom and
re-rendered as a GDS field error rather than a browser error page
(`controller.js:315-332`).

**The virus-scan poll is a link, not a timer:**

```njk
{% if anyPending %}
  <p class="govuk-body">
    <a href="{{ refreshHref }}" class="govuk-link">Refresh virus scan status</a>
  </p>
{% endif %}
```
(`features/documents/template.njk:78-82`; `refreshHref` = `?attempt=N`,
`controller.js:169-173`, with `MAX_POLLING_ATTEMPTS = 10` producing a "still checking"
hint rather than an infinite spinner). The spec's open question — *"'JavaScript in
Browser?' ... Bears on the documents upload loop (scan-status polling)"* — was ruled at
the spec gate: *"not a model question. Requirement is graceful degradation"*
(`spec/journey-spec.json:130`). The code honours the ruling. This is the strongest
single no-JS artefact in A: the file-upload + async-scan loop, which is the flow most
services solve with JS polling, is a user-driven server round-trip.

Cost note: a user-clicked refresh link is worse UX than an auto-poll for a JS user. A
would need to *add* a JS enhancement on top to match a modern upload page — it has not.

## GDS component compliance

- Everything is stock govuk-frontend 6.3.0 macros (`package.json:85`) on
  `{% extends "govuk/template.njk" %}` (`shared/layout.njk:1`). Custom widgets: none.
  The design's JS date-picker and drag-and-drop were deliberately declined
  (`spec/conflicts.json:358` — *"the design's JS date-picker quietly ignored"*).
- **Error page-title prefix is centralised and correct**:
  `{% if errorSummary %}Error: {% endif %}{{ pageTitle }}` (`shared/layout.njk:16`).
- Error summary: `kit.errorSummary(fieldErrors)` builds `{ titleText: 'There is a problem',
  errorList: [{ text, href: '#field' }] }` (`shared/kit.js:32-39`), rendered by
  `shared/error-summary.njk`, **included by hand in 19 templates**. Field name = input id =
  error key, so summary link → input anchors line up with no mapping table
  (docs/validation.md:162-175 — verified against `origin/controller.js` and the govuk
  macros' own `aria-describedby` wiring). Even the hand-rolled picker error targets a real
  id: `href: hasRows ? '#party' : '#q'` with `idPrefix: index === 0 ? 'party' : ...`
  (`party-picker.controller.js:80,108`) — deliberate, not lucky.
- **Focus management is govuk-frontend's**, obtained by `createAll(ErrorSummary)` in the
  host bundle (`src/client/javascripts/application.js:12`): focus-on-load and
  focus-the-field-on-link-click. With JS off it falls back to native anchor jumps. A wrote
  no focus code of its own — correct, and also nothing custom to review.
- Locked tasks are **not links** — `buildRowItem` returns `{ ...base, status: CANNOT_START_STATUS }`
  with **no `href`** when the derived gate fails (`features/hub/controller.js:152-162`), so
  `govukTaskList` renders grey "Cannot start yet" text. The a11y-correct behaviour
  (don't offer a dead link) is **derived from the obligation model**, not authored per row.
- WCAG 1.3.5 `autocomplete` tokens (`name`, `address-line1`, `postal-code`, `tel`, `email`…):
  present on **21 fields across 3 address surfaces** (`create-address.njk:20-88`,
  `private-transporter-details.njk:19-87`, `animal-identification.controller.js:283-316`).
  Hand-typed three times over — the model has no `type`, so nothing can derive them.
- `govuk-visually-hidden` accessible names: 15 uses across 8 files (per-row Remove links,
  table action headers, "View details for {name}", repeated transit-country selects).

## Testing this dimension

| Check | Count |
|---|---|
| E2E tests with `javaScriptEnabled: false` | **1** of 33 (`prototypes/e2e/live-animals.spec.js:2892-2917`) |
| What it covers | country-of-origin select only: `expect(page.locator('.autocomplete__input')).toHaveCount(0)`, then select → submit → persist |
| a11y contract assertions | 2 (`toHaveRole('combobox')` + `toHaveAccessibleName(...)` on the two enhanced selects, `live-animals.spec.js:586-587,1756-1757`) |
| axe / pa11y / Lighthouse | **0 — none anywhere in the repo** |
| Unit tests naming the no-JS path | 2 (`origin/controller.test.js:79`, `port-of-entry.controller.test.js:88` — "server-rendered select data (no-JS path)") |

The upload loop, the address picker, the add-another submits and the conditional-reveal
wipe — the four things that actually *carry* the no-JS story — have **no no-JS E2E leg**.
Their JS-free-ness is a property of the code, verified by reading, not by a test.

And the docs say so: **`docs/limits.md:86-88`** — *"Review coverage was JavaScript only.
The best-practices sweep that fed the cleanup covered `.js` files only. The `.njk`
templates and the route wiring never got a sweep. Template-level GDS component usage …
are unexamined."* No doc/code disagreement found on this dimension; if anything the docs
under-claim. (One stale spec note: `journey-spec.json:1256` still says transit countries
use *"checkboxes + maxSelections 12 … until that increment"*, but `transit-countries.njk`
already ships enhanced selects — the note at `:416` supersedes it.)

## The asymmetry to take to the comparison

**What A's paradigm gives you for free, and B must be checked for:**

1. *You cannot express a JS-only reveal.* The obligation vocabulary has no widget, so
   conditionality can only be discharged by routing or by server-side rendering. A
   config-engine that maps `type` → widget *can* grow a `reveal: true` widget that only
   works with JS. A structurally cannot.
2. *Off-gate answers are destroyed on write, not merely hidden* (`engine/write.js:14-15` +
   15 × `wipeOnExit`). A no-JS user who submits a revealed-but-off-gate field cannot
   corrupt the record. Any model with activation + wipe gets this; check whether B wipes
   or merely hides.
3. *A failed gate produces a task row with no href* (`hub/controller.js:158-160`) — the
   a11y-correct locked-task rendering falls out of the derived gate.

**What A's paradigm costs, and B may well win on:**

4. *Nothing about accessibility can be derived, enforced or audited centrally.* No
   `type`, no widget registry, no renderer ⇒ every input's label, hint, error wiring,
   `autocomplete` token and ARIA name is re-typed in the page that renders it. Adding a
   field touches 5 places (`docs/add-a-field.md:16`). An a11y regression on template 17 is
   invisible to the engine, to `contract.test.js` (which pins *commits*, not markup) and
   to the 526-case unit suite. A widget-deriving model can fix a11y once and fix it
   everywhere. **This is the single biggest retrofit argument against A on this
   dimension** — and it is not fixable within A's paradigm, because a central renderer
   *is* the paradigm A explicitly rejected (`docs/kit-library-not-framework.md`,
   `docs/obligation-model.md:139-143`).
5. *One 12-LOC enhancement is the whole PE story.* There is no PE *mechanism* — no
   per-field "enhance me" declaration, no bundle registry. A fourth enhanced select means
   another hand-typed data attribute and another `bodyEnd` block.

## Verdict on the dimension

- **No-JS journey end to end: REAL and working**, including file upload and async virus
  scan. The strongest, least-expected artefact on this side.
- **MODELLED:** conditionality-as-routing, scope-exit wipe of off-gate payloads, gate → no
  link on locked tasks, server-enforced collection cap.
- **IMPERATIVE:** the autocomplete enhancement, error summaries, add-another/remove
  submits, search + pagination, scan-status refresh, `autocomplete` tokens, ARIA names.
- **ABSENT:** any automated a11y testing; any template/GDS review sweep; any way for the
  model to say anything about a widget, a label or an input's purpose.
