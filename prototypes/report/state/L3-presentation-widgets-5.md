# L3 — presentation-widgets — PW-5 (adversarial verification)

**Claim under test (PW-5):** B's widget derivation has only ever been validated against the EASY half
of the real page population: 5 view types vs A's 9, dead template branches, no rule for file upload,
table, summary-list, task-list or long-list autocomplete — "the rule table generalises" is unproven at
the hard end, and **a third option must assume an escape hatch B has not built**.

**Verdict: AMENDED.** Every cited line is real and says what the claim says it says. But the claim's
scoreboard is apples-to-oranges, its "no escape hatch" conclusion is false, and its autocomplete
sub-point inverts on contact with A's own source.

---

## 1. What I verified as TRUE (cited lines opened)

`lib/field-widgets.js` — 7 ordered rules, first-match-wins (`pickWidget`, :337-343):

| rule | line | emits |
|---|---|---|
| checkboxes | :70 | `checkboxes` |
| radios | :103 | `radios` |
| select | :138 | `select` |
| address | :180 | `address` |
| date | :271 | **`input`** (:279) |
| number | :296 | **`input`** (:299) |
| text | :318 | **`input`** (:320) |

So **5 distinct emitted `type` values** — confirmed. `shared/partials/fields.njk` imports
`govukTextarea` (:8) and `govukDateInput` (:9) and switches on `'date'` (:23) and `'textarea'` (:24);
**no rule ever emits either** — dead branches, confirmed. No file-upload rule, no `file` domain type
(the type alphabet in `domain/index.js` is enum / integer / string / date / address). Zero client-side
JS in the spike; `accessible-autocomplete` appears only in `NEXT.md:264` (a TODO) — confirmed.

## 2. Refutation 1 — the 5-vs-9 scoreboard compares different things

A does **not** derive 9 widget types. A derives **zero**: ~145 hand-authored `govuk*` macro call sites,
no descriptor/renderer layer at all (L2 §1.1, and `docs/architecture.md:192-205` records that A
*deleted* its type taxonomy). So "9" is A's hand-written template inventory, not the reach of a rule
table. The comparison as framed cannot show that A's derivation "reaches the hard end", because A has
no derivation to reach anything.

Worse, three of the nine — `govukSummaryList`, `govukTable`, `govukTaskList` — are **page-level
components no field-widget rule table emits in any GDS app**, and B ships two of the three anyway,
outside the rule table:

- `govukSummaryList` — `features/check-your-answers/template.njk:9`, `features/commodity-lines/list.njk:8`,
  `features/units/list.njk:9`
- `govukTaskList` — `features/hub/template.njk:7`

Exactly as A does (`features/check-answers/template.njk:2-3`, `features/hub/template.njk:3-4`). Listing
summary-list and task-list among B's missing "rules" inflates the gap with items that are missing from
A's rule table too — because A hasn't got one.

## 3. Refutation 2 — the escape hatch is BUILT, and it is a recorded design decision

The claim's load-bearing conclusion ("a third option must assume an escape hatch B has not built") is
false at page level:

- `routes.js:59-132` registers **10 bespoke routes** for 5 bespoke feature folders (start, hub, CYA,
  commodity-lines index/add/delete, units index/add/delete, reset) which never touch `pickWidget`.
- `routes.js:150-205` drives only `presents` / `presentsForEach` pages through
  `makePageController` → `shared/page.njk` → `fields.njk`. `routes.js:189` — a flow page with no
  `presents` (e.g. `flow.js:425` `commodity-lines-intro`) **is skipped entirely**.
- `NEXT.md:577-581` and `:590-592` record it as a *resolved* design question: "Per-feature template vs
  shared generic: **kept the generic** (`shared/page.njk`) for every static form page; **only bespoke
  features get their own template**."

That is precisely the hybrid the claim demands, already in the code, already exercised on four bespoke
templates. A's file-upload page (`features/documents/template.njk`) is itself hand-written, not derived —
so a B port of it uses the same escape hatch A used, at the same cost.

**What B has NOT built is a *field-level* escape hatch** — a per-obligation widget override *inside* a
rule-driven page. `lib/presentation.js`'s manifest carries `legend`/`hint` and no `widget` key; `flow.js`
`presents` entries carry `mandatoryToProceed`/`errors` and no widget key. That is the true, narrow,
still-worth-having version of the finding.

