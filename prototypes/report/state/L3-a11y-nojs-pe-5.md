# L3 — Adversarial verification — a11y-nojs-pe — CLAIM C5

**Claim under test:** "B's delivered accessibility is wrong in several concrete, GDS-visible
ways today — but every one of them is a single dispatch-rule or single-template fix that
lands on all 31 pages, which is the structural point in B's favour, not against it."

**Verdict: AMENDED.** The structural half survives contact with the source and is stronger
than the claim states. The "several concrete GDS-visible wrongs" half does not: **two of the
five alleged defects are not defects**, a third is not a *today* defect, and the "single
dispatch-rule or single-template fix" characterisation is **false for the two that are real**.

---

## What I read

Side B (`clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`):
`lib/field-widgets.js` (all 344 lines), `lib/build-field-descriptors.js` (all),
`contract.js` (all), `lib/format-domain-errors.js` (all), `shared/partials/fields.njk`,
`shared/page.njk`, `lib/presentation.js`, `domain/index.js:525-1100`,
`locales/en.json:70-84`, `obligations.md:2374-2474`.

Side A (`clone-live-animals/prototypes/standalone/live-animals/`): `shared/` listing,
`features/**` grep for `govukDateInput` / `autocomplete` / `isPageHeading`, `find` for any
i18n/locale file.

Searches run: `isPageHeading|govuk-label--l|govuk-fieldset__legend--l` across the whole
spike (**0 hits**); `optional)` across `lib/` + `shared/` (**1 hit**, field-widgets.js:226);
`alignment` across the whole spike; `type: 'date'` in `domain/index.js`; `find -iname
"*locale*" -o -iname "*i18n*" -o -iname "en.json" -o -iname "cy.json"` under A's root
(**0 hits**).

---

## Point-by-point

### 1. Date renders as a free-text DD/MM/YYYY input — TRUE, but NOT a single-rule fix

`field-widgets.js:270-293` verified verbatim: the `date` rule returns `type: 'input'` with
`hint: { text: 'DD/MM/YYYY.' }` and `classes: 'govuk-input--width-10'`. `fields.njk:9,22-23`
imports and dispatches `govukDateInput` on `item.type == 'date'`; **no rule ever emits
`type: 'date'`** (the five emittable types are checkboxes, radios, select, address, input).
Same for `govukTextarea` (`fields.njk:8,24-25`). **Two dead branches — CONFIRMED.**

But "one rule edit" is wrong, and wrong in a way that would *break the app*:

- `contract.js:244-245` reads the payload as `payload?.[id]` — one key per descriptor.
  `govukDateInput` posts **three** keys (`id-day`, `id-month`, `id-year`). Swap the widget
  rule alone and every date submits `undefined` — and because `arrivalDateAtPort` is a
  `mandatoryToProceed` field, `isSufficientForProceed` (`contract.js:315-322`) would reject
  every save. The fix needs a `descriptor.widget === 'date'` gather-and-reassemble branch in
  `validatePagePayload` (the address composite already has exactly this shape at
  `contract.js:233-242`, so precedent exists — but it is a *second* seam file).
- `format-domain-errors.js:120-131` `hrefFor` emits `#<obligationName>`. On a
  `govukDateInput` that id lands on the wrapping `<div class="govuk-date-input">`, which is
  not focusable; the GDS convention is to anchor the summary at `#<id>-day`. Third seam file.

So: **three central files, not one rule.** Still O(1) in files rather than O(31) in
templates — the structural point survives — but the claim's phrasing is materially
overstated. Note also this defect touches exactly **2 fields** (`arrivalDateAtPort`,
`accompanyingDocumentDateOfIssue` — the only two `predicate('date', …)` entries,
`domain/index.js:1035,1055`), not "all 31 pages".

**Delivered-quality counterpoint the claim omits: A gets this right.** A renders
`govukDateInput` on both its date fields (`features/transport/port-of-entry.njk:3,16`;
`features/documents/template.njk:4,37`). On dates, A is GDS-correct and B is not.

### 2. ">5 options → bare select, no autocomplete" — TRUE mechanically, NOT a defect today

`field-widgets.js:64` (`RADIO_MAX = 5`), `:152` (`if (options.length <= RADIO_MAX) return
null`), `:162-173` (select with placeholder) — all verified.

But the longest option list in the spike is **26 items** (`COUNTRY_OPTIONS`,
`domain/index.js:531-558`; `EEA_EFTA_COUNTRY_OPTIONS` = 25). A properly-labelled
`<select>` of 26 options is **not an accessibility failure** — it is a GDS *preference*
issue that only bites under the real ~200-entry MDM list, which the spike itself already
flags (`NEXT.md:260-269`). Listing this as a way B "is wrong today" is a mis-framing.

