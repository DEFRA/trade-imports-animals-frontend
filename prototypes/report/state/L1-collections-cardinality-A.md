# L1 — Collections, nesting and cardinality — SIDE A (`live-animals`)

Clone: `workareas/model-comparison/clone-live-animals`, HEAD b6ac2ed.
Root: `prototypes/standalone/live-animals/`. All paths below are relative to that root
unless prefixed.

## Verdict in one paragraph

Side A's collection model is **small, recursive and genuinely declarative for structure,
scope, wipe and completeness**, and it is the only thing in either prototype that ships a
*cardinality link* — a collection whose maximum entry count is DERIVED from a sibling
answer (`maxEntriesFrom`, DESIGN-DELTA #15). The whole collection-aware engine is ~576 LOC
across 9 files. But the model's vocabulary for cardinality is exactly **two facts**
(`requiredAtLeastOne`, a boolean min-1 floor; `maxEntriesFrom`, a derived max) — there is
no static max, no `min: N`, no `exactly N`, no equality constraint between a count field
and an entry count. Everything else about a collection — the loop UI, item-level field
reveal, the "you have more records than animals" cross-check, per-entry summaries — is
**hand-coded imperatively per collection**, and three separate controllers re-implement the
item-conditional predicate by reaching into `obligation.activatedBy.includes` directly
rather than calling the engine's evaluator. The docs oversell in one place and undersell in
two.

---

## 1. How a repeating group is modelled

A collection is an ordinary obligation object with two extra keys. There is no schema, no
type, no registration step.

`features/commodities/obligations.js:96-124` — the whole domain's collection declarations:

```js
export const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [ /* 7 obligation OBJECTS, not ids */ ],
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP,
  maxEntriesFrom: numberOfAnimalsQuantity      // <- a real object reference
}

export const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [commoditySelection, speciesSelection, numberOfPackages,
         numberOfAnimalsQuantity, animalIdentifiers],   // <- a collection inside item[]
  requiredAtLeastOne: true
}
```

`item` holds **real JS object references**, so nesting is literal containment, and
`maxEntriesFrom` is a pointer to the sibling obligation object — not a string id, not a
path expression, not a closure. Everything downstream is a walk over that object graph.

**Live inventory: 3 collections, max depth 2.**

| Collection | Depth | Declared at | Cardinality facts | Item fields |
|---|---|---|---|---|
| `commodityLines` | 1 | `features/commodities/obligations.js:113-124` | `requiredAtLeastOne` | 5 (one of which is a collection) |
| `animalIdentifiers` | 2 (inside `commodityLines.item`) | `features/commodities/obligations.js:96-111` | `requiredAtLeastOne`, `requiredOneOf` (6-member group), `maxEntriesFrom: numberOfAnimalsQuantity` | 7 |
| `documents` | 1 | `features/documents/obligations.js:21-30` | **none** (an empty collection is complete) | 4 |

Nothing else in the domain is a collection. The 5 party roles
(`features/addresses/obligations.js:1-9`) are **scalar obligations whose value happens to
be a nested object** — the model cannot see inside them (see limitation L5).

### Nesting depth

Depth-2 is what ships. Depth is **structurally unbounded**: every consumer recurses on
`obligation.item` with no depth parameter and no cap —
`registry.js:32-42` (`walkObligations`), `registry.js:44-71` (`walk`),
`engine/evaluate/complete.js:43-52` (`entryComplete` → `collectionComplete` → `entryComplete`),
`flow/dispatch.js:10-24` (`ownerOfObligation` walks ancestors until it finds a page).
Nothing in the engine reads a depth constant. Depth 3 would need zero engine changes; it
would need a new hand-written loop controller (see §6).

`registry.js:44-71` is the load-bearing piece — `walk(answers)` materialises the *template*
tree against a concrete answers map, yielding one node per **instance** plus the
innermost-first `frames` chain:

```js
if (obligation.item) {
  const entries = valueAt(answers, path) ?? []
  for (let i = 0; i < entries.length; i++) {
    const itemFramePath = [...path, i]
    yield* walk(answers, obligation.item, itemFramePath, key,
      [{ framePath: itemFramePath, siblings: obligation.item }, ...frames])
  }
}
```

That frames chain is what makes per-instance scope and cross-frame predicates possible.

---

## 2. Indexed paths

`lib/path.js` (63 LOC) is the entire path layer. Two vocabularies, bridged not unified:

- **template address**, index-free: `commodityLines.animalIdentifiers.horseName`
  (`registry.js:73-75` builds `byPathMap`; used by dispatch coverage and `byPath`)
- **instance path key**, bracketed: `commodityLines[0].animalIdentifiers[1].horseName`
  (`lib/path.js:1-10` `pathKey`; used by scope and wipe)

`lib/path.js:33-41` `deleteAt` is index-aware (`splice` for numeric leaves, `delete` for
string leaves), and `lib/path.js:47-57` `wipeOrder` sorts sibling array deletions
descending so a batch of wipes at the same collection does not shift indices under itself:

```js
if (typeof pathA[i] === 'number' && typeof pathB[i] === 'number') {
  return pathB[i] - pathA[i]     // higher index deleted first
}
```

`flow/dispatch.js:15-16` bridges the two: `address.replace(/\[\d+\]/g, '')` before an owner
lookup. `flow/dispatch.js:32-39` boot-rejects an obligation id containing `.`, `[` or `]` —
path-safety is enforced, loudly, at startup.

Pinned in `indexed.test.js:35-47` (per-instance scope keys at depth) and
`engine/evaluate/cross-frame.test.js` (18 cases).

---

## 3. Cardinality — what is declarative and what is not

### 3a. MIN — `requiredAtLeastOne` (declarative, boolean only)

`engine/evaluate/complete.js:58-65`:

```js
export const collectionComplete = (obligation, value, ctx = null, includesMember = null) => {
  const entries = value ?? []
  if (obligation.requiredAtLeastOne && entries.length === 0) return false
  return entries.every((entry, index) => entryComplete(...))
}
```

That is the **whole** minimum-cardinality implementation. It is a boolean: 0-or-more, or
1-or-more. `min: 2` is inexpressible. There is no `minEntriesFrom`.

Note where the floor bites: **completeness only**, never the write path. You can save a
collection with zero entries; the hub row goes NOT_STARTED / IN_PROGRESS and
`readyForCheckYourAnswers` stays false (`flow/section-status.js`, `engine/status.js:72-78`).

Because `commodityLines` is one line **per (commodity, species) pair** (DESIGN-DELTA #14),
the per-line `requiredAtLeastOne` on `animalIdentifiers` gives the ruled "at least one
identifier record **per species**" floor for free — the floor is per-frame because the
collection is per-frame, not because anything declares "per species". That is elegant, and
it is an accident of the store grain rather than a modelled fact.

### 3b. MAX — `maxEntriesFrom` (declarative, DERIVED from another answer)

This is A's stand-out asymmetric capability. `engine/evaluate/cardinality.js:20-31` — the
entire implementation, 12 lines of logic:

```js
export const collectionCapAt = (answers, collectionPath) => {
  const obligation = registry.byPath(templatePathOf(collectionPath))
  const countObligation = obligation?.maxEntriesFrom
  if (!countObligation) return null
  const value = valueAt(answers, [...collectionPath.slice(0, -1), countObligation.id])
  if (!isAnswered(value)) return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 ? count : null
}
```

The reference resolves **in the frame that holds the collection** — `collectionPath.slice(0,
-1)` — so `commodityLines[0].animalIdentifiers` is capped by
`commodityLines[0].numberOfAnimalsQuantity` and never by line 1's. Enforced at exactly one
point, `engine/write.js:20-28`:

```js
const cap = collectionCapAt(journey.answers, collectionPath)
if (cap !== null && list.length >= cap) return null    // store untouched
```

Ruled semantics, all pinned in `store-ops.test.js:394-517` (6 cases):
unanswered count ⇒ **no cap** (the floor still bites at submit); non-integer ⇒ no cap;
per-frame resolution (one line at its cap does not block a sibling line);
a collection without the marker is byte-for-byte unaffected.

**What it is NOT.** It is a MAX only. It does not assert `records === declaredCount`;
1 identifier record for 100 animals is complete (DESIGN-DELTA.md:706-708, deliberate, per the
V4 banner rule). And it is **one-directional**: the model constrains appends against the
count, but nothing in the model protects the count against the records. The inverse check —
lowering `numberOfAnimalsQuantity` below the existing record count — is **hand-coded in a
controller**, `features/commodities/consignment-details.controller.js:126-145`
(`countDropIssues`, 20 LOC, builds its own GDS error and summary link). So *the same
cardinality link is declarative in one direction and imperative in the other.*

### 3c. Static max — ABSENT

There is no `maxEntries: 5`. `collectionCapAt` can only dereference an obligation and read
an answer; a literal cap has no home in the vocabulary. Cheap to add (a `maxEntries` branch
in `cardinality.js`), but today it is not there.

### 3d. Cardinality LINKS between collections — ABSENT

`maxEntriesFrom` links a collection to a **sibling scalar in its own enclosing frame**. It
cannot reference a count in a *different* frame, cannot sum across a collection
(`sum(commodityLines[].numberOfAnimalsQuantity)`), and cannot constrain one collection's
length against another collection's length. `cardinality.js:24` hard-codes the resolution to
`[...collectionPath.slice(0, -1), countObligation.id]` — one frame, one sibling. Any other
link shape requires an engine change.

---

## 4. Add / remove / edit item flows

**Engine primitives** (`engine/write.js`, 95 LOC — the only side-effecting surface). All
take a **path**, so all work at any depth:

| Op | Line | Reconciles (wipes)? | Cap-aware? | Live callers |
|---|---|---|---|---|
| `appendEntryAt` | 20-28 | **NO** | yes | animal-identification:511, documents:269 (via `appendEntry`) |
| `updateEntryAt` | 30-46 | **NO** | no | consignment-details:178 |
| `removeEntryAt` | 48-60 | yes | n/a | animal-identification:548, documents:311 (via `removeEntry`) |
| `reconcileEntriesAt` | 62-78 | yes | **no** | search:134, consignment-details:195 |
| `commit` | 11-18 | yes | n/a | every non-collection page |

`appendEntryAt` not reconciling is documented and defensible (`docs/scope-and-wipe.md:115-118`
— a fresh entry cannot take anything out of scope). **`updateEntryAt` not reconciling is
neither documented nor sound**: it is the one op that changes an existing entry's field
values in place, which is precisely the operation that can push a sibling field out of
scope. See limitation L2.

`reconcileEntriesAt` (DESIGN-DELTA #14, `engine/write.js:62-78`) is the most interesting
write op — a **desired-state batch reconcile**: caller hands the full desired list plus a
key function; existing entries whose key survives are kept byte-for-byte *including their
nested collections*, new keys append their seed, dropped keys are removed, then the standard
reconcile+wipe pass runs. That is what makes the batch commodity-search page
(`features/commodities/search.controller.js:134-140`) able to re-select without destroying a
line's identifier records.

**UI flows are entirely hand-written, one per collection.** There is no generic loop:

- `features/documents/controller.js` (358 LOC) — single-page add-another loop: entry form +
  read-back table + per-row Remove, plus the cdp-uploader integration.
- `features/commodities/search.controller.js` (147 LOC) — batch create via
  `reconcileEntriesAt`.
- `features/commodities/consignment-details.controller.js` (207 LOC) — edit-in-place of
  every line's quantities on one page, per-row Remove, count-drop block.
- `features/commodities/animal-identification.controller.js` (566 LOC) — the depth-2 loop:
  one card per line, entered-records table, counter-driven entry form
  ("Enter details for {species} N of M", `:249-252`), Save-and-add-another /
  Save-and-finish, at-cap state (`:330`, `:340-346`), stale-at-cap race error (`:466-476`).

That is **1,278 LOC of bespoke collection UI over ~576 LOC of collection-aware engine.**
`docs/decisions.md:93` and `docs/add-a-collection.md:130-134` own this explicitly: "a
repeating collection has no uniform-widget projection, so each loop owns its own rows and
copy."

Guards that exist because the primitives are generic: `engine/write.js:8-9`
(`Number.isInteger` — `splice(NaN,1)` would destroy entry 0) and the parent-index validation
each nested controller must copy by hand
(`features/commodities/animal-identification.controller.js:546-554`;
`docs/add-a-collection.md:198-212` says "copy this guard into any new nested controller" —
i.e. it is a convention, not an engine invariant).

---

## 5. Collection-level status and FACETS

`engine/status.js` (79 LOC) is collection-aware in a way that is genuinely novel. `statusOf`
takes **status parts**, and a part is either an obligation id (a string) or a **collection
facet** — an object naming a collection plus an `only` / `except` filter over its item
fields (`engine/status.js:11-21`):

```js
const facetMemberFilter = (part) =>
  part.only ? (member) => part.only.includes(member.id)
            : (member) => !part.except.includes(member.id)
```

`flow/task-rows.js:27-37` uses this to split **one stored collection across two hub task
rows** without moving any data:

```js
{ id: 'commodities',           parts: [{ collection: 'commodityLines', except: ['animalIdentifiers'] }] },
{ id: 'animalIdentification',  parts: [{ collection: 'commodityLines', only:   ['animalIdentifiers'] }] },
```

The filter threads all the way down into `entryComplete` as `includesMember`
(`engine/evaluate/complete.js:5-22`), including a subtle correctness detail: the
`requiredOneOf` group check only fires for a facet that actually **owns** a member of the
group (`complete.js:11-15` `groupOwned`), so the "commodities except identifiers" facet is
not held hostage by the identifier at-least-one rule. Five statuses roll up
(NA / OPTIONAL / NOT_STARTED / IN_PROGRESS / FULFILLED, `engine/status.js:59-79`).

This is fully declarative and is, as far as I can see, the single cleanest idea in A's
collection model: **presentation grouping is decoupled from storage grouping**, and the
engine still gives one status per row.

---

## 6. Item-level conditionality

Declarative, and it is the model's deepest piece of machinery. Three frame modes crossed
with four operators, all interpreted in **one 69-LOC file**,
`engine/evaluate/predicate.js`:

- **same-frame by sibling identity inference** (no `frame` key) — `predicate.js:64-68`: if
  the referenced obligation is in the same `item[]` list, resolve inside this entry's frame;
  otherwise resolve as a top-level answer. Live carrier: `numberOfPackages` gated on its
  sibling `commoditySelection` (`features/commodities/obligations.js:11-18`).
- **`frame: 'enclosing'`** — `predicate.js:38-48`: walk strictly outward
  (`frames.slice(1)`) to the nearest ancestor frame holding the reference. Live carriers: all
  7 `animalIdentifiers` item fields, each gated on `commodityLines[i].commoditySelection`
  one frame out (`obligations.js:25-29, 62-66, 80-85`).
- **`frame: 'anyItem'`** — `predicate.js:50-62`: a notification-level field gated on ANY
  item of a collection satisfying the predicate. Live carriers:
  `features/cph-number/obligations.js:4-13` (`countyParishHoldingCph`) and
  `features/additional-details/obligations.js:11`.
- **`notInUnionOf`** — `predicate.js:20-24` + `includesUnion:4-10`: the complement of the
  union of *other obligations'* `includes` lists, derived by reference at runtime. Live
  carriers: the two free-text fallback identifier fields
  (`obligations.js:62-78`) — "show these only when no typed identifier applies". Adding a
  new typed identifier automatically shrinks the fallback's gate. That is a genuinely
  data-driven negation and I have not seen it elsewhere.

Per-instance wipe follows: `engine/evaluate/reconcile.js:32-46` names the exact out-of-scope
instance paths holding data (with prefix-collapsing so a wiped parent does not also list its
children), and the write layer destroys them. Proven at depth 2 in
`store-ops.test.js:519-541` — changing `commodityLines[0].commoditySelection` from Cat to
Horse destroys `commodityLines[0].animalIdentifiers[0].permanentAddress` and nothing else.

**BUT — the render side does not use any of this.** Every page that must *show or hide* an
item-conditional field re-derives the predicate by hand, reaching into the obligation's
internals:

- `features/commodities/animal-identification.controller.js:42-43`
  `const typeApplies = (obligation, commodity) => obligation.activatedBy.includes.includes(commodity)`
- `:67-68` `fallbackApplies` → `!includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)`
- `:131-132` `permanentAddressApplies` → `permanentAddress.activatedBy.includes.includes(commodity)`
- `features/commodities/consignment-details.controller.js:17-18` `packagesApply` →
  `commodities.packageCountCommodities().includes(commoditySelection)` (re-reads the *service*
  list, not even the obligation), re-used by `features/check-answers/controller.js:253`.

None of these call `evalPredicate`. They are correct today only because the author knew each
gate's operator and frame. Change `permanentAddress` from `includes` to `equals` and
`permanentAddressApplies` throws on `undefined.includes`. So item-level conditionality is
**declarative for storage/scope/wipe/status, imperative for rendering** — 5 hand-written
re-derivations of gates the engine already evaluates.

---

## 7. Where the docs disagree with the code (findings in their own right)

1. **`docs/add-a-collection.md:254-260` is flatly wrong.** It ends with a section titled
   "The one hard limit — The model cannot express cross-frame conditionality: a sub-field
   gated on a value in an enclosing frame, such as a future
   `commodityLines[i].animalIdentifiers[j].x` gated on `commodityLines[i].y`." That is
   *exactly what ships*: `frame: 'enclosing'` (`predicate.js:38-48`) with 7 live carriers.
   The doc also still describes the removed car domain (`drivers[i].claims[j]`, inc-025) and
   says "there is no live nested collection until M2's `animalIdentifiers`" (`:17-20`) —
   which landed. **The single guide a newcomer would read to add a collection is a release
   or two stale and understates the model.**
2. **`docs/limits.md:16` is stale in the other direction**: "`complete.js#entryComplete` does
   not yet resolve enclosing gates (a required enclosing-gated field would be treated as
   owed even off-gate)". It does now — `complete.js:35-41` threads an opt-in `ctx`
   (DESIGN-DELTA #5). Except… see L1 below, where that statement is *still true* for one
   caller.
3. `nested.test.js:7` is titled "nested collection completeness (synthetic — no live
   carrier)". There is a live carrier. Cosmetic.

`DESIGN-DELTA.md:685-754` (#15) and `docs/obligation-model.md` are the accurate documents.
`docs/add-a-collection.md` is the inaccurate one.

---

## 8. Cost of change (retrofit relevance)

- **Add a field to an existing collection item**: 5 places (`docs/add-a-field.md:16`) —
  obligations.js, controller schema, controller commit, template, hand-composed CYA row. At
  depth 2 you also touch the loop controller's `TYPE_FIELDS` / `FALLBACK_FIELDS` tables and
  its `scopedFields` derivation (`animal-identification.controller.js:45-129`).
- **Add a new collection**: the model edit is ~10 lines; the loop is a new bespoke
  controller + template (147–566 LOC of precedent), plus a `contract.test.js` case
  (`docs/add-a-collection.md:214-228`), plus the parent-index guard by hand.
- **Add a new cardinality *shape*** (static max, min-N, exactly-N, cross-collection link):
  engine change in `cardinality.js` (31 LOC) + an enforcement point. Small, but it is an
  engine change every time — the cardinality vocabulary is closed.

---

## 9. Findings ledger

### Declarative (data the engine interprets)
- Collection structure + unbounded nesting (`collection: true` + `item: [obligations]`).
- Min-1 floor (`requiredAtLeastOne`).
- **Derived max from a sibling answer (`maxEntriesFrom`)** — the asymmetric capability.
- Sibling-at-least-one group inside an entry (`requiredOneOf`).
- Per-instance scope, per-path wipe, per-entry and per-collection completeness at any depth.
- Item-level conditionality: 4 operators × 3 frame modes, incl. data-driven negation.
- Collection facets for status (one collection → many task rows).
- Boot-time coverage assert that every obligation at every depth is collected by exactly one
  page (`flow/dispatch.js:55-63`).

### Imperative (real, working, hand-coded per case)
- Every loop UI (4 controllers, 1,278 LOC).
- Every render-side reveal of an item-conditional field (5 hand-rolled predicate re-derivations).
- The count-drop cross-check (the inverse of `maxEntriesFrom`), 20 LOC in a controller.
- The "at least one identifier per animal" submit-time message and the empty-record guard
  (`animal-identification.controller.js:478-486`) — `requiredOneOf` drives *status*, but the
  save-time error is hand-written.
- Parent-index validation on every nested write.

### Absent
- Static max entries; `min: N`; exactly-N; entry-count == answer equality.
- Cross-collection or cross-frame cardinality links; aggregate (sum/count over a collection)
  as a first-class model fact.
- Declarative ownership of a sub-field by a page other than its collection's owner.
- Any concept of a reusable field GROUP / sub-object (addresses are opaque blobs).
- Sort/reorder/move of entries; entry identity beyond array index.
