# L3 — Adversarial verification — PW-2 (presentation-widgets)

**VERDICT: AMENDED.** The generation-leverage half is real and verified — stronger than
claimed, in fact. The **error-anchor half is false, and inverted**: on "error-summary links
land on the exact missing input", **A does it and B does not**. The claim names as B's
signature asymmetric capability the one sub-dimension on which B is the weaker side.

---

## 1. What I verified (claim is TRUE here)

### 1.1 B's addressBlock — the arithmetic is exact

- `domain/index.js:197-281` — `addressBlock(obligation, { subFields, required, subFieldRules })`
  returns `{ type: 'address', subFields, required, subFieldRules, isComplete, predicate, metadata }`.
  Shape marker `shape: 'addressBlock'` at `:270`. Verified verbatim.
- `ADDRESS_SUB_FIELDS` at `:839-849` (9 names); `ADDRESS_REQUIRED_SUB_FIELDS` at `:851-859`
  (7 of 9); `ADDRESS_SUB_FIELD_RULES` at `:861-871`; commercial-transporter variants at
  `:877-904` (10 sub-fields, 8 required).
- Nine `addressBlock(...)` call sites at `:906, 912, 918, 924, 930, 936, 942, 948, 960`.
  Eight take the 9-field set, one (`commercialTransporterDomain`, `:906`) takes the 10-field
  set. **8 × 9 + 1 × 10 = 82.** The figure checks out exactly.
- Denominator: `flow/flow.js` has **40** `obligation:` presents entries (`grep -c`). 9 are
  addresses → 31 non-address fields. 82 + 31 = **113**. The "~113" checks out — but note the
  counting convention is *form controls declared*, not literal `<input>` elements (a 26-option
  checkbox group counts as 1). Fine as stated; worth not over-reading.
- The address rule at `lib/field-widgets.js:179-269` is real: `govukSelect` for
  `rule.type === 'enum'` (`:236-254`), `govukInput` otherwise (`:259-264`), sub-input id
  `const subId = \`${id}__${sub}\`` at `:219`.

### 1.2 A's model genuinely has no sub-field concept

`features/commodities/obligations.js:80-85` verified verbatim:

```js
export const permanentAddress = {
  id: 'permanentAddress',
  required: true,
  activatedBy: enclosingCommodity(commodities.permanentAddressCommodities()),
  wipeOnExit: true
}
```

One opaque id. No `subFields`, no `required` sub-list, no `isComplete`. **True as claimed.**

### 1.3 A's duplication cost is WORSE than the claim says

The claim says A hand-rolls the descriptor array once plus "two bespoke address templates".
The real cost is a **triplicated sub-field specification**:

| Artefact | What it re-declares |
|---|---|
| `features/commodities/animal-identification.controller.js:104-114` | `ADDRESS_FIELD_ORDER` — the 9 sub-field names |
| `…:94-102` | `ADDRESS_MANDATORY_MESSAGES` — the 7 required sub-fields + messages |
| `…:141-188` | `addressChecksFor` — the max-length/enum rule table |
| `…:272-319` | `addressFieldsFor` — the 9 widget descriptors, hardcoded `kind` |
| **`features/addresses/create-address.controller.js:16-70`** | **the SAME 9 names, the SAME mandatory-message map, the SAME max-length rule table — copy-pasted** |
| `features/addresses/create-address.njk` (95 LOC) | a third hand-written render of the same 9 fields |
| `features/addresses/_address-picker.njk` (119 LOC) | hand-written picker (LOC verified via `wc -l`) |

So A specifies the same address shape **three times in three places**, with no single source of
truth. That is the strongest true evidence for the claim's thesis, and the claim under-sells it.

---

## 2. THE REFUTATION — the error-anchor assertion is backwards

The claim's load-bearing asymmetric-capability sentence is:

> "…with per-sub-field error anchors that land error-summary links **on the exact missing input**"

### 2.1 B does not do this for the missing case. It cannot, as wired.

