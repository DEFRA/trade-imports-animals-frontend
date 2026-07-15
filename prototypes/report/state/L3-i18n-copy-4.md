# L3 — adversarial verification — i18n-copy — claim C4

**CLAIM (C4):** A's label-gating is MECHANICAL, not structural. L1-A's "A CANNOT
EXPRESS gate on the code behind the label" is refuted by source. A already gates on
codes at 2 of its 12 `activatedBy` sites; nothing in A's predicate vocabulary requires
a label operand.

**VERDICT: AMENDED.** The central assertion **survives** — I attacked it hard and could
not break it, and in fact the source supports it *more strongly than the claim itself
argues*. But the claim is arithmetically wrong ("2 of 12" — the real figure is 2 of 15),
it rests on the weakest available evidence (a head-count of two exception sites) while
missing the decisive evidence (the engine's predicate is value-opaque by construction),
and it omits one genuine migration hazard.

---

## 1. Did I verify the cited evidence? Yes — every citation is real and says what the claim says.

| Citation | Verified |
|---|---|
| `features/import-purpose/obligations.js:6` | ✅ `activatedBy: { obligation: reasonForImport, equals: 'internalMarket' }` — verbatim. |
| `services/import-reason-purpose/stub.js:1-7` | ✅ `REASON_FOR_IMPORT_LABEL = { internalMarket: 'Internal market', … }` — the code→label map exists, so `'internalMarket'` is genuinely a **code**, not a label. |
| `features/origin/obligations.js:15` | ✅ `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` — verbatim. |
| `services/persistence/records/notification-mapper.js:451` | ✅ `meansOfTransport: answers.meansOfTransport` — straight pass-through into `transportExtras`. |
| `skeleton-equivalence.test.js` | ✅ Exists; `:184` `transporterType: type`; `:203-218` drives the real `buildNotificationPayload` via `save()` and captures the exact POST body. The payload pin is real. |
| `docs/services.md:45-50` | ✅ Verbatim: "The `transport-reference` enums are the exception: `meansOfTransport` and `transporterType` are persisted as their V4 display label, so their check-answers rows render the raw stored value with no lookup — **do not add one**." |

---

## 2. What I searched, and the counter-example hunt

I tried to **rescue L1-A's "structural" reading** — i.e. to find something in A that
*forces* a label operand. I failed, four times over. Each of these is stronger evidence
for C4 than C4's own argument.

### 2.1 The engine's predicate is value-opaque — this is the decisive fact, and C4 does not cite it

`engine/evaluate/predicate.js:12-29`:

```js
export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) {
    const targets = [].concat(activatedBy.includes)
    return [].concat(value ?? []).some((candidate) => targets.includes(candidate))
  }
  if ('notInUnionOf' in activatedBy) { … }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(…)
}
```

Four predicates, all of them raw identity / set-membership on an **opaque scalar**. There
is no label semantics, no display resolution, no `type`, no locale, nothing in the engine
that knows a string is English. Whether the operand is a code or a label is decided
**entirely by what the controller committed** — exactly as C4 says, but this proves it at
the level of the *vocabulary*, not by a head-count of exceptions. L1-A's "the model cannot
express gate-on-code" is not merely contradicted by two counter-examples; it is
contradicted by the engine's design.

### 2.2 The engine's own unit tests gate on codes

`engine/evaluate/cross-frame.test.js:16` `includes: ['cat', 'dog', 'ferret']`; `:39`
`includes: ['cph']`; `:187` `includes: ['horse', 'cow']`; `:196` `includes: ['cow']`;
`:133`/`:165`/`:175` `equals: 'yes'`. The engine is *tested* against lowercase coded
operands. A codes-based gate is not hypothetical in A — it is the fixture shape.

### 2.3 `obligation-purity.js` **permits** a reference-data service import — so a codes-returning service is importable today

`obligation-purity.js:13-17`:

```js
export const isReferenceServiceImport = (specifier) =>
  /(^|\/)services\/[^/]+\/index\.js$/.test(specifier)
const isPermittedObligationImport = (specifier) =>
  isSidewaysObligationImport(specifier) || isReferenceServiceImport(specifier)
```

The boot guard L2 elsewhere cites as the thing that *closes* the seam in fact **holds it
open**: an `obligations.js` may import `services/<name>/index.js`. And it already does —
`features/commodities/obligations.js:1` imports the commodities service and takes every
one of its 8 gate operand lists from it (`commodities.passportCommodities()` etc.), as do
`features/cph-number/obligations.js:1-2` and `features/additional-details/obligations.js:1-2`.
If the service returned codes, the model would gate on codes **with no change to any
obligations.js file at all**. That is as far from "structural" as it gets.

### 2.4 The code↔label seam for A's centre of gravity ALREADY EXISTS in the service

`services/commodities/stub.js:3-10` and `services/commodities/index.js:18-21`:

```js
export const COMMODITY_CODES = { Cow: '0102', Horse: '0101', Cat: '01061900', Dog: '01061900', Fish: '0301' }
export const commodityCodeFor = (name) => COMMODITY_CODES[name]
export const commodityNameFor  = (code) => Object.keys(COMMODITY_CODES).find(…)
```

L1-A built its whole "structural" case on `commoditySelection` storing an English display
name that 7 conditional identifier fields gate on. But the commodities service **already
ships a name↔code map and both lookup directions**. Nobody wired the gates to it. That is
textbook "not built" mistaken for "cannot be built" — the exact failure mode this
verification pass exists to catch. **C4 is right and L1-A is wrong.**

### 2.5 Where I looked for a structural obstacle and found none

- Engine (`engine/evaluate/{predicate,complete,reconcile}.js`) — no label awareness.
- `wipeOnExit` / frame resolution (`predicate.js:31-69`) — keyed on obligation **ids**, not values.
- `includesUnion` (`predicate.js:4-10`) — reads `activatedBy.includes` as an opaque set; works identically on codes.
- Controller reach-ins (`features/commodities/animal-identification.controller.js:43,68,132`) read `obligation.activatedBy.includes` directly to drive rendering — an entanglement, and 3 more sites to touch, but a *consumer* coupling, not a model limitation.

---

## 3. Where the claim is wrong or thin

### 3.1 "2 of its 12 activatedBy sites" — the arithmetic is wrong. It is **2 of 15**.

`grep -rn "activatedBy" features/**/obligations.js` returns **15 declaration sites**:
import-purpose ×1 (:6), origin ×1 (:15), transport ×3 (:20, :32, :42), commodities ×8
(:13, :33, :39, :45, :51, :70, :76, :83), additional-details ×1 (:9), cph-number ×1 (:7).

**12 is the count of `features/*/obligations.js` FILES** (`find … -name obligations.js` →
12), which is what L1-A §1.1 counted. C4 has silently reused that figure as a gate count.
So the true split is **2 coded : 13 label-valued** (not 2:10 as L2 also states at :57).
The direction of the claim is unaffected; the number in it should not be quoted.

### 3.2 The `equals: 'yes'` example is close to worthless

`regionOfOriginCodeRequirement` is a yes/no radio. `'yes'` is a "code" only in the trivial
sense that its label happens to be `'Yes'`; there is no code→label map behind it and no
translation seam being demonstrated. Of C4's two exemplars, only `'internalMarket'` actually
demonstrates *gate-on-the-code-behind-the-label*. A head-count argument resting on one real
exemplar is fragile — which is why §2.1–2.4 above, not the head-count, should carry the claim.

### 3.3 Omitted hazard: the commodity code space is **not injective**

`services/commodities/stub.js:6-8`:

```js
  // Cat and Dog share the CN code; reverse lookup returns Cat first
  Cat: '01061900',
  Dog: '01061900',
```

A naive "swap the display names for CN codes in the operand lists" migration **collapses Cat
and Dog into one gate value**. It happens to be harmless today (every list containing Cat also
contains Dog — `PASSPORT`, `TATTOO`, `PERMANENT_ADDRESS`), but the moment a rule applies to Dog
and not Cat, CN code cannot express it. The migration therefore needs a *stable commodity id*
that the reference data does not currently carry. This is a reference-data modelling job, not
an obligation-model job — so it stays on the "mechanical" side of the line — but it is real
work that C4's costing does not mention, and it is precisely the kind of thing that turns a
"just swap the strings" estimate into a two-week job.

### 3.4 Understated: the transport gates hold their English **inside the model file**

`features/transport/obligations.js:22,34,44` hardcode `['Railway','Road Vehicle']`,
`'Commercial'`, `'Private'` as literals — they do **not** route through
`services/transport-reference/`, unlike the commodity/cph/additional-details gates. So the
retrofit is uneven: 12 of the 13 label-valued gates can be fixed by changing a *service*, but
the 3 transport ones need the obligation files edited. Still mechanical; worth costing separately.

### 3.5 Does C4 credit a doc the code doesn't honour? No — the opposite

`docs/services.md:47-50` says "do not add a lookup" for `meansOfTransport`/`transporterType`,
and the code honours it: `notification-mapper.js:451` passes the label straight out, and
`:487-488` maps it straight back in on resume. Both legs of the mapper would need the
code↔label translation. Two sites plus a re-pin of `skeleton-equivalence.test.js`. The doc and
the code agree, and the constraint is a **wire-format constraint inherited from the legacy
skeleton**, not a property of A's obligation model — which is the strongest possible version
of C4's own point.

---

## 4. Net effect on the comparison

C4 stands, and L1-A §4's "structural limitation" verdict must be struck. But note what this
does *not* rescue: A still has **no declaration site where a value domain and its label map
meet** — the commodities service happens to carry `COMMODITY_CODES`, the transport service does
not, and nothing in A can see, derive from, or verify the relationship. That is the real
A-vs-B model gap (L2 §2 B1), and it is untouched by this refutation. The correction is that A's
i18n bill is a **large mechanical bill**, not an impossibility — which makes the third option
cheaper to reach from A than L1-A implied, and makes the case for B's `staticEnum(options,{labels})`
seam rest on *verifiability and single-declaration*, not on "A literally can't".
