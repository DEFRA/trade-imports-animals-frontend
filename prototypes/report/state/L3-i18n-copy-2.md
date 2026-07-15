# L3 — Adversarial verification — i18n-copy — CLAIM C2

**CLAIM:** B's conditionality predicates compare locale-invariant CODES; A's compare
ENGLISH DISPLAY STRINGS for the same requirements — *so A's gates break the moment the
copy is translated.*

**VERDICT: AMENDED.** Every quoted line is real and accurate. The *causal* assertion —
the clause after "so" — does not survive contact with the source. A's gates do **not**
break when the copy is translated, because A's widgets already separate the form
`value` from the rendered `text`, and the gate reads the value. The claim also implies
a structural incapacity that A demonstrably does not have.

---

## 1. Quote verification — all citations are accurate

Both sides' quotes are verbatim. Nothing was misread.

**Side B — confirmed:**
- `obligations/obligations.js:283` — `(fulfilments) => fulfilments[transporterType.id] === 'commercial'` ✓
- `obligations/obligations.js:332` — `const LAND_TRANSPORT_MODES = ['railway', 'road-vehicle']` ✓ (used `:338-339`)
- `obligations/obligations.js:601-605` — `PASSPORT_COMMODITIES = ['0101', '0102', '01061900']` ✓

**Side A — confirmed:**
- `features/transport/obligations.js:22` — `includes: ['Railway', 'Road Vehicle']` ✓
- `features/transport/obligations.js:34` — `equals: 'Commercial'` ✓ (and `:44` `equals: 'Private'`)
- `services/commodities/stub.js:87` — `PASSPORT_COMMODITIES = ['Horse', 'Cow', 'Cat', 'Dog']` ✓

B's seam is also real and model-level, exactly as claimed —
`domain/index.js:400-403` and `:511-516`:
```js
export const transporterTypeDomain = staticEnum(TRANSPORTER_TYPE_OPTIONS, {
  labels: { commercial: 'domain.transporterType.commercial',
            private:    'domain.transporterType.private' } })
```
Stored value = code; display = `t(key)`. The code is never rendered. That much of the
claim is solid and I could not dent it.

---

## 2. The refutation: A's gates do NOT break under translation

This is the claim's load-bearing clause and it is **false**.

A's `govukRadios` items carry **separate `value` and `text` properties**.
`features/transport/transporters.njk:22-35`:
```njk
items: [
  { value: "Commercial", text: "Commercial", hint: {...}, checked: values.transporterType == "Commercial" },
  { value: "Private",    text: "Private",    hint: {...}, checked: values.transporterType == "Private" }
]
```
Same shape at `features/transport/port-of-entry.njk:33-38`:
```njk
{ value: "Railway", text: "Railway", checked: values.meansOfTransport == "Railway" },
{ value: "Road Vehicle", text: "Road Vehicle", checked: values.meansOfTransport == "Road Vehicle" },
```

The controller commits the **posted form value**, not the rendered text —
`transporters.controller.js:31`: `const values = { transporterType: payload.transporterType ?? '' }`.
Validation also runs against the **value** list, not the label list
(`:13` `oneOf('transporterType', transportReference.transporterTypes())` →
`TRANSPORTER_TYPES = ['Commercial', 'Private']`, `services/transport-reference/stub.js:8`).

So translating the copy means editing `text:` → `t('…')` and leaving `value:` alone.
`equals: 'Commercial'` keeps firing. **No gate breaks.** The English string is doing
double duty as value *and* label by an identity mapping that the widget layer already
lets you split with a one-line edit that never touches the obligation.

The claim conflates "the code is spelled in English" with "the code IS the display
string". They are the same *characters*, but they are different *slots*, and only the
label slot moves under translation.

---

## 3. The second overstatement: A can already gate on codes

I took the full census of every `activatedBy` operand in A
(`grep -rn "equals:|includes:|notInUnionOf:" features --include=obligations.js`). Ten sites:

