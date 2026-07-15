# L3 — Adversarial verification — PW-1 (presentation-widgets)

**VERDICT: AMENDED.** Directionally right on the axis that matters (B derives, A does not; one choice point vs ~50). Three material errors: the "~145" figure is inflated ~3x, A *does* carry per-field widget metadata (in its spec — 35 declarations — which nothing reads), and B's widget choice is *not* purely "type + option count" — there is a third, hand-authored, per-obligation input that the claim omits and that is precisely B's known model defect.

---

## What I searched

| Probe | Command / file | Result |
|---|---|---|
| A's runtime model carries presentation? | `grep -rn "type:\|label:\|hint:\|options:\|widget:" .../features/ --include=obligations.js` | **ZERO hits.** Confirmed. |
| A's real govuk call-site count | `grep -rEo "govuk[A-Z][A-Za-z]*\(" --include="*.njk"` | **94** total call sites (not 145) |
| A's *field-widget* call sites | `grep -rEoh "govuk(Input\|Radios\|Select\|Checkboxes\|DateInput\|FileUpload\|Textarea\|CharacterCount)\("` | **52** |
| A's descriptor-side widget choices | `grep -rn "kind: '\|widget" --include="*.js"` | **2** (`animal-identification.controller.js:274,303`) |
| **A's spec carries widgets?** | `grep -c '"widget":' spec/journey-spec.json` | **35** ← counter-example |
| Does A's runtime read the spec? | `grep -rn "journey-spec" --include="*.js"` | **ZERO hits** |
| B: any field widget outside `fields.njk`? | `grep -rn "govukSelect\|govukRadios\|govukInput\|govukCheckboxes\|govukDateInput\|govukTextarea" --include="*.njk"` | Only `shared/partials/fields.njk`. Confirmed. |
| B: templates in the v4 model spike? | `find prototypes/model-spikes/obligations-v4-model -name "*.njk"` | none |
| B: is `multi` a domain type? | `grep -rn "multi" domain/index.js` | 2 **comments** only (`:456`, `:1074`) — no flag |
| B: is the option count state-resolved? | `engine/index.js:41-45` | yes — `entry.options(fulfilments, ids, ctx)` |
| B template/LOC counts | `find -name "*.njk" -exec wc -l` | 8 templates / **299** LOC / `page.njk` = **27** LOC — exact |

---

## 1. What survives contact with the source (CONFIRMED sub-claims)

- **A's runtime obligation model is presentationally empty.** Reproduced the cited grep across all 12 `features/*/obligations.js` — zero hits for `type:`/`label:`/`hint:`/`options:`/`widget:`. The 11-key vocabulary at `docs/obligation-model.md:36` holds.
- **A hand-rolls a two-way `kind` switch once**, exactly as described: `features/commodities/animal-identification.controller.js:274` (`kind: 'input'`) and `:303` (`kind: 'select'`), consumed by `_identification-card.njk`. It is the *only* `kind`/`widget` occurrence in A's entire JS tree.
- **B chooses a field widget in exactly one place.** `pickWidget` (`lib/field-widgets.js:337-343`, 7 ordered rules, first-match-wins) has a single call site at `lib/build-field-descriptors.js:84`. Every field-input govuk macro in B's 8 templates lives in `shared/partials/fields.njk` (lines 17-42). The four bespoke templates (`hub`, `check-your-answers`, `commodity-lines/list`, `units/list`) call only `govukSummaryList` / `govukButton` / `govukTaskList` / `govukNotificationBanner` — no field widgets. The `obligations-v4-model` spike has zero `.njk`. **I hunted for a second choice point and there is none.**
- **The radios-vs-select decision IS state-resolved at render time.** `RADIO_MAX = 5` (`field-widgets.js:64`); `options.length > RADIO_MAX` at `:117` (radios bails) and `:152` (select fires). `options` comes from `optionsFor` (`build-field-descriptors.js:72-75` → `engine/index.js:41-45`), which invokes `entry.options(fulfilments, ids, ctx)` — a closure over **live fulfilments**. So a species enum whose option list is derived from the chosen commodity code genuinely flips radios↔select per request. This is real derivation, not a static declaration. Claim confirmed as written.
- **8 templates / 299 LOC / 30-of-31 pages via a 27-LOC `page.njk`** — verified exactly.

