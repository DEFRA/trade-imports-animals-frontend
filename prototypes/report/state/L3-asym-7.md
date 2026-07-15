# L3 — Adversarial verification — asymmetry #7 (c-031 count-drop block)

**Capability:** Arithmetic / count-comparison gate — lowering a species' animal count below
its existing identifier-record count must BLOCK the save with a named-species GDS error.

**Claim under test:** "the weaker side CANNOT do this without changing its model." Direction
*neither* — both sides hand-code. Two structural pillars:
- **P1 (A):** A cannot express the CONDITION in-model — A's closed vocabulary has no
  arithmetic operator, so it needs a novel `greaterThan` operator = engine edit.
- **P2 (B):** B's closures COULD compute the comparison, but B has "no submit path and no
  mutation site at which to enforce a cardinality decision," so it too hand-codes.
- **Claimed cost:** third option needs BOTH B's arithmetic closure AND A's write-time
  enforcement site (`appendEntryAt`).

## Verdict: **REFUTED.** Both pillars are false against the source.

Neither side needs a model/engine change. Each can implement the count-drop rule as a
~10-line *additive* edit in a layer it already ships. The "structural asymmetry" evaporates:
it is two pieces of unbuilt (A) / un-ported (B) work in existing, purpose-built machinery.

---

## P1 REFUTED — A already expresses this exact comparison in-model (`maxEntriesFrom`)

A does **not** need a `greaterThan` operator. The cardinality relation "identifier-record
count ≤ animal count" is **already declared as data on the model literal**:

```js
// features/commodities/obligations.js:96-111
export const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [ ... ],
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP,
  maxEntriesFrom: numberOfAnimalsQuantity        // <-- the bound, in-model
}
// commodityLine.item = [ ..., numberOfAnimalsQuantity, animalIdentifiers ]  (:113-123)
//   → the count field is a SIBLING of the collection in the same frame
```

The engine already computes the comparison the rule needs:

```js
// engine/evaluate/cardinality.js:20-31  (collectionCapAt)
const countObligation = obligation?.maxEntriesFrom
const value = valueAt(answers, [...collectionPath.slice(0, -1), countObligation.id])
return Number.isInteger(count) && count >= 0 ? count : null
// engine/write.js:23-24
const cap = collectionCapAt(journey.answers, collectionPath)
if (cap !== null && list.length >= cap) return null   // length-vs-count comparison
```

`collectionCapAt` is a first-class, exported engine primitive (`engine/index.js:14`) that
resolves a cap from a **sibling count field** and compares it against a **collection
length**. That IS the count-drop arithmetic. The rule the claim says is inexpressible is the
model's *flagship cardinality primitive*, already carried by the very collection in question.

**What A actually hand-codes** (`consignment-details.controller.js:126-145`,
`countDropIssues`) is narrower than the pillar states: it is the enforcement of the
already-declared bound *in the opposite direction* — at the count-EDIT mutation site rather
than at `appendEntryAt` — plus the GDS error copy that names the species. `maxEntriesFrom` is
wired MAX-only into `appendEntryAt` (`write.js:23-24`), so the *inverse* (count edited down
below the record count) is checked by hand. That is an **enforcement-site + error-copy gap,
not an expression gap.** The condition lives in the model as data. No `greaterThan` operator,
no engine edit, is required to express it — it is already expressed.

