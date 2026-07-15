# L3 — Adversarial verification — C3 (collections-cardinality)

**Claim under test:** In B a collection item cannot exist without data — an instance IS the
prefix-set of its DESCENDANTS' storage keys, groups have no storage. This *forces* the
placeholder seed, *forces* a 37-LOC evaluator-bypassing seed-picker that understands only 2
of the 4 gate-helper shapes and silently swallows the Add, and produces an untested
silent-data-loss hazard.

**Verdict: AMENDED.** Every *descriptive* fact checks out at the cited lines, and the
data-loss hazard is in fact **worse** than claimed. But the claim's load-bearing word —
*forces* — does not survive. The seed-picker and the data-loss hazard are properties of B's
**manifest**, not of B's **model**. B can represent an empty instance today, with zero
evaluator changes. And two of the four supporting details are wrong.

---

## 1. What I verified as TRUE (quotes real, mean what the claim says)

| Cited | Verified |
|---|---|
| `evaluator.js:390-421` | `prefixLen = obligationAncestorGroups.get(o.id).length + 1`; loop is `for (const desc of obligationDescendants.get(o.id))`. And `buildDescendants` (`:202-218`) is documented and coded as **"Transitive descendants (excluding self)"** — so the group's own id is genuinely never scanned. ✅ |
| "nothing writes `fulfilments[commodityLine.id]`" | `grep -rn "commodityLine.id\|unitRecord.id"` — every hit is a **read** of the derived `state.obligations[...].records`. No write. ✅ |
| "a marker would be stored and ignored" | `purgeStorage` (`:342-376`): a group is in scope, category `group`, falls to `else if (isKeyedRecord(fulfilment))` → **kept verbatim**. `enumerateGroupFulfilmentIds` never reads it. Stored and ignored. ✅ |
| `lib/state.js:97-118` | `addCommodityLine(request, commodityLineObligation, seedObligation)` — `commodityLineObligation` is **never referenced in the body**. Seeds `fulfilments[seedObligation.id][id] = ''`. ✅ |
| `features/units/controller.js:176-185` | The chicken-and-egg is stated verbatim in the JSDoc. ✅ |
| `:186-222` | `pickSeedObligationForLine` is exactly 37 lines and sniffs `obligation.applyTo?.metadata`. ✅ |
| `:277-283` | `if (!seed) return h.redirect(...)` — the Add is dropped with no error. ✅ (but see §3.3) |
| No guard on the hazard | `grep -rni "warn\|confirm\|interstitial" features/ lib/` → only `govuk-button--warning` CSS classes on Delete buttons. Nothing intercepts a commodity-code change. ✅ |
| Doc-vs-code | `obligations.md:1250-1252` asserts a marker map is "authoritative"; `:1173-1176` says "groups have no storage of their own". The code implements `:1173-1176`. Worse than reported: the doc's own storage example at `:1167` prints `unitRecord: { 'line1/unit1': {}, ... }` — i.e. the doc contradicts itself **inside the same code block** it is 6 lines above. ✅ |

## 2. Where the claim is UNDERSTATED (I strengthened it)

**The data-loss hazard is not confined to unfilled placeholder seeds.** The claim's example
(`01061900` → `0102`) is the *mild* case. Read the allowlists (`obligations.js:601-622`):

- `01061900` (pets) opens `{passport, tattoo, permanentAddress}`
- `0102` (cattle) opens `{passport, tattoo, earTag}`

`passport` and `tattoo` are in **both** — so a pets unit survives that change *if the user
happened to fill one of them*. Only the seed is guaranteed lost, because
`pickSeedObligationForLine` prefers mandatory (`:196-200`) and `permanentAddress` is the sole
mandatory unit leaf (`obligations.js:706-717`) — so it is *always* the seed on a pets line,
and it is exactly the leaf that leaves scope.

The genuinely catastrophic case is a **disjoint** pair, and one exists:

- `0101` (horse) opens `{passport, horseName}`
- `010410` (sheep) opens `{earTag}` only (`noSpecificIdentifier` is false for `010410`
  because it is in `EAR_TAG_COMMODITIES`)

Change a line `0101` → `010410` and **every stored key on every unit of that line is purged**
— fully-filled units, not just seeds. The units silently cease to exist along with all their
data. Nothing warns; no test covers it.

**Test count is wrong in the claim's favour-check:** `e2e-units.test.js` has **12** `it()`
cases, not 14 (two of the grep hits are `line.split(...)`). None covers a parent-field change
after units exist. The gap is real.

## 3. Where the claim is WRONG or materially overstated

### 3.1 "A collection item cannot exist without data" — false. It cannot exist without a KEY on an IN-SCOPE descendant.

The seed is `''` (`lib/state.js:110-114`, `:196-199`). An empty string is not data. A line or
unit with every field blank **is** representable, renders "Not filled" on every row, and
classifies Not Started. `purgeStorage` never strips empty-string values — its only emptiness
test is `Object.keys(...).length > 0` on the *map*, not on the values (`:364`, `:371`).

So B's real constraint is **scope-coupling**, not data-presence: an instance needs one storage
key on a descendant leaf that is *currently in scope*. Every consequence the claim lists flows
from the scope half of that sentence, not the data half. This is not pedantry — it changes the
diagnosis, and therefore the fix (see 3.2).

### 3.2 "Forces" — false. This is NOT-BUILT, not CANNOT-BE-BUILT. Two zero-engine-change fixes exist.

The claim is doing the exact thing L3 exists to catch: reading a manifest property as a model
property.

