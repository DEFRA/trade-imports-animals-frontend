# L3 — adversarial verification — a11y-nojs-pe — CLAIM C2

**Claim.** B derives widget choice, copy and a11y attributes from the model, so a per-field
a11y change is one rule edit landing on all 31 pages; A's equivalent is a per-template edit
with no central enforcement. Concretely: accessible-autocomplete in A is opt-in via a
hand-typed data attribute on 3 of 32 templates, whereas in B one dispatch rule would give it
to every >5-option field.

**Verdict: AMENDED.** The structural asymmetry is real and I could not break it — but the
claim is imprecise at both ends. A is *not* purely per-template (it has an opt-in helper
library, `shared/kit.js`, that already centralises the date widget and the error summary),
and B would *not* get autocomplete on every >5-option field from one rule (the checkbox rule
fires first for multi-value obligations, and that is precisely one of the three fields A does
enhance).

---

## 1. Cited evidence — verified, all real

### B (all paths under `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`)

- `lib/build-field-descriptors.js:58-108` — verbatim as cited. `:64` `expandPresents`,
  `:67` `if (!entryInScope(entry, state)) continue`, `:69` `domain.get(...)`, `:70`
  `forObligation(...)` (presentation), `:71-76` `optionsFor` for `enum` entries, `:84`
  `pickWidget({obligation, entry, options, id, value, legend, hint, labels, error, fieldErrors})`.
  So (obligation × domain entry × scope) → widget descriptor is exactly what the function does.
- `lib/field-widgets.js:64` `export const RADIO_MAX = 5`; `:152` `if (options.length <= RADIO_MAX) return null` → `type: 'select'`. Real.
- `lib/field-widgets.js:23-54` `uiHintsFor` — the 7 `autocomplete` mappings. Real.
- **Verified beyond the citation (strengthens the claim):** *no feature template in B imports
  a form-input macro at all*. `grep -rn "import govuk"` across `features/` + `shared/` returns
  input/textarea/date-input/radios/checkboxes/select/fieldset **only** in
  `shared/partials/fields.njk:7-13`. The four feature templates
  (`check-your-answers`, `commodity-lines/list`, `units/list`, `hub`) import only
  summary-list / task-list / button / notification-banner. There is **no escape hatch**: every
  form field in the spike is emitted by the dispatch table. "One rule edit lands on every
  field" is literally true.
- **Enforcement exists on the copy side:** `i18n-coverage.test.js:126-215` asserts every key
  referenced from `flow.js`, `presentation.js`, `domain/index.js` labels, address sub-field
  labels and `format-domain-errors.js` resolves in `locales/en.json`;
  `obligations/coverage.test.js:80-107` asserts every obligation is wired to a domain entry or
  explicitly allow-listed. A missing field's copy/domain wiring fails a test. Nothing
  equivalent exists on A.

### A (all paths under `clone-live-animals/prototypes/standalone/live-animals/`)

- `features/origin/template.njk:22` — `attributes: { "data-select-autocomplete": "" }`; `:61-64` —
  its own `{% block bodyEnd %}` loading `selectAutocomplete.js`. Verbatim as cited.
- `features/transport/port-of-entry.njk:26` and `features/transport/transit-countries.njk:26,34` —
  same hand-typed attribute. So the attribute appears at **4 sites in 3 templates**. Cited count correct.
- `src/client/javascripts/select-autocomplete.js:5` —
  `document.querySelectorAll('select[data-select-autocomplete]')`; `webpack.config.js:35-37` —
  the `selectAutocomplete` entry. Correct.
- `docs/obligation-model.md:36-40` — "There is deliberately no `type`, no copy, no widget choice
  and no validation on an obligation", backed by a real boot guard
  (`obligation-purity.js` + `obligation-purity.test.js`). So **model-derived a11y is
  structurally unavailable in A as designed**, not merely unbuilt. The claim's central
  assertion survives.

---

## 2. Counter-example hunt — what I went looking for

### 2a. Does A have a central mechanism the claim missed? PARTLY — `shared/kit.js`.