And the fix is not "one dispatch rule": accessible-autocomplete needs a **client-side JS
module + a webpack entry in the host app**. The spike ships **zero lines of client JS**; the
bundle lives outside the spike root. Cheap, yes — but it is the change that introduces B's
*first* progressive-enhancement surface, which is a category change, not a rule edit.

### 3. "GDS question-page pattern followed on 0 of 31 pages" — CONFIRMED, and correctly named

`shared/page.njk:14` — `<h1 class="govuk-heading-l">{{ heading }}</h1>`, heading = pageTitle.
Widgets emit a separate legend/label at `--m` (`field-widgets.js:124,159,215,285,325`).
`locales/en.json:75-79` confirms these are different strings ("Country of origin" vs "Which
country are the animals coming from?"). Grep for `isPageHeading|govuk-label--l|
govuk-fieldset__legend--l` across the entire spike: **zero hits.** Confirmed.

Not a "single-template fix" though. It needs `page.njk` (conditionalise the h1) +
`page-controller.js` (a single-obligation-page flag; multi-obligation pages like
`accompanying-documents` must keep the h1) + all seven rules' label/legend construction —
**and** an editorial reconciliation of ~31 `pageTitle`/`legend` pairs in `locales/en.json`,
because promoting the legend to h1 changes what every page says and desyncs `<title>` from
`<h1>`. Mechanical it is not.

The structural point still lands hard, and here I *strengthened* it rather than broke it:
**A has no shared field macro at all.** `shared/` contains only `error-summary.njk`,
`layout.njk`, `save-actions.njk`, `kit.js`. **18 templates call `govukInput`/`govukRadios`/
`govukSelect`/`govukDateInput` directly**, and `isPageHeading: true` appears on exactly
**7** of them (import-purpose, contact, transporters-select, transporters,
import-type-filter, import-reason, cph-number:16). So A follows the pattern on 7 templates
and silently doesn't on the other 11 — and nothing catches the miss. B is uniformly wrong
in one place; A is inconsistently wrong in eighteen. That is the real shape of the finding.

### 4. "Nothing signals required" — REFUTED as an accessibility defect

`obligations.md:2461-2462` verified — it is one of four bullets under
`### Model ↔ HTML alignment — sub-checks`, and grep confirms **no test implements any of
them** (the string "alignment" appears only in obligations.md/NEXT.md prose). So the
*check* is unimplemented. Fine.

But "nothing in the HTML signals required" is **not a GDS wrong — it is GDS-correct.** The
GOV.UK Design System's question-page guidance is to mark **optional** fields and leave
required fields unmarked. B not emitting `required`/`aria-required` is compliance, not
failure. The claim has this backwards.

The **real** defect, which the claim inverts: `field-widgets.js:226` — the only `' (optional)'`
suffix in the entire spike (grep across `lib/` + `shared/`: 1 hit) — is applied **only to
address sub-fields**. The ~31 top-level fields, optional or not, are unmarked. *That* is the
GDS gap.

And here the claim leaves B's strongest card on the table. `mandatoryToProceed` is **not**
passed into `pickWidget`'s ctx (`build-field-descriptors.js:84-97` passes obligation, entry,
options, id, value, legend, hint, labels, error, fieldErrors — no mandate flag), so no rule
*can* signal optionality today. Threading it in is one ctx key. But the right source is
`effectiveStatus(obligation, path, state)` (`contract.js:316`), which means B's "(optional)"
marker would be **derived from evaluator state and would track `branchedGate` dynamically** —
correctly saying "(optional)" for `regionCode` on the `regionCodeRequirement=no` branch and
dropping it on the other. No per-page-template approach can keep a state-dependent optional
marker correct by hand across 31 pages. That is the asymmetric capability on this dimension,
and C5 never reaches it.

### 5. "autocomplete on address sub-inputs only, absent on ~31 top-level fields" — REFUTED as a defect

`field-widgets.js:23-54` verified: 7 mappings (email, tel, postal-code, address-line1,
address-line2, address-level2, address-level1, organization). The top-level `text` / `number`
/ `date` rules (`:270-334`) emit none.

But **there is no autocomplete to emit.** WCAG 2.1 SC 1.3.5 (Identify Input Purpose) applies
only to inputs collecting information *about the user*, against a fixed 53-token list. B's
top-level fields are `internalReferenceNumber`, `transportIdentification`,
`transportDocumentReference`, `cph`, `passport`, `tattoo`, `earTag`, `horseName`,
`identificationDetails`, `description`, `accompanyingDocumentReference`, `regionCode`,
`numberOfAnimals`, `numberOfPackages`, two dates, and enum pickers (country / port / species
/ commodity code) — **none of which has a valid autocomplete token and none of which collects
user personal data**. B autocompletes exactly the address/contact sub-fields where 1.3.5
actually bites. Coverage is not "partial"; it is complete for the fields where the
requirement applies.