## 4. Refutation 3 — "not built" is being sold as "cannot"; B's own docs price each gap

- **date-input:** `field-widgets.js:274-278` — the single input is a *documented deliberate deferral*
  with the composite pre-wired: "If we later move to a date-input widget, the existing predicate still
  works — it parses DD/MM/YYYY." The template branch already exists.
- **long-list autocomplete:** `NEXT.md:260-269` names the gap and sizes the fix — "a new widget dispatch
  shape in `lib/field-widgets.js` (currently radios / select / checkboxes / date / input — needs a
  `search-select` variant)."
- **file upload:** `obligations.md:1844-1858` has already *ruled* on it — "If the canonical data IS the
  file: obligation type is `file`. If the canonical data is something extracted from a file: obligation
  type is whatever's extracted; 'upload' is a Flow-side method" — and states "the type space stays open".
  (The code does not yet honour it: no `file` type in `domain/index.js`. Doc-not-code, worth saying.)

Each is one added rule in an ordered, first-match-wins table whose extension point is its designed shape.
None requires a model change.

## 5. Refutation 4 — the autocomplete point INVERTS on A's source

A's enhancement is opt-in per call site (`attributes: { "data-select-autocomplete": "" }`). A has **8
`govukSelect` call sites** and applies it at **3**. The five it misses include **three full country
lists** rendered as bare selects — the exact defect the claim scolds B for:

- `features/addresses/create-address.njk:67` — `id: "country"`, `items: countryItems`, **no attributes**
- `features/transport/private-transporter-details.njk:66` — `id: "country"`, `items: countryItems`, **no attributes**
- `features/commodities/_identification-card.njk:40` ← `animal-identification.controller.js:302-308`
  (`kind: 'select'`, `items: addressCountryItems(...)`) — **no attributes**

A's architecture *guarantees* this can recur: there is no single place where "this list is long" is known.
B's rule table computes that predicate **once** — `options.length > RADIO_MAX` (`field-widgets.js:117`,
`:152`, `RADIO_MAX = 5` at `:64`) — so the enhancement is one `attributes` add inside the select rule
(`:153-176`) covering every long select in the app, forever. On this sub-point B's model is the *cheaper
and safer* home for the fix, not the weaker one.

## 6. The residue that survives (and the sharper concern the claim missed)

Genuinely true and not retrofittable for free: B has **no upload surface anywhere**, **zero client JS**,
26 raw checkboxes for `transitedCountries`, and a bare select over the country list. Its derivation has
never met an upload page, a scan-status poll, an add-another select row, or a search-and-select. Saying
"the rule table's generalisation is *unproven* at the hard end" is fair. Saying it is *unsupported* is not.

The sharper risk the claim walks past: `contract.js:331-335` coerces a value to an array **only when
`descriptor.widget === 'checkboxes'`**. B's rule table is therefore **not purely presentational** — adding
or reordering a rule can change the *persisted* value shape. That, not the missing widgets, is the reason
a field-level override needs care, and it is a model fix (`multi` on the domain entry), not a template one.

## What I searched

`grep -rn "govuk/components"` across all of B (found summary-list/task-list/button/etc. outside
`fields.njk`); `grep -rn "widget"` across `contract.js`, `lib/build-field-descriptors.js`,
`lib/page-controller.js`, `lib/presentation.js` (no override key anywhere); `grep -rn
"attachment|upload|fileUpload|scan"` across `obligations/obligations.js`, `domain/index.js`,
`obligations.md`; `grep -rn "bespoke|escape hatch|hand-written|custom template"` across B's docs;
`grep -rn "govukSelect|kind: 'select'"` across A's `features/`; read `routes.js`, `flow/flow.js`,
`lib/field-widgets.js`, `lib/build-field-descriptors.js`, `shared/partials/fields.njk`,
A's `shared/kit.js`, `features/commodities/animal-identification.controller.js:265-320`,
`features/commodities/_identification-card.njk`, `features/addresses/create-address.njk`,
`features/transport/private-transporter-details.njk`.