`shared/kit.js` is a shared *library* (A's docs call it "library not framework",
`docs/kit-library-not-framework.md`) and it does carry presentation-shaped helpers:

- `kit.dateField(name, {label, hint, value, error})` (`shared/kit.js:85-100`) builds the whole
  `govukDateInput` arg object — legend classes, `govuk-input--width-2/4`, error classes, the
  three-part items. Used by `features/transport/port-of-entry.controller.js:72` and
  `features/documents/controller.js:214`. **An a11y change to every date field in A is one
  edit in `kit.js`,** not a per-template edit.
- `kit.errorSummary` / `kit.fieldError` (`kit.js:32-42`) centralise the error-summary
  construction and the `#field` anchors.

So "A's equivalent change is a per-template edit" is **too strong as a blanket statement**.
The honest position: A has a *voluntary* helper layer that already centralises some
widget/a11y concerns; it is opt-in (a template can ignore it, and the select templates all do),
and there is no guard that makes anyone use it.

### 2b. Is A's 3-of-32 opt-in actually a *gap*, or complete coverage of its long lists?

It is a real gap — worse than the claim says. A has **8 `govukSelect(` sites in 7 files**:

| Site | Options | `data-select-autocomplete`? |
|---|---|---|
| `features/origin/template.njk:15` | `countryItems` (full country list) | YES `:22` |
| `features/transport/port-of-entry.njk:18` | MDM ports | YES `:26` |
| `features/transport/transit-countries.njk:19,29` | `countryItems` | YES `:26,34` |
| `features/transport/private-transporter-details.njk:66` | `countryItems` (`controller.js:72,92`) | **NO** |
| `features/addresses/create-address.njk:67` | `countryItems` (`controller.js:78,102`) | **NO** |
| `features/commodities/_identification-card.njk:40` | `field.items` (controller-built descriptors) | **NO** |
| `features/documents/template.njk:18` | `typeItems` (short) | n/a |

Two **full country selects** (private-transporter-details, create-address) are missing the
enhancement today, and `countryItems` is re-implemented four times
(`origin/controller.js:20`, `transit-countries.controller.js:13`,
`private-transporter-details.controller.js:72`, `create-address.controller.js:78`). The only
tests that touch the enhancement are two per-page E2E cases
(`prototypes/e2e/live-animals.spec.js:572`, `:1743`) — nothing asserts that *every* long select
is enhanced. **The exact failure the claim predicts has already happened, unnoticed.** This is
the strongest evidence for the claim and it was not in the original evidence.

### 2c. Would B really get it from *one* rule? NO — this part does not survive.

`lib/field-widgets.js:68` is an **ordered, first-match-wins** table and the **checkboxes** rule
is *first* (`:69-101`). It matches on `OBLIGATION_MULTI` (`:56-62`) — a hand-maintained set:
`transitedCountries`, `species`, `animalsCertifiedFor` — and it does so **before any option-count
test**. The select rule's `>RADIO_MAX` branch (`:152`) is only reached for
non-multi enums (`:151` `if (OBLIGATION_MULTI.has(obligation.name)) return null`).

`transitedCountries` draws on `COUNTRY_OPTIONS` (26 entries, `domain/index.js:531-558`), so B
renders it as **26 checkboxes**. A rule of the form "`options.length > RADIO_MAX` → select +
`data-select-autocomplete`" would never fire for it. So:

- B needs **two** rules (or a multi-select/autocomplete widget), not one.
- The long multi-value lists are the fields where **A is currently better**: A's
  `transit-countries.njk:19-34` is add-another select rows *with* the autocomplete enhancement;
  B's is a 26-checkbox wall. That is one of the three templates the claim cites as A's weakness.

### 2d. Does B really derive *a11y attributes* from the model? PARTLY.