B also sets the affordances that *do* matter on top-level fields: `inputmode: 'numeric'` +
`spellcheck: false` on numbers (`field-widgets.js:310-311`), `type: 'email'` / `type: 'tel'`
+ inputmode on address sub-fields (`:23-38`). (The one genuine miss the claim doesn't
mention: the date free-text input carries no `inputmode`.)

For symmetry: A hand-types the *same 7 tokens* in three separate places
(`features/addresses/create-address.njk:20-88`,
`features/transport/private-transporter-details.njk:19-87`,
`features/commodities/animal-identification.controller.js:283-316`). Same coverage, three
hand-maintained copies.

### 6. "No cy.json, but 362 keys externalised where A hard-codes across 32 templates" — CONFIRMED, understated

`find` for `*locale*` / `*i18n*` / `en.json` / `cy.json` under A's entire prototype root:
**zero results.** A has no i18n layer of any kind; 18 templates hard-code every label, legend
and hint inline. B has `lib/i18n.js` + `locales/en.json` (362 keys) with a coverage test.
Welsh in B is a file plus a locale param on `t()`; Welsh in A is a rewrite of 18 templates.
This is the least contestable part of C5.

---

## The one thing I tried to break and could not

The structural asymmetry. I looked specifically for a shared field macro, a page-spec
renderer, or any central widget seam on Side A that would collapse the "1 edit vs 18 edits"
gap. There is none: `shared/` holds `error-summary.njk`, `layout.njk`, `save-actions.njk`
and `kit.js`, and every field-bearing page hand-calls the govuk macros. And this is not an
oversight A could quietly fix — it is enforced. A's `assertObligationPurity()` refuses to
boot if an obligation module imports anything presentational, and `docs/features.md:333-338`
names the central renderer as the failure mode by construction ("The moment a
`kit.renderPage(spec)` appears, the rejected generic config-engine has sneaked back in").
So *every* a11y property in A is, by design, an N-templates-and-no-guard property.

That half of C5 is right, and right for a stronger reason than C5 gives.

---

## Amended claim

B's delivered accessibility has **two** real GDS defects today, not five: the `date`
obligation renders as a free-text `DD/MM/YYYY` input instead of `govukDateInput`
(`field-widgets.js:270-293`; A gets this right, `port-of-entry.njk:16`), and the GDS
question-page pattern (label-as-h1 / `isPageHeading`) is followed on **0 of 31 pages**
(`page.njk:14` + `--m` legends; zero `isPageHeading` in the tree). Two template branches for
`govukDateInput`/`govukTextarea` are dead (`fields.njk:22-25`). Three of C5's five alleged
defects do not hold: the **required-attribute** point is backwards (GDS says mark *optional*
fields, not required ones — B's real gap is that its only `' (optional)'` suffix,
`field-widgets.js:226`, is applied to address sub-fields alone); **top-level autocomplete**
is absent because none of B's top-level fields collects user data in a WCAG 1.3.5 token
category, so there is nothing to emit; and the >5-option `<select>` is the wrong *end-state*
under the real MDM list but is not an a11y failure against today's 26-country stub. Nor are
the fixes "single dispatch-rule" edits: three-part date needs a widget rule **plus** a
multi-key payload branch in `contract.js:244` (without it every date save silently fails the
`mandatoryToProceed` gate) **plus** an error-anchor change in `format-domain-errors.js:120`;
`isPageHeading` needs `page.njk` + a single-obligation flag + all seven rules + a ~31-pair
copy reconciliation in `en.json`; autocomplete-select needs the host app's first client-JS
bundle. **The structural point nevertheless holds, and holds harder than C5 argues:** all of
these are O(1) central-file edits in B, whereas A has no shared field seam at all — 18
templates hand-call the govuk macros, `isPageHeading` appears on only 7 of them, the same 7
autocomplete tokens are hand-copied in 3 places, and `assertObligationPurity()` plus
`docs/features.md:333-338` make a central renderer a *boot-blocking design rejection*, not an
omission. The strongest version of the pro-B argument is one C5 misses entirely: B can derive
the `(optional)` marker from `effectiveStatus(obligation, path, state)`, so it would track
`branchedGate` state dynamically per branch — a state-dependent a11y property that no
per-page-template approach can keep correct by hand across 31 pages.