`domain.address.subFieldRequired` is **declared but never emitted**:

```
grep -rn "subFieldRequired" <B tree>
  lib/format-domain-errors.js:109  (whitelisted in ADDRESS_ERROR_CODES)
  domain/index.js:105              (declared in the reasons registry)
```

Two hits. **No predicate ever pushes it.** The `addressBlock` predicate
(`domain/index.js:217-267`) explicitly skips blank sub-fields — `:226`,
`if (leaf === undefined || leaf === null || leaf === '') continue` — and only ever emits
`addressSubFieldMaxLength`, `addressSubFieldEmailFormat`, `addressSubFieldEnumInvalid`
(`:235, :247, :257`). All three fire only on values **the user actually typed**.

The missing/partial case is handled by a *different* path — `contract.js:266-283`:

```js
if (descriptor.mandatoryToProceed && !isSufficientForProceed(...)) {
  errors.push({
    code: 'flow.required',
    obligation: descriptor.obligation.name,
    path: descriptor.path,
    message: key ? t(key) : t('errors.defaultRequired')
  })
  continue          // ← short-circuits the domain predicate entirely
}
```

**No `subField` key on that error.** So `hrefFor` (`format-domain-errors.js:120-131`) takes the
`useSubField = error.subField && …` branch as false and returns the block-level anchor
`#commercialTransporter`.

### 2.2 …and that anchor points at nothing.

`shared/partials/fields.njk:26-40` — the address branch renders:

```njk
<div class="govuk-form-group{% if item.args.hasErrors %} govuk-form-group--error{% endif %}">
  {% call govukFieldset({ legend: …, describedBy: item.args.describedBy }) %}
```

`item.args.id` is **never emitted as an element id**. The wrapper `div` has no id; `govukFieldset`
is passed only `legend` and `describedBy`. So the error-summary link `#commercialTransporter`
matches **no element in the DOM** — a dead anchor. Skip-to-error is broken for exactly the case
the claim credits B with handling best.

### 2.3 B's own tests document the degraded behaviour

`routes.test.js:479-504` — "POST with only some sub-fields blank" (`addressLine1` and `postcode`
blank, others filled):

```js
expect(res.statusCode).toBe(400)
expect(res.payload).toContain('Complete the commercial transporter address')
```

with the author's own comment at `:484-487`: *"the flow-level completeness gate fires FIRST and
short-circuits… so a partial address surfaces **one clean 'Complete the …' error** rather than a
mix of predicate errors and the required error."*

**One block-level error for the whole 10-field block.** No per-sub-field message, no per-sub-field
anchor, and the one anchor it does emit is dead. No test asserts the href.

### 2.4 A does exactly what the claim says only B does

`animal-identification.controller.js:218-225`:

```js
const missingAddressErrors = (values, index) => {
  if (!addressRecordProvided(values)) return {}
  return Object.fromEntries(
    Object.entries(ADDRESS_MANDATORY_MESSAGES)
      .filter(([field]) => values[field] === '')
      .map(([field, message]) => [fieldName(field, index), message])
  )
}
```

→ one error **per missing mandatory sub-field**, keyed `postalOrZipCode-0`, with a specific
message ("Enter a postal or zip code", `:98`).

`summaryOf` (`:363-377`) turns each into `href: \`#${field}\`` → `#postalOrZipCode-0`.

`_identification-card.njk:41` / `:49` render `id: field.id` on each sub-input — and
`addressFieldsFor:275` sets `id: fieldName(id, index)`. **The ids match.** A's error-summary link
lands on the exact missing input, with a field-specific message.

### 2.5 Head-to-head on the sub-dimension the claim names

| Case | A (live-animals) | B (flow-layer) |
|---|---|---|
| Required sub-field left blank (partial address) | ✅ one error **per** missing sub-field, message per field, anchor `#postalOrZipCode-0` → **the exact missing input** | ❌ **one** block error, anchor `#commercialTransporter` → **no such element** |
| Max-length / format / enum error on a typed sub-field | ✅ anchored to exact sub-input (`addressChecksFor`, `:141-188`) | ✅ anchored to exact sub-input (`:219`) |
| Wholly blank address | ⚠️ no page error — deferred to hub/CYA via `required: true` | ✅ page save blocked (`isComplete`, `contract.js:315-322`) |