`uiHintsFor` (`field-widgets.js:23-54`) keys off the address sub-field **name/type in the domain
rule** (`postcode`, `addressLine1`, `town`, `county`, `name`, `email`, `telephone`), not off the
obligation. It covers only the address-block sub-inputs. The ~31 **top-level** fields get **no**
`autocomplete` (the `text`/`number`/`date` rules `:270-334` emit none) — the same hole A has
outside its address templates (A hand-types the same 7 tokens in `create-address.njk:20-88`,
`private-transporter-details.njk:19-87` and `animal-identification.controller.js:283-316`).
And widget *choice* is not purely model-derived either: multi-ness lives in a hard-coded
`OBLIGATION_MULTI` set in the presentation layer.

What B genuinely has is **centralisation** (one place to change, coverage-tested copy), not full
derivation-from-the-model. The distinction matters for the third option: the win is the single
dispatch point, not the ontology.

### 2e. Does the claim credit a doc the code doesn't honour? No — the reverse.

It credits code. If anything B's `obligations.md:2458-2462` over-promises (three-part date;
required-attribute signalling) and the code does neither — but the claim does not lean on that
doc, so it is not exposed.

### 2f. "Not built" vs "cannot be built" — checked both ways.

- **A cannot derive a11y from the model** without deleting `obligation-purity.js` and reversing
  `docs/obligation-model.md:36-40`. That is structural. But A **can** centralise in the *kit*
  (it already does for dates), so the ceiling for A is "one edit in a helper, unenforced", not
  "32 edits". The claim over-eggs A's weakness by ignoring `kit.js`.
- **B has not built** accessible-autocomplete, but nothing obstructs it. Confirmed: one rule +
  one bundle entry. The rule would need to be *two* rules to also cover multi-value lists.

---

## 3. Amended claim (the strongest version that is true)

B centralises the entire form-rendering surface: **every** input in the spike is emitted by one
ordered dispatch table (`lib/field-widgets.js:68-335`), fed by
`lib/build-field-descriptors.js:58-108` from (obligation × domain entry × scope), with copy
resolved through `lib/presentation.js` + `lib/i18n.js` and **coverage-tested**
(`i18n-coverage.test.js:126-215`, `obligations/coverage.test.js:80-107`). No feature template
imports a form-input macro (`grep "import govuk"` — inputs appear only in
`shared/partials/fields.njk:7-13`). So a per-widget a11y change in B is a **one-or-two-rule
edit that provably reaches every field**.

A cannot derive presentation from its model — `docs/obligation-model.md:36-40` plus the
boot-enforced `obligation-purity.js` make that a design axiom, not an omission — and although
`shared/kit.js` gives A a *voluntary* helper layer (`kit.dateField:85-100` centralises the whole
`govukDateInput` for both date pages; `kit.errorSummary:32-39` the error anchors), the select
enhancement is not in it. Accessible-autocomplete is a hand-typed `data-select-autocomplete`
attribute plus a per-template `bodyEnd` script block, present at 4 sites in 3 templates
(`origin/template.njk:22,61-64`; `port-of-entry.njk:26`; `transit-countries.njk:26,34`) — and it
is **already missing from two full country selects** (`create-address.njk:67`,
`private-transporter-details.njk:66`, both fed by a fourth and third copy of `countryItems`) and
from the identification-card select (`_identification-card.njk:40`), with no test that would
notice. The predicted failure has already occurred.

The concrete "one rule → every >5-option field" is wrong: B's dispatch is first-match-wins and
the checkboxes rule (`field-widgets.js:69-101`, keyed on the hand-maintained `OBLIGATION_MULTI`
set at `:56-62`) matches multi-value obligations *before* the option-count test, so
`transitedCountries` (26 countries, `domain/index.js:531-558`) renders as 26 checkboxes and
would be untouched by such a rule. On that field A is currently the better UI. B needs a
multi-select/autocomplete rule as well — still one central edit each, still landing everywhere,
but two rules, not one.

## 4. Implication for the third option

Take B's single dispatch point + coverage tests. Add **two** autocomplete rules (single-select
>RADIO_MAX, and a multi-value long-list variant modelled on A's add-another select rows). Lift
A's 12-LOC `select-autocomplete.js` bundle and wire it to the rules, not to templates. Move
`autocomplete` derivation off sub-field *names* and onto a declared field purpose so top-level
fields get it too — neither side does this today.