(This aligns with L2-collections §1.2 / L2-evaluation-engine §4, both of which record
`maxEntriesFrom` as A's shipped cardinality link and call the inverse "20 LOC of hand-written
controller" — i.e. controller code, not a missing operator.)

---

## P2 REFUTED — B has a wired submit-time enforcement site AND a cross-field predicate layer built for this

The pillar's "B has no submit path and no mutation site at which to enforce a cardinality
decision" conflates *storage mutation* (which B indeed keeps imperative in `lib/state.js`)
with *save-time validation enforcement* — which B ships and wires to block saves.

### The enforcement site exists and blocks saves

```js
// lib/line-page-controller.js:103-129
const result = validatePagePayload(page, request.payload, state, { ... })
if (!result.ok) {
  return h.view('shared/page', { ..., errorSummary: result.errorList })  // save BLOCKED, GDS summary
}
...
return h.redirect(urlForNext(target))                                      // only on ok
```

`numberOfAnimals` is a `within: commodityLine` field (`obligations/obligations.js:439-444`),
so its page save runs through exactly this controller. A failing check re-renders the page
with a GDS error summary and does **not** advance — the precise UX the capability demands.

### A cross-field predicate layer, purpose-built, receives the whole state

B's Domain layer (`domain/index.js:1-25`) explicitly "owns … cross-field rules." Predicates
are `(value, ctx)` and the runtime hands them the **entire fulfilments map plus the current
line's path**:

```js
// engine/index.js:61-100  (validate)
const predicateCtx = { fulfilments, path, siblingValue, ids: ctx.ids }
if (entry.predicate) errors.push(...entry.predicate(value, predicateCtx))
// contract.js:284-290 passes state.fulfilments in; validatePagePayload calls it per field
```

Cross-field reads through this ctx are **already live**: `speciesDomain`
(`domain/index.js:492-499`) reads `fulfilments[commodityCode.id][ctx.path]`; `regionCode`
reads `regionCodeRequirement`. A `numberOfAnimals` predicate can therefore read
`fulfilments` and `ctx.path` (the line id) to count the line's identifier records.

### B models the identifier records to count (`unitRecord`)

`unitRecord` (`obligations/obligations.js:563-592`) is B's per-animal identifier collection —
`passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`, `description` are all
`within: unitRecord` (:631-714). The "existing identifier-record count" is the number of
`unitRecord` instances under `ctx.path`, countable from the composite storage keys
`${lineId}/${unitId}` in `fulfilments`.

### B has already shipped this exact predicate shape

The clincher: B *had* a `SPECIES_ANIMAL_CAP` cross-field predicate on `numberOfAnimals`
through this very mechanism and removed it **only because the caps were fabricated /
spec-invalid**, not because the machinery couldn't do it:

```
// domain/index.js:786-797
// "A prior version of this spike carried a fabricated SPECIES_ANIMAL_CAP map ... that map
//  has been removed because it caused the spike to reject spec-valid values ... The
//  cross-field predicate machinery is still exercised by other domain entries."
```

So B's count-drop rule = a ~10-line predicate body in `numberOfAnimalsDomain`
(`domain/index.js:798-815`): count `unitRecord` instances for `ctx.path`, return a
species-named error object if `value < count`. Purely additive to a layer designed for it,
firing at the existing `validatePagePayload` gate. **No model change. No new mutation site.**

---

## Why the "structural" framing fails

| Pillar | Claim | Reality | Cost |
|---|---|---|---|
| P1 (A) | Needs a `greaterThan` operator = engine edit | `maxEntriesFrom`/`collectionCapAt` already express the length-vs-count comparison in-model | Reuse the existing primitive at the count-write site + error copy (already built as `countDropIssues`) — no operator, no engine edit |
| P2 (B) | No submit path / no mutation site to enforce | `validatePagePayload` in `line-page-controller.js:103-129` blocks saves; domain cross-field predicate layer built for exactly this; `unitRecord` gives the count | ~10-line additive predicate on `numberOfAnimalsDomain` — no model change |

The claimed cost ("third option needs BOTH B's arithmetic closure AND A's write-time
enforcement site, and this is where R1 and the novel-operator finding meet") rests on the two
false pillars. There is no crossing to engineer: each side already has, in a shipped and
purpose-built layer, both the ability to *express* the comparison and a site to *enforce* it.

## Honest residue (real but not structural, and not what the claim says)

- A enforces `maxEntriesFrom` MAX-only at `appendEntryAt`; the DROP direction is enforced by
  hand at the count-edit controller. A *cleaner* A would generalise `collectionCapAt`
  enforcement to the count-write path so both directions flow from the one `maxEntriesFrom`
  declaration — an engine tidy, not a new capability. This is a maintainability item.
- B has not *built* the count-drop rule (B has no count-drop check today and no
  species-labelled copy). But "unbuilt in a purpose-built additive layer" is the opposite of
  "structurally cannot without changing the model."
- The genuinely interesting third-option note is orthogonal to c-031: A's `maxEntriesFrom` is
  a *single-declaration bidirectional* cardinality bound if enforced on both write paths;
  B's domain predicate is fully general but must be *hand-written per rule*. That is a
  design-taste trade (declarative vocabulary vs open predicate), already captured in
  L2-evaluation-engine §3 — not a c-031 asymmetry.

## What I searched / read

- A: `features/commodities/obligations.js:20-124`, `engine/evaluate/cardinality.js`,
  `engine/write.js:20-28`, `engine/index.js:14`,
  `features/commodities/consignment-details.controller.js:110-197`.
- B: `domain/index.js:1-25,127-167,439-502,756-815,1030-1099`, `contract.js:20-39,224-339`,
  `engine/index.js:41-100`, `obligations/obligations.js:397-444,563-714`,
  `lib/line-page-controller.js:103-129`.
- grep across both trees for `maxEntries|cardinality|greaterThan|lessThan|numberOfAnimals|
  animalIdentifier|unitRecord|validatePagePayload`.