| Site | Operand | Kind |
|---|---|---|
| `import-purpose/obligations.js:6` | `equals: 'internalMarket'` | **CODE** |
| `origin/obligations.js:15` | `equals: 'yes'` | **CODE** |
| `transport/obligations.js:22` | `includes: ['Railway', 'Road Vehicle']` | English string, **hardcoded inline** |
| `transport/obligations.js:34` | `equals: 'Commercial'` | English string, hardcoded inline |
| `transport/obligations.js:44` | `equals: 'Private'` | English string, hardcoded inline |
| `commodities/obligations.js:15` | `commodities.packageCountCommodities()` | **service-derived call** |
| `commodities/obligations.js:33,39,45,51` | `enclosingCommodity(commodities.*Commodities())` | **service-derived call** |
| `commodities/obligations.js:65` | `notInUnionOf: obligations` | obligation refs — no strings at all |
| `additional-details/obligations.js:12` | `commodities.unweanedCommodities()` | **service-derived call** |
| `cph-number/obligations.js:10` | `commodities.cphCommodities()` | **service-derived call** |

Two findings that cut against the claim:

1. **A already gates on codes** at 2 of 10 sites. Nothing in the `activatedBy` vocabulary
   requires a label operand — it compares against whatever the controller committed.
2. **The commodity gates are indirected through the reference-data service.**
   `commodities/obligations.js:1` imports `services/commodities/index.js` and the operand
   list arrives as `commodities.passportCommodities()`. The English names are the
   *stub's current return value*, not a literal in the model. Migrate the commodity
   vocabulary to CN codes in `stub.js` + the controller, and **every one of those six
   gates follows with zero edits to any obligations file.** `services/commodities/index.js:18-21`
   already ships `commodityCodeFor(name)` / `commodityNameFor(code)` — the code↔label
   lookup exists.

So "A's model compares English display strings" is true *as built* for 3 transport
operands and true-by-current-stub-value for the commodity ones — but the inference
"therefore A's model is locked to labels" is wrong. This is **not built**, not
**cannot be built**, which is exactly the failure mode the brief warns about.

---

## 4. Symmetry check that weakens B's half of the claim

B's transport "codes" — `'commercial'`, `'private'`, `'railway'`, `'road-vehicle'`,
`'airplane'`, `'vessel'` — are themselves **English words, slugified**. They are
locale-invariant *because B never renders them* (label comes via the `labels` map into
`en.json`), not because they are codes in any external registry. Only B's **commodity**
operands (`'0101'`, `'0102'`, `'01061900'`) are genuine external identifiers, where the
word "CODE" is fully earned.

This does not damage B — the *seam* is what matters, not the spelling — but the claim's
framing ("locale-invariant CODES" vs "ENGLISH DISPLAY STRINGS") flatters B's transport
enums. The honest contrast is **opaque key vs rendered token**, not **code vs English**.

---

## 5. What IS true — and it is still a real, expensive A-side defect

Translation does not break A's gates. It breaks A's **rendering**, and it collides with
A's **wire contract**. That is the claim worth keeping.

**(a) CYA renders the raw stored value.** `features/check-answers/controller.js`:
- `:274` — `row('Means of transport', answers.meansOfTransport, 'meansOfTransport')`
- `:250` — `readOnlyRow('Common name', entry.commoditySelection)`
- `:356` — `answers.transporterType` rendered raw

A Welsh page would print "Railway" / "Cow" / "Commercial". Fixing that needs a
code→label lookup at the render site — and `docs/services.md:47-50` **explicitly
forbids exactly that**: *"`meansOfTransport` and `transporterType` are persisted as
their V4 display label, so their check-answers rows render the raw stored value with no
lookup — do not add one."*

**(b) The reason the lookup is forbidden is persistence.** The stored English token IS
the wire value (`notification-mapper.js:451` passes `meansOfTransport` straight
through, pinned byte-exact by `skeleton-equivalence.test.js`). So the token plays
**four roles at once**: form value, display label, persisted wire value, and — per
`consignment-details.controller.js:193` (`entry.commoditySelection !== request.params.commodity`)
— **URL path segment**. One string, four jobs, no seam between any of them.

**(c) The drift is already in the tree.** `services/transport-reference/stub.js:7` exports
`OVERLAND_MEANS = ['Railway', 'Road Vehicle']`, and CYA consumes it via
`transportReference.overlandMeans()` (`check-answers/controller.js:275`) — while
`transport/obligations.js:22` **hardcodes the identical list inline** instead of calling
the service. Two copies of one value domain, in the model and in the service, free to
diverge, with nothing checking they agree. That is the concrete, in-tree proof of the
real structural gap: **A has no single declaration site where value-domain and label
meet**, so each consumer re-declares. B's `staticEnum(options, { labels })` is precisely
the seam that makes that drift unrepresentable.