---

## 2. Error 1 — the "~145" is inflated ~3x (and its own source says so)

L1-A states the number as *"145 (import + call sites)"*. PW-1 dropped the parenthetical and re-cast it as "~145 hand-authored **places** [a widget is chosen]". Those are different quantities.

Actual counts across A's 32 `.njk`:

| | count |
|---|---|
| All `govuk*(` call sites (incl. Button, BackLink, SummaryList, Table, TaskList, Panel, Tag, Pagination, PhaseBanner, Breadcrumbs, ErrorSummary, InsetText, Details, WarningText, ServiceNavigation) | **94** |
| Of which are **field input widgets** | **52** — `govukInput` 28, `govukRadios` 11, `govukSelect` 8, `govukCheckboxes` 2, `govukDateInput` 2, `govukFileUpload` 1 |
| Descriptor-side widget choices in JS | **2** (`animal-identification.controller.js:274,303`) |

**A chooses a field widget in ~54 places, not ~145.** Comparing 145 against B's 1 flatters the ratio by ~3x, and it does so by counting `{% from ... import govukBackLink %}` lines and `govukButton()` calls as "widget choices". The honest ratio is **~54 : 1**. That is still a crushing result — it does not need inflating, and the inflation is exactly the kind of thing that gets a comparison dismissed.

---

## 3. Error 2 — the counter-example: A **does** have per-field widget metadata. In machine-readable form. It just throws it away.

This is the finding I went looking for and found.

`spec/journey-spec.json` — A's canonical machine-readable spec, the artefact the whole build loop was grown from — carries a **full presentational vocabulary per field**:

```json
{
  "id": "countryOfOrigin",
  "kind": "scalar",
  "mandate": { "required": true, "enforcedAt": "continue" },
  "label": "Country of origin",
  "input": {
    "widget": "select",
    "valuesSource": "Named MDM list of EU, EEA and EFTA countries (…)"
  }
}
```
— `spec/journey-spec.json:537-561`

```json
{
  "id": "regionOfOriginCodeRequirement",
  "label": "Does the consignment have a region of origin code?",
  "input": {
    "widget": "radios",
    "values": ["Yes", "No"],
    "hint": "If a region of origin code is required it will be shown on your health certificate."
  }
}
```
— `spec/journey-spec.json:563-578`

**35 `"widget":` declarations** across the spec — `select`, `radios`, `input`, `checkboxes`, `date-parts`, `fieldGroup` — each alongside a `label`, and where relevant a `hint` and a `values` / `valuesSource`.

And: **`grep -rn "journey-spec" --include="*.js"` over the entire prototype returns ZERO hits.** No runtime code reads it. The spec's presentation layer is authored, reviewed, versioned — and then hand-transcribed into 52 `.njk` macro calls and discarded at the code boundary.

**Why this matters, and it is not a nitpick:**

1. **It reclassifies the finding.** "A derives zero widgets from its model" reads as *A has no model of presentation*. False. A has one, it is machine-readable, and it is more expressive than B's runtime type alphabet in one respect (it records `valuesSource` provenance). What A lacks is the *code path* from spec → descriptor → renderer. The gap is a missing **layer**, not missing **data**.
2. **It halves the retrofit estimate.** L1-A §5 costs A's retrofit as "add presentational keys to the obligation" + "build the renderer" + "re-do 20 pages". Step 1 is largely already done — 35 fields already declare their widget, label, hint and value source. The retrofit is a *codegen or loader* job over an existing artefact, not an authoring job. That is a materially cheaper shopping-list item than PW-1 implies, and it is the single most actionable thing this verification produces.
3. **It sharpens the actual A-vs-B difference.** A's spec widget is **static** (`"widget": "select"` for `countryOfOrigin`, with a note "keep widget select over the same MDM list"). B's is **dynamic** (`options.length > RADIO_MAX`, evaluated per request against live fulfilments). The real asymmetry is not *derived vs not-derived* — it is **statically declared and unread** vs **dynamically derived and honoured**. That is the sentence the comparison should be making.