**A is equal-or-better on error anchoring in every row but the last.** The claim asserts the
opposite as B's headline win.

---

## 3. Second, smaller correction — "degenerate two-way widget registry" is not a differentiator

The claim disparages A's `_identification-card.njk:38-59` as a "degenerate **two-way** kind switch".
It is a two-way switch. But **B's address renderer is also a two-way switch** —
`fields.njk:32-38`:

```njk
{% for sub in item.args.subFields %}
  {% if sub.widget == 'select' %}{{ govukSelect(sub) }}
  {% else %}{{ govukInput(sub) }}{% endif %}
{% endfor %}
```

Identical arity, identical shape. The real difference is **where the descriptor comes from** —
B's is derived from `domain/index.js` (one declaration, nine reuses); A's is a literal in a
controller (re-declared in a second controller and a third template). That is the honest framing,
and it is still a B win. "Degenerate two-way" is rhetoric, not evidence.

---

## 4. Not-built vs cannot-be-built

Checked, per method step 3. Neither correction is a "cannot":

- **B's dead anchor is a ~10-line fix, not a model limit.** `contract.js:275-281` could emit one
  `domain.address.subFieldRequired` error *per* missing required sub-field with `subField: sub`
  (the code is already whitelisted at `format-domain-errors.js:109` and `hrefFor` already handles
  it at `:128-129`). The model has everything needed — `entry.required` is right there. **This is
  the single cheapest, highest-value fix on B**, and the fact that B's *doc + reason registry
  anticipate it while the code does not* is a textbook case of method step 4 (crediting a doc the
  code does not honour). The L2 write-up inherited that credit.
- **A's missing sub-field concept IS a model limit** for *derivation*, but not for *behaviour* —
  A already achieves the anchoring behaviour imperatively. What A cannot do is get it for free on
  a tenth address.

---

## 5. What survives, precisely

**Survives:** B generates 82 of ~113 declared form controls from 9 model declarations; A declares
address as one opaque obligation id and triplicates the sub-field spec across two controllers and
three templates. On **generation leverage and single-source-of-truth**, B wins, structurally, and
the retrofit onto A means building a descriptor layer that is 0 LOC today.

**Does not survive:** the per-sub-field-error-anchor advantage. On landing an error-summary link
on the exact missing input, **A is the better side today and B's link is dead.**

## 6. Shopping-list impact

Take B's `addressBlock` — but **do not take B's error path with it.** Take B's composite
descriptor + A's per-sub-field required-error emission and anchoring. The combination is ~10 LOC
on top of `addressBlock` and is strictly better than either side has shipped.

---

### Searches run
- `grep -rn "subFieldRequired" <B>` → 2 hits, both declarations, **zero emissions**
- `grep -rn "mandatoryToProceed" <B>` → traced to `contract.js:266-283` / `isSufficientForProceed:315-322`
- `grep -rn "ADDRESS_FIELD\|addressFields\|permanentAddress" <A>` → found `ADDRESS_FIELD_ORDER`,
  `missingAddressErrors`, and the `create-address.controller.js` duplicate
- `grep -rn "errorSummary\|errorList\|href" <A>/shared/kit.js` + `…/animal-identification.controller.js`
  → `summaryOf:363-377`, `href: '#' + field`
- `grep -rn "href.*#\|hrefFor\|errorList" <B>/lib/format-domain-errors.test.js` → no test asserts
  the required-case anchor
- `find … -name "*.njk"` over B (8 templates) → confirmed `fields.njk` is the only widget dispatch
  and emits no id on the address fieldset
- `wc -l` on A's `_address-picker.njk` (119) / `create-address.njk` (95) — both figures confirmed