---

## 6. Retrofit sizing (corrected)

The claim implies a scary model-level rewrite. The actual work:

| Work | Cost | Nature |
|---|---|---|
| Point `transport/obligations.js:22` at `transportReference.overlandMeans()` | 1 line | Removes existing duplication; do it regardless |
| Split `text:` from `value:` in the njk for the 3 label-valued fields | ~8 njk lines | Trivial — the slots already exist |
| Commodity vocabulary → CN codes | `stub.js` + controllers + CYA lookups | **Zero obligation-file edits** — gates are service-derived |
| `meansOfTransport` / `transporterType` → codes | 3 obligation literals + CYA + **mapper + re-pin `skeleton-equivalence.test.js`** | The only genuinely expensive part, and the cost is the **wire contract**, not the gate |
| Adopt a `{ options, labels }` declaration site | reverses `decisions.md` #6, boot-guarded by `obligation-purity.js:19-46` | The real structural ask |

The expensive thing about A on this dimension is the **persisted display label** and the
**absent declaration seam** — not the predicates.

---

## 7. Amended claim

> B declares each enum once — `staticEnum(OPTIONS, { labels })` (`domain/index.js:400-403`,
> `:511-516`) — so the stored value is an opaque key, the display comes from an i18n key,
> and the widget, validation, CYA and the obligation's own predicate all derive from that
> single site; the predicate `fulfilments[transporterType.id] === 'commercial'`
> (`obligations.js:283`) therefore cannot be affected by translation.
>
> A has **no declaration site where value-domain and label meet**. As built, 3 of its 10
> `activatedBy` operands are English display tokens hardcoded in the model
> (`features/transport/obligations.js:22,34,44`) and its commodity operands resolve to
> English common names via the service (`services/commodities/stub.js:87`).
>
> This does **not** break A's gates under translation — `govukRadios` already separates
> `value` from `text` (`transporters.njk:22-35`), the controller commits the posted value
> (`transporters.controller.js:31`), and A already gates on codes at 2 sites
> (`import-purpose/obligations.js:6`, `origin/obligations.js:15`). What breaks is
> **rendering** (CYA prints the raw stored value — `check-answers/controller.js:250,274,356`)
> and what blocks the fix is **persistence**: the stored token is simultaneously the form
> value, the display label, the byte-exact wire value (`notification-mapper.js:451` +
> `skeleton-equivalence.test.js`) and a URL segment, and `docs/services.md:47-50`
> explicitly forbids adding the lookup for that reason.
>
> The real structural cost is the missing seam, whose consequence is already visible:
> `services/transport-reference/stub.js:7` exports `OVERLAND_MEANS = ['Railway','Road Vehicle']`
> and CYA uses it, while `transport/obligations.js:22` hardcodes the same list inline —
> two free-to-drift copies of one value domain. B's model makes that state unrepresentable.
> Honest caveat: B's transport "codes" are slugified English (`'railway'`, `'road-vehicle'`);
> they are locale-invariant because they are never rendered, not because they are external
> codes — only B's commodity CN codes (`'0101'`) are genuine identifiers.

---

## 8. What I searched

- Read both cited files in full at the cited lines; both quotes verbatim.
- Full census of A's `activatedBy` operands (`grep -rn "equals:|includes:|notInUnionOf:" features --include=obligations.js`) — found the 2 code-valued gates and the 6 service-derived ones the claim omits.
- `grep -rn "MEANS_OF_TRANSPORT|TRANSPORTER_TYPE"` and `"COMMODITY_OPTIONS|PASSPORT_COMMODITIES|COMMODITY_CODES"` across A's whole tree — found `commodityCodeFor`/`commodityNameFor` (existing code↔label seam) and `OVERLAND_MEANS` (the duplicated list).
- Read A's `transporters.njk`, `port-of-entry.njk`, `transporters.controller.js` — established the `value`/`text` separation that refutes the causal clause.
- Read A's `check-answers/controller.js` gate + render sites — established that the true breakage is at render/wire, not gate.
- Read B's `domain/index.js` `staticEnum` factory and both enum declarations — confirmed B's seam is genuine and model-level.