**Counter-example A — a presence marker is expressible today, with no evaluator change.**
Declare a childless, `applyTo`-less, `status`-less obligation `within: unitRecord`. Trace it
through the pipeline:

- `classifyObligations` (`evaluator.js:166-185`): no `indexedBy`; no `applyTo`; `status`
  undefined so not `field`; no children so not `group` → **`single`**.
- `makeInScopeCheck` (`:301-325`): no own `applyTo`, ancestors `unitRecord`/`commodityLine`
  have no `applyTo` → **unconditionally in scope, forever**.
- `purgeStorage` (`:367-368`): `category === 'single'` → `amendedFulfilments[id] = fulfilment`
  — **kept verbatim, never record-filtered**. Immune to any commodity-code change.
- `enumerateGroupFulfilmentIds` (`:408`): it *is* a descendant of `unitRecord` (and of
  `commodityLine`), so its keys `{'line1/unit1': true}` enumerate the unit **and** the line.
- `coverage.test.js:27-78`: one line in `KNOWN_UNWIRED` (which already exempts
  `commodityLine` and `unitRecord` on exactly this "structural, no value" grounds).

Cost: **one manifest entry, one allow-list line**, plus rewiring the two seed writes and the
delete. `pickSeedObligationForLine` dies. The data-loss hazard dies. The evaluator is not
touched. This is *smaller* than the ~10-LOC evaluator patch L2 §4.2 proposed.

**Counter-example B — even cheaper: delete one `applyTo`.** A group-scoped leaf with a
`status` and **no** `applyTo` classifies as `field` (`:176-177`), and `purgeStorage` **never
record-filters `field` storage** (it falls to the `isKeyedRecord` keep-as-is branch, `:369`).
That is precisely why **depth 1 has neither problem**: `commodityCode` is ungated `field`
(`obligations.js:412-416`), so `addCommodityLine` needs no picker and a line never vanishes.
The depth-2 pathology exists solely because **all 7 unit leaves happen to carry an `applyTo`**
(`obligations.js:631-717`). One always-present unit-scoped field — and B's own model already
demonstrates the pattern one level up — removes both symptoms.

The honest statement is therefore: **B's engine already supports scope-immune instance
storage in two different categories (`single` and `field`); the V4 manifest simply doesn't
use either at depth 2.** "A models X; B structurally cannot" is false for item existence.
Retrofit cost is a manifest edit, not a storage-contract change.

### 3.3 "understands only 2 of the 4 gate-helper shapes" — wrong denominator, and wrong criticism.

There are **5** metadata-bearing `applyTo` factories in `helpers.js`: `allowListed` (`:39`),
`allowListedByPredicate` (`:65`), `anyAllowListed` (`:101`), `branchedGate` (`:132`),
`matches` (`:147`). (`present`, `:165`, returns a predicate, not an `applyTo`.) So the "4" is
wrong.

More importantly the criticism inverts: **only `allowListed` and `allowListedByPredicate` can
legally gate a group-scoped leaf at all.** They are the only two that route through
`filterAndProject` (`:182-210`) and return a per-record `records` array. The other three
return *scalar* decisions with no `records` — and a within-group leaf is category
`derived-leaf` (`applyTo && within`, `:174-175`), whose purge branch does
`new Set(decision?.records ?? [])` and then keeps only matching records (`:350-366`). A unit
leaf gated by `anyAllowListed` / `branchedGate` / `matches` would have **every record purged
on every evaluate**. They are structurally unusable at that position.

So `pickSeedObligationForLine` covers **2 of the 2** usable shapes — 100%, not 50%. The
residual gap is narrower than stated: a **hand-written, record-projecting `applyTo`** (which
would carry no `.metadata`, so `if (!meta) continue` skips it). Real, but it is one shape, not
two, and the manifest contains none.

### 3.4 "silently swallows the Add" — a defensive branch, not a live hazard.

`pickSeedObligationForLine` returns `null` only when no unit leaf admits the line's code — but
`identificationDetails` and `description` are an **inverse gate** (`noSpecificIdentifier`,
`obligations.js:674-678`: not in passport ∪ tattoo ∪ earTag ∪ horseName lists). So **every
non-empty commodity code opens at least one unit leaf**. The only null path left is
`if (!lineCode) return null` (`controller.js:187-188`) — an *unset* code — and the
Manage-animals link is gated on the code being set, pinned by a test:
`e2e-units.test.js:170` *"does NOT show the link on a line with no commodity code set yet"*.

The in-code justification is also simply wrong: the comment says *"(e.g. transit-only
cattle)"* (`:279-282`), but `0102` opens `passport`, `tattoo` **and** `earTag`. The swallow is
unreachable through the shipped UI. It is latent fragility, not a live defect, and quoting it
as one of three "consequences" overstates the case.

---

## 4. What survives, sharpened

The prefix-enumeration design does have a real cost, and it is this: **instance existence is
coupled to descendant SCOPE.** In a manifest where every descendant of a group is
conditionally scoped, instances become deletable by a *parent-field edit* — silently, with no
model-level cascade, and here with total data loss on a disjoint code change. B ships exactly
such a manifest at depth 2, and pays for it with a 37-LOC seed-picker and an unguarded,
untested data-loss path.

But that is a **wiring** finding, not an **asymmetric-capability** finding. It does not belong
in `aOnly` as "A can model an empty item; B structurally cannot." It belongs in the shopping
list as: *if you take B's prefix enumeration, take it with a scope-immune presence leaf —
which B's engine already supports and B's own depth-1 layer already demonstrates.*
