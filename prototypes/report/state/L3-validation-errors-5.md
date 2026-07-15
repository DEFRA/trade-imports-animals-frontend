# L3 adversarial verification — VE-5 (validation-errors)

**Verdict: AMENDED.** The direction survives; four of the claim's load-bearing
specifics do not.

---

## 1. What I checked, and what the source actually says

### B side — the cited evidence is real and means what the claim says

| Cited | Verified |
|---|---|
| `contract.js:224-295` | `validatePagePayload` calls `fieldsForPage(page, state, {}, options)` (`:225`) and `for (const descriptor of descriptors)` pushes errors in descriptor order (`:228-292`). Confirmed. |
| `engine/index.js:248-272` | `expandPresents` emits `presents` in declared order, then `presentsForEach` records in record order. Confirmed. |
| `shared/page.njk:23` | `{{ renderFields(fields) }}`, and `fields` = `descriptors.map(d => d.view)` (`lib/page-controller.js:59, :83`). Same list, same order. Confirmed. |
| `format-domain-errors.js:120-131`, `:139-157` | `hrefFor` is one function; `formatDomainErrors` pushes `errorList` in array order and never sorts. Confirmed. |
| One title construction | `shared/partials/error-summary.njk:8` → `titleText: chrome.errorSummaryTitle` → `lib/chrome.js:45` → `locales/en.json:449`. Grep for `errorSummary` across the whole spike returns exactly three consumer sites (`lib/page-controller.js:85`, `lib/line-page-controller.js:121`, `lib/unit-page-controller.js:157`), each passing `result.errorList` straight through. Confirmed. |

### A side — the cited evidence is real

- `shared/kit.js:32-39` is verbatim as quoted: `Object.entries(fieldErrors ?? {})`, `href: '#' + field`, `titleText: 'There is a problem'` hardcoded.
- `grep -rn "There is a problem"` across A returns **exactly five** hits:
  `shared/kit.js:36`, `features/commodities/animal-identification.controller.js:375`,
  `features/commodities/consignment-details.controller.js:171`,
  `features/addresses/party-picker.controller.js:79`,
  `features/documents/controller.js:201`. **The count of five is exactly right.**
- Nothing pins the order. There is no `shared/kit.test.js`. The only summary
  assertions in A are `toHaveLength(1)` / `toContain(...)` /
  single-element `href` checks (`documents/controller.test.js:54-55, :167, :190`;
  `animal-identification.controller.test.js:154-156`;
  `consignment-details.controller.test.js:114-119`;
  `party-picker.controller.test.js:199-211`) — all order-agnostic.

(Two of the claim's paths are wrong: it is
`features/commodities/consignment-details.controller.js` and
`features/addresses/party-picker.controller.js`, not
`features/consignment-details/` and `features/party-picker/`.)

---

## 2. Counter-examples found — the four corrections

### 2.1 "Four A controllers bypass `kit.errorSummary` **entirely**" — false. Two do.

- **Full bypasses (2):** `animal-identification.controller.js:363-377` (`summaryOf`,
  never imports the kit fn) and `party-picker.controller.js:76-82` (local
  `errorSummary`).
- **Extensions, not bypasses (2):** `documents/controller.js:186-190` **calls**
  `kit.errorSummary(errors)?.errorList` and concatenates rejected-upload errors in
  front of it. `consignment-details.controller.js:115` reads
  `errorSummary ?? kit.errorSummary(errors)` — the kit is the default path; the
  hand-built object is used **only** on the count-drop branch (`:162-175`).

The five-title count still stands, but "five separate constructions" is a
formatting duplication, not five independent summary pipelines.

### 2.2 The bypasses are asymmetric CAPABILITY, not just a thin seam.

Every one of the four exists because `kit`'s contract (`{field: message}` →
`href: '#' + field`) cannot express the href it needs:

- `animal-identification.controller.js:369-372` — `#identification-card-${index}`:
  an anchor to a **card section**, not an input (`_identification-card.njk:10`,
  `<section id="{{ card.anchor }}">`).
- `consignment-details.controller.js:139-143` — a **cross-page** href
  (`/pages/animal-identification?change=1#identification-card-N`).
- `party-picker.controller.js:80` — a **state-dependent** anchor
  (`hasRows ? '#party' : '#q'`), where `#q` is a search box, not an obligation.
- `documents/controller.js:187` — virus-scan rejections that are **not keyed by any
  field at all**.

B's error record is `{ code, obligation, path, subField, message? }` and the anchor
is *always* recomputed from `obligation`+`path` (`hrefFor`, `:120-131`). There is no
`href` slot. **B cannot express any of the four**, which is precisely the L2 §2.2
finding. So the same evidence the claim uses to indict A's seam is also evidence of
a capability B structurally lacks. The claim presents only one half of it.