---

## 4. Error 3 — B's widget choice is **not** "type + option count". There is a hidden third input, and it is hand-authored per obligation.

The claim credits B with deriving the widget from *"the Domain entry's `type` plus the state-resolved option count"*. Read the rules in order and a third input appears — first, before either of those:

```js
const OBLIGATION_MULTI = new Set([
  'transitedCountries',
  'species',
  'animalsCertifiedFor'
])
```
— `lib/field-widgets.js:56-62`

- checkboxes rule (`:83`):  `if (!OBLIGATION_MULTI.has(obligation.name)) return null`
- radios rule (`:116`):     `if (OBLIGATION_MULTI.has(obligation.name)) return null`
- select rule (`:151`):     `if (OBLIGATION_MULTI.has(obligation.name)) return null`

**Every enum rule branches on this Set.** Value multiplicity — the *first* thing the dispatch decides — is a hardcoded three-name allowlist keyed on the obligation's `name` **string**, living in the presentation layer. It is not in the domain: `grep -rn "multi" domain/index.js` returns two prose comments (`:456`, `:1074`) and no flag. B's type alphabet is `{enum, integer, string, date, address}` — there is no `multi`.

So B's derivation is more accurately: **domain `type` + a hand-authored per-obligation multiplicity allowlist + the state-resolved option count**. Two derived inputs and one hand-authored one.

A second, smaller instance of the same shape: `uiHintsFor` (`field-widgets.js:23-54`) picks `type`/`autocomplete`/`inputmode`/width-class by branching on **sub-field name strings** — `'postcode'`, `'addressLine1'`, `'town'`, `'county'`, `'name'`. Again hand-authored, again keyed on a renameable identifier, again not derived from any type.

This does not sink the claim — B still chooses in **one place**, and centralising the hand-authoring into one 400-LOC table is the whole point and a genuine win. But stating the rule as pure type-plus-count over-credits B on the exact axis where L2 §1.7 independently identified B's **sharpest model defect** (a rename of `species` silently changes the *persisted shape* via `contract.js:331-335`, which coerces to an array only when `descriptor.widget === 'checkboxes'`). PW-1, as worded, would let a reader conclude B's widget layer reads nothing but the model — and it is precisely the bit that *doesn't* that is the bug. The claim must not paper over it.

---

## 5. Traps checked and cleared

- **"Not built" vs "cannot be built":** PW-1 makes no structural-impossibility assertion about A, so it does not fall into this trap. (L2 §1.8 already corrected the L1-A claim that A's purity guard *forbids* model-side options — `obligation-purity.js:13-17` permits `services/*/index.js` imports, and three `obligations.js` already use them. PW-1 correctly avoids repeating that error.) The spec finding in §3 above is the sharper version of the same point: A's widget derivation is *unbuilt*, not *unbuildable*, and it is less unbuilt than it looks.
- **Doc the code doesn't honour:** PW-1's evidence is code-cited throughout (`field-widgets.js`, `build-field-descriptors.js`, `fields.njk`), and I opened every cited line. The one doc citation (`docs/obligation-model.md:36`, the 11-key vocabulary) is honoured by the code — the grep confirms it. **Inverted trap found instead:** A has a machine-readable *artefact* (`journey-spec.json`) that the code doesn't honour. Worth flagging as the mirror image of the failure mode we were told to hunt.