### 2.3 "Anchors … hand-wired once per input in 18 `.njk` templates" — A already has a derived path.

`grep -rn "errorMessage"` across A: **16 templates** hand-wire `errors.<literal>`
(≈40 bindings) — origin, cph-number, create-address, private-transporter-details,
port-of-entry, documents, contact, declaration, etc. That part is true.

But **two partials derive it exactly the way B does**:

- `features/commodities/_identification-card.njk:22-32` —
  `{% for field in card.fields %}{{ govukInput({ id: field.id, name: field.id,
  errorMessage: field.error and { text: field.error } }) }}{% endfor %}`
  (and `:38-59` for the address sub-block).
- `features/commodities/_species-quantities.njk:11-32` — `id: line.animalsField`,
  `errorMessage: line.animalsError`.

In both, the input id **and** the error key are produced by one helper —
`fieldName(id, index)` (`animal-identification.controller.js:116`), used for the Joi
key (`:137, :143-188`), the descriptor id (`:349-353`), the payload read (`:194`)
and the summary href (`:365-367`). That is B's shape, inside A, today, on the two
hardest pages. So A's model does not *prevent* derived anchoring — nobody wired it
on the 16 simple singleton pages. **"Not built" ≠ "cannot be built."** The retrofit
is per-template plumbing, not a model change — which is materially cheaper than the
"replace A's entire template layer" framing this claim feeds.

### 2.4 "`Object.entries` insertion order, with nothing pinning it" — deterministic, not arbitrary.

`lib/validate/run.js:1-15`: errors are a `reduce` over Joi's `error.details`
(`abortEarly: false`), so key insertion order = Joi schema key order = the argument
order of `compose(...)` (`lib/validate/validators.js:11-15`, `Joi.object({}).concat(...)`).
A's summary order is therefore **fully deterministic and derived from a declaration**
— it is just a *second* declaration (the Joi `fields()` call) that has to be kept in
step with the template's hand-written order by eye. E.g. `origin/controller.js:26-49`
lists `countryOfOrigin, regionOfOriginCodeRequirement, regionOfOriginCode,
internalReferenceNumber`, and `origin/template.njk` happens to render in that order.
Nothing enforces it, and no test would catch drift. **The defect is two lists that can
diverge silently, not an unordered map.** Stating it as "insertion order with nothing
pinning it" invites the reader to think A's summary order is random; it is not, and
a reviewer who checks will discount the whole claim.

### 2.5 "`hrefFor` computes the anchor centrally" — centrally-ish, and already broken.

The id **formula** is re-typed in B, not shared:

- `lib/build-field-descriptors.js:28-32` — `fieldId()` → `${obligation.name}-${path}`
- `contract.js:229-231` — same literal, rebuilt
- `lib/format-domain-errors.js:125-127` (`hrefFor`) and `:146-148`
  (`formatDomainErrors` key) — same literal, twice more
- `${id}__${sub}` likewise in `lib/field-widgets.js:206, :219`, `contract.js:240`,
  `format-domain-errors.js:129, :154`

Four copies of the anchor formula and five of the sub-field formula. B's anchoring is
*also* a convention — the convention just lives entirely in JS instead of JS + Nunjucks.

And it is **already violated**: a `flow.required` error on an address obligation is
pushed with no `subField` (`contract.js:275-281`), so `hrefFor` returns
`#commercialTransporter`, while `shared/partials/fields.njk:26-40` renders the address
widget as a bare `<div>` + a fieldset + `${id}__${sub}` inputs — **no element carries
`id="commercialTransporter"`** (confirmed: `lib/field-widgets.js:219, :230` only ever
emits `subId = ${id}__${sub}`). Dead summary anchor on all three
`mandatoryToProceed` addresses. So the derivation does not, in fact, guarantee a live
anchor — it guarantees a *consistently computed string*, which is a weaker property
than the claim implies.

---

## 3. What survives

- B's summary **ordering** is genuinely derived (one descriptor list feeds validation
  and render; no sort anywhere). A's is a second declaration that must be kept in
  sync by hand and is untested. **True, and the important half of the claim.**
- B has **one** error-summary construction with an i18n title; A has **five**
  hardcoded ones. **True, count exact.**
- B's anchor is computed in code; A's is written twice per input (Joi key + `.njk`
  literal id) on 16 of 18 templates. **True in spirit, false as an absolute.**

## 4. What does not

- "Four bypass entirely" → two bypass, two extend.
- "Bypasses = thin seam" → three of them encode hrefs B cannot represent at all.
- "Hand-wired in 18 `.njk`" → 16 hand-wired, 2 already descriptor-driven with a
  single-source id helper; A can derive, it just didn't.
- "Nothing pinning it" → deterministic via Joi key order; the risk is drift between
  two lists, not disorder.
- "`hrefFor` central" → formula duplicated 4×, and it emits a dead anchor for every
  required address today.
