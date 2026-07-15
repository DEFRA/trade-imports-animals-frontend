# L1 — Collections, nesting and cardinality — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` @ d59b432
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(Ancestor `prototypes/model-spikes/obligations-v4-model/` is the frozen EUDPA-277
parent — `evaluator.js` is byte-identical, so nothing in this dimension differs
there. All citations below are the live fork unless stated.)

---

## Headline

Side B has **exactly one collection mechanism**, and it is genuinely elegant:
a group is an obligation that other obligations point at with `within`, and a
group *instance* is **inferred from the composite-key prefixes of its
descendants' storage**. There is no instance table, no `items[]` array, no
index registry. Nesting depth is therefore data-driven and unbounded *in the
model*.

Everything else about collections — creating an item, deleting an item, listing
items, choosing which page an item starts on, capping how many items there may
be — is either **imperative** (hand-written per depth level) or **absent**.

The three things worth taking:
1. `within` + composite `/`-delimited keys + prefix-enumeration (`evaluator.js:390-421`).
2. `requires.anyOf` group invariants as a first-class engine primitive (`engine/index.js:512-539`).
3. Container status **re-derived** from the subtree rather than rolled up, so a
   collection's status falls out of the same 5-way classifier as a page (`engine/index.js:469-474`).

The three things that are not there at all:
1. **Any min/max cardinality.** No `minEntries`, no `maxEntries`, no
   `maxEntriesFrom`. Zero occurrences in the whole spike.
2. **Any cardinality LINK between collections.** `numberOfAnimals` is a plain
   per-line integer with a `>= 1` predicate (`domain/index.js:798-815`) and is
   *completely unconnected* to how many `unitRecord`s the line has.
3. **A declarative Add-another.** Both levels are bespoke controllers, and the
   spike says so explicitly (`RECOMMENDATION.md:462-471`).

---

## 1. How a repeating group is modelled — MODELLED DECLARATIVELY

### 1.1 The declaration is a back-reference, not a marker

```js
// obligations/obligations.js:405-410
export const commodityLine = {
  id: '20e5f607-1829-4c3d-8abc-06d7e8f9a0b2',
  name: 'commodityLine'
  // No applyTo — structural group, always in scope. Instance ids
  // inferred from field-record composite-key prefixes.
}
```

`commodityLine` carries **no `cardinality` field, no `indexedBy`, no `items`
schema, no min/max**. It is a group purely because something else says
`within: commodityLine`:

```js
// obligations/obligations.js:841-843
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
```

Nesting is one more `within`:

```js
// obligations/obligations.js:563-566
export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'unitRecord',
  within: commodityLine,
```

Counts in the V4 manifest (44 obligations):
- **2 groups**: `commodityLine` (depth 1), `unitRecord` (depth 2).
- **5 leaves within `commodityLine`**: `commodityCode`, `commodityType`,
  `species`, `numberOfAnimals`, `numberOfPackages`.
- **7 leaves within `unitRecord`**: `passport`, `tattoo`, `earTag`, `horseName`,
  `identificationDetails`, `description`, `permanentAddress`.
- **Max nesting depth exercised: 2.**

### 1.2 Storage: flat composite keys, no nesting

```js
// obligations/evaluator.js:40-42
const PATH_DELIMITER = '/'
const joinPath = (segments) => segments.join(PATH_DELIMITER)
const splitPath = (key) => key.split(PATH_DELIMITER)
```

`fulfilments[passport.id] = { 'line1/unit1': 'GB123456' }`. Nothing is nested;
the composite path IS the key. `lib/state.js:20` re-declares the same delimiter
so the browser layer agrees.

### 1.3 Instance enumeration: prefix-of-descendants

This is the whole trick, and it is the single cleverest thing in this dimension
on either side:

```js
// obligations/evaluator.js:400-419
for (const o of obligations) {
    if (obligationsByCategory.get(o.id) !== 'group') continue
    ...
    const prefixLen = obligationAncestorGroups.get(o.id).length + 1
    const ids = new Set()
    for (const desc of obligationDescendants.get(o.id)) {
      const descendantFulfilment = amendedFulfilments[desc.id]
      if (!isKeyedRecord(descendantFulfilment)) continue
      for (const key of Object.keys(descendantFulfilment)) {
        const segments = splitPath(key)
        if (segments.length >= prefixLen) {
          ids.add(joinPath(segments.slice(0, prefixLen)))
        }
      }
    }
```

`prefixLen = ancestors.length + 1` is **depth-generic**. A depth-3 group would
take `segments.slice(0, 3)` with no code change. Ancestor scope ANDs down the
chain (`makeInScopeCheck`, `evaluator.js:301-325`), so a line going out of scope
cascades to every unit inside it for free.

**Cost of this design:** a collection item has no independent existence. It
exists iff at least one descendant leaf has a storage key with its prefix. Two
consequences bite, both real (§4.1, §4.2).

### 1.4 Rendering the collection: one flow primitive

```js
// flow/flow.js:438-445
page: 'commodity-details',
presentsForEach: {
  obligation: commodityCode,
  forEachOf: commodityLine,
  mandatoryToProceed: true,
  errors: { required: 'errors.commodityCode.required' }
}
```

`expandPresents` (`engine/index.js:248-272`) turns one `presentsForEach` into
one virtual entry per in-scope instance record. **12 of the 35 pages** in
`flow/flow.js` use `presentsForEach` (5 line-scoped, 7 unit-scoped); 22 are
static `presents`; 1 is a read-only intro. When the group has zero in-scope
records the page collapses to Not Applicable through the ordinary
`classifyEntries` NA rule (`engine/index.js:386-388`) — no special-casing.

---

## 2. Item-level conditionality — MODELLED DECLARATIVELY, and this is B's strongest suit

A leaf inside a group can be in scope for **some instances and not others**,
driven by an answer on a *different, broader* identity level. This is the
`projectionGroup` mechanism, and it works:

```js
// obligations/obligations.js:631-639
export const passport = {
  ...
  within: unitRecord,
  status: 'optional',
  applyTo: allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, [passportReason])
}
```

`commodityCode` is keyed by `line1`; `passport` is keyed by `line1/unit1`. The
helper bridges the identity gap:

```js
// obligations/helpers.js:204-209
const projectionPaths = fulfilmentIdsByObligationId?.get(projectionGroup.id) ?? []
const records = projectionPaths.filter((path) =>
  passingKeys.includes(pathPrefix(path))
)
return { inScope: records.length > 0, records }
```

The evaluator then purges per-record, not per-obligation:

```js
// obligations/evaluator.js:350-363
if (category === 'derived-leaf') {
  const fulfilmentIds = new Set(
    obligationApplicabilityDecisions.get(obligation.id)?.records ?? []
  )
  ... keep only stored records whose fulfilmentId is in that set
```

So: **item-level conditionality is fully declarative and per-instance.** A
cattle unit sees `earTag`/`passport`/`tattoo`; a bird-of-prey unit sees
`identificationDetails`/`description` (inverse gate via
`allowListedByPredicate`, `obligations.js:674-704`). 7 unit-scoped obligations,
5 different whitelists (`obligations.js:601-622`), all data.

The counterpart at notification level — "a scalar becomes applicable because
*any* item in a collection has property X" — is also declarative:

```js
// obligations/obligations.js:510-519
export const cph = {
  applyTo: anyAllowListed(commodityCode, CPH_REQUIRED_COMMODITIES,
    { inScope: true, status: 'mandatory', reasons: [cphReason] },
    { inScope: false })
}
```

That is a **quantifier over a collection** (∃ line : code ∈ list) expressed as
data-ish config. `containsUnweanedAnimals` (`obligations.js:546-555`) uses the
same shape. This is a genuine capability and it is worth stealing.

---

## 3. Collection-level status and invariants — MODELLED DECLARATIVELY

### 3.1 Group invariant (min-1-of-N *within* an instance)

The only cardinality-ish constraint anywhere on Side B:

```js
// obligations/obligations.js:581-593
requires: {
  get anyOf() {
    return [passport, tattoo, earTag, horseName, identificationDetails, description]
  },
  errorCode: 'obligation.unitRecord.identifiersRequired'
}
```

Evaluated by a first-class engine primitive (`engine/index.js:512-539`), one
error per violating instance, with **vacuous satisfaction** when no required
leaf is in scope for that instance (`engine/index.js:524`: `if
(inScopeLeaves.length === 0) continue`). Errors are counted as extra mandatory
concerns by the shared status classifier (`engine/index.js:398-400`), so a
subsection with every field filled but a missing identifier still cannot reach
Fulfilled.

**Note precisely what this is and is not.** It is "≥ 1 of these 6 *fields*
inside one *item*". It is **not** "≥ 1 item in this collection", and it is not
"exactly N items". The mechanism (`requires.anyOf` over leaf obligations) has no
vocabulary for item counts at all.

### 3.2 Collection status

Falls out of container status for free, because container status is
**re-derived over the subtree's in-scope entries** rather than rolled up:

```js
// engine/index.js:469-474
export function containerStatus(container, state) {
  if (isPage(container)) return pageStatus(container, state)
  const inScope = collectInScopePresentedEntries(container, state)
  const groupErrors = groupInvariantErrorsForContainer(container, state)
  return classifyEntries(inScope, state, groupErrors.length)
}
```

A `per-unit-records` subsection with 3 lines × 2 units flattens to
3 × 2 × (in-scope unit leaves) entries and runs through the same 5-way
classifier as a single scalar page. No per-collection status code exists,
and none is needed. **This is a clean win and cheap to port.**

There are **no collection-level facets** (no per-item status chips, no
"2 of 3 complete" derived facet in the model) — the `/lines` and
`/lines/{id}/units` summaries hand-build their rows
(`features/commodity-lines/controller.js:126-175`,
`features/units/controller.js:121-169`).

---

## 4. Add / remove / edit item flows — HANDLED IMPERATIVELY

This is where the elegance stops. **Nothing about item lifecycle is declarative.**

### 4.1 Add = seed a placeholder leaf, because instances have no storage of their own

```js
// lib/state.js:97-118
export function addCommodityLine(request, commodityLineObligation, seedObligation) {
  const fulfilments = { ...readFulfilments(request) }
  const n = readNextLineId(request)
  const id = `line${n}`
  const seed = { ...(fulfilments[seedObligation.id] ?? {}), [id]: '' }
  fulfilments[seedObligation.id] = seed
```

Note the signature: `commodityLineObligation` is passed in **and never used** —
because you cannot write to a group. The line is created by writing
`commodityCode['line1'] = ''`.

Depth 2 is worse, and it exposes a chicken-and-egg the spike had to code around:
you cannot seed a unit on *any* leaf, you must seed it on one that the parent
line's commodity code actually puts in scope — otherwise the evaluator purges the
seed on the next `evaluate()` and the unit never existed. The fix is 37 lines of
imperative metadata-sniffing:

```js
// features/units/controller.js:186-222 (pickSeedObligationForLine)
const meta = obligation.applyTo?.metadata
if (!meta) continue
if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return obligation
if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return obligation
```

…which only understands 2 of the 4 gate-shape helpers, and would silently return
`null` (⇒ "you cannot add an animal") for a unit leaf gated by a hand-written
`applyTo` or a `branchedGate`. And if it returns `null` the Add is simply
swallowed:

```js
// features/units/controller.js:277-283
const seed = pickSeedObligationForLine(state, lineId)
if (!seed) {
  // No per-unit obligation is in scope for this line's commodity
  // code (e.g. transit-only cattle) — bounce back without minting.
  return h.redirect(`${BASE}/lines/${lineId}/units`)
}
```

**Empty collection items are structurally impossible.** An item with zero filled
leaves cannot be represented; the seed `''` is what keeps it alive.

### 4.2 Delete = hand-rolled cascade over a hand-derived leaf list

```js
// lib/state.js:120-162 (deleteCommodityLine)
for (const obligation of lineLeafObligations) { ...delete stored[lineId]... }
// Cascade: purge every unit-scoped fulfilment whose composite key
// starts with `${lineId}/`.
const prefix = `${lineId}${PATH_DELIMITER}`
for (const oblId of Object.keys(fulfilments)) { ...if (key.startsWith(prefix)) delete next[key]... }
```

The `lineLeafObligations` list is derived from **one hard-coded subsection id**:

```js
// features/commodity-lines/controller.js:56-65
function deriveLinePages(flowNode) {
  const details = findSubsection(flowNode, 'commodity-lines-details')
  if (!details) return []
```

A per-line page added to a *different* subsection is missing from the summary
**and survives Delete** (the `${lineId}/` prefix cascade only catches depth-2
keys, not the depth-1 key `line1`). The file's own comment (`:45-53`) shows this
list has already drifted once and been patched twice.

Session-monotonic ids (`NEXT_LINE_ID_KEY`, `NEXT_UNIT_ID_BY_LINE_KEY`,
`lib/state.js:14-16`) exist *specifically* to defend against that drift —
"silent rehydration of any per-record state whose obligation is missing from
LINE_LEAF_OBLIGATIONS would otherwise be possible" (`lib/state.js:86-88`). That
is a workaround for a delete sweep that is not model-driven.

### 4.3 Silent item loss on re-answering a parent field — a real hole, untested

Change a line's `commodityCode` from `01061900` (pets) to `0102` (cattle) after
adding units, and: every unit's `permanentAddress` leaf goes out of scope
(`PERMANENT_ADDRESS_COMMODITIES = ['01061900']`, `obligations.js:622`),
`purgeStorage` drops it, and — because instances exist only as key prefixes —
**every unit on that line silently ceases to exist**. The units controller knows
about this ("a commodity-code change that purges an earlier seed",
`features/units/controller.js:121-130`) but nothing prevents it and **no test
covers it**: the 14 `it()` cases in `e2e-units.test.js` cover add / two-units /
ordinal renumber / delete-unit / delete-line-cascades / invariant status / CYA
links — not a code change after units exist.

This is a direct consequence of "an instance IS its descendants' keys". A model
with a first-class instance record would have kept the empty units.

### 4.4 Edit

Edit is the only lifecycle op that is fully model-driven, via the ordinary page
controllers. `fieldsForPage` filters descriptors to a single path
(`contract.js:209-213`: `all.filter((d) => d.path === options.lineId)`), and the
unit controller passes the *composite* key through that same `lineId` slot
(`lib/unit-page-controller.js:92-96`) — a naming tell that the depth-2 case was
retrofitted into a depth-1-shaped API.

---

## 5. Cardinality — min / max / derived / linked — ABSENT

I searched the entire spike. There is **no** `maxEntries`, `minEntries`,
`maxItems`, `minItems`, or `cardinality` in any `.js` source file. The word
`cardinality` appears **only in `obligations.md` and in test names** — never in
executable code.

| Capability | Side B |
|---|---|
| Minimum entries in a collection (e.g. ≥ 1 commodity line) | **ABSENT.** Nothing forces a notification to have any lines. An empty journey simply has an NA commodity section. |
| Maximum entries (static, e.g. ≤ 20 lines) | **ABSENT.** No cap anywhere; `POST /lines/add` mints unconditionally (`features/commodity-lines/controller.js:208-217`). |
| Maximum entries DERIVED from another answer (A's `maxEntriesFrom`) | **ABSENT, and structurally so** — see below. |
| Cardinality LINK between collections (units on a line must equal `numberOfAnimals`) | **ABSENT.** The two are modelled but never related. |

`numberOfAnimals` — the field that in A's model would drive
`maxEntriesFrom` — is a bare per-line integer with a lower bound only:

```js
// domain/index.js:798-815
export const numberOfAnimalsDomain = predicate('integer', (value, ctx) => {
    if (value === undefined || value === null || value === '') return []
    if (!Number.isInteger(value) || value < 1) {
      return [{ code: reasons.integerMin.code, obligation: numberOfAnimals.name, path: ctx.path, min: 1 }]
    }
    return []
  }, [reasons.integerMin])
```

and the comment above it (`domain/index.js:786-797`) records that an earlier
cross-field cap *was deliberately deleted* because it rejected spec-valid values.
There is no relationship of any kind between `numberOfAnimals[line1]` and the
number of `unitRecord` instances under `line1`.

### 5.1 Why derived cardinality is STRUCTURAL, not merely unbuilt

This is the sharpest structural finding on Side B in this dimension.

A group's `applyTo` **cannot** dictate its instances. Look at the group branch of
`buildImplication`:

```js
// obligations/evaluator.js:457-467
if (category === 'group') {
    const fulfilmentIds = [
      ...(fulfilmentIdsByObligationId.get(obligation.id) ?? [])
    ]
    const impl = { inScope: true }
    if (own?.reasons) impl.reasons = own.reasons
    impl.records = fulfilmentIds.map((fulfilmentId) => ({ fulfilmentId }))
    return impl
}
```

`own` is the group's own `applyTo` decision. `own.records` is **read for nothing
but `reasons`** — the records come exclusively from
`fulfilmentIdsByObligationId`, i.e. from storage-key enumeration. Contrast the
`derived-leaf` branch two blocks down (`evaluator.js:482-493`), which *does*
honour `own.records`.

So the model has a first-class notion of "a *leaf* whose record set is derived
from another answer" (the `indexedBy: { source: 'derived' }` / `derived-leaf`
category) but **no notion of a *group* whose instance set is derived**. To get
`maxEntriesFrom` (or `exactlyEntriesFrom`) you would have to:
1. rewrite the group branch of `buildImplication` to honour `own.records`;
2. add a purge path that drops instances (all of an instance's descendant leaves
   across every obligation) when the derived set shrinks — `purgeStorage` has no
   instance-level cascade today, only per-obligation and per-record;
3. stop the browser layer minting ids for such groups (`lib/state.js:97-118`,
   `:186-204`);
4. decide what happens to already-typed data when the controlling number drops.

That is not a config change; that is the evaluator's contract. **structural: true.**

### 5.2 What B *could* express cheaply

A "≥ 1 unit per line" or "≤ N units per line" *validation* (as opposed to a
cardinality *constraint that shapes the collection*) is a natural extension of
`requires`, sitting alongside `anyOf`, evaluated by a sibling of
`groupInvariantErrors`. That is a genuinely small change (one engine primitive,
one manifest key, one classifier count) — `structural: false`. The spike lists it
as an open non-goal: "Cross-record predicates other than group invariants — e.g.
'no two commodity lines carry the same code'. Would live … as a new engine
primitive parallel to `groupInvariantErrors`" (`obligations.md:2834-2837`).

---

## 6. Nesting depth: data-driven in the MODEL, hard-coded in the BROWSER — PARTIAL

`obligations.md:1285-1287` and `:2819-2823` both assert:

> **Nested indexing is supported at any depth.** Depth is data-driven via the
> `within` chain; the classifier + composite-key storage handle arbitrary
> depths uniformly.

**In the model layer this is TRUE.** I verified: `buildAncestorGroups`
(`evaluator.js:188-200`) walks the chain, `prefixLen` is computed, not
constant; `makeInScopeCheck` recurses; `purgeStorage` is depth-blind. A depth-3
group needs *zero* evaluator changes.

**In the browser layer it is FALSE**, and the spike's own docs concede it
(`RECOMMENDATION.md:470-471`: "If a third level of Add-another appears, promote
the pattern"). Adding depth 3 costs, concretely:

| # | What must be added | Evidence |
|---|---|---|
| 1 | A 4th page-controller factory | `lib/page-controller.js` (111) / `lib/line-page-controller.js` (141) / `lib/unit-page-controller.js` (179) are three near-copies |
| 2 | A 4th `firstUnfulfilledPageFor*` | `engine/index.js:149-167` (line) and `:182-201` (unit) are near-copies with `compositeKey` hard-built as `` `${lineId}/${unitId}` `` |
| 3 | A 4th `nextAfterFor*` | `contract.js:135-144`, `:152-161` |
| 4 | Another identity branch in the router | `routes.js:154` — `if (page.presentsForEach.forEachOf === unitRecord)` — an **identity comparison against a specific obligation object** |
| 5 | A 3rd bespoke add/list/delete controller | `features/commodity-lines/` (227) + `features/units/` (308) |
| 6 | A 3rd id-counter yar key + delete cascade | `lib/state.js:13-16`, `:139-161` |
| 7 | A deeper `pathPrefix` | see §6.1 |

Call it ~6 files and ~700 LOC of near-duplicate code per new depth level.
`structural: false` (the model is fine; the plumbing is hand-rolled) but the
retrofit cost is real and repeats per level.

### 6.1 A hard ceiling inside the gate helpers

```js
// obligations/helpers.js:212-215
function pathPrefix(path) {
  const slash = path.indexOf('/')
  return slash === -1 ? path : path.slice(0, slash)
}
```

`pathPrefix` returns only the **first** segment. So `allowListed` /
`allowListedByPredicate` can only project from a gate at **depth 1**. A depth-2
gate (keys like `line1/unit1`) gating a depth-3 obligation would compare
`'line1'` against passing keys `'line1/unit1'` and always miss. The helpers'
`projectionGroup` argument silently assumes a two-level identity space.

This is a helper bug/ceiling, not a model ceiling — a hand-written `applyTo`
could do it, and the fix is to slice by the gate's own ancestor depth rather
than `indexOf('/')`. `structural: false`, ~10 lines. But it means the advertised
"any depth" claim does not survive contact with the shipped gate library.

---

## 7. Doc-vs-code disagreements (findings in their own right)

I opened the code for every claim `obligations.md` makes about collections.
Three claims are **false**.

**(a) "Group presence uses a marker map."**

> `obligations.md:1250-1252`: "**Storage.** Group presence uses a marker map
> (`{ [lineId]: {} }`), which is what the evaluator's classifier treats as
> authoritative for which line-ids exist."

False. `grep` finds **no write anywhere** to `fulfilments[commodityLine.id]` or
`fulfilments[unitRecord.id]` — every reference in the codebase is a read of the
*derived* `state.obligations[commodityLine.id].records`. `addCommodityLine`
writes `commodityCode[line1] = ''` (`lib/state.js:110-114`). And
`enumerateGroupFulfilmentIds` scans **descendants only** (`evaluator.js:408`:
`for (const desc of obligationDescendants.get(o.id))`) — a marker written to a
group's own id would be *stored and ignored*. The same doc contradicts itself 80
lines earlier (`obligations.md:1173-1176`: "groups have no storage of their
own"), which is the account the code actually implements.

**(b) "Removing a line = delete the presence marker; the evaluator's
ancestor-scope cascade drops descendant records" (`obligations.md:1265-1267`).**

False. Delete is imperative: `deleteCommodityLine` (`lib/state.js:120-162`)
walks a hand-derived leaf list and then string-prefix-scans every obligation in
storage. There is no marker to delete and no ancestor cascade fires.

**(c) `cardinality: 'indexed'` and `indexedBy: { source, mutability }` on the
group.**

`obligations.md:1232-1238` and `:1305-1324` show `commodityLine` / `unitRecord`
declared with `cardinality` and `indexedBy`. The real manifest has **neither**
(`obligations.js:405-410`, `:563-594`). `indexedBy` is honoured by the
classifier (`evaluator.js:169-173`) and covered by synthetic unit tests
(`evaluator.units.test.js:104,112,117,428,443,524`) but is **dead in the V4
manifest** — the `user-leaf` category is never reached in production. The
`source × mutability` taxonomy (`obligations.md:1083-1092`) — user / derived /
seeded × edit-only / edit-add-remove — is a good *idea* that has not been
built: only pattern 1 (`user` / `edit-add-remove`) exists, and it exists by
accident of shape rather than by declaration.

Net: **cardinality on Side B is not declared at all. It is inferred from the
presence of `within` back-references.** That is simultaneously the model's
neatest property and the reason min/max/derived cardinality has nowhere to live.

---

## 8. Test coverage of this dimension

| File | `it()` count | What it pins |
|---|---|---|
| `e2e-commodity-lines.test.js` | 24 | add / multi-line / delete (incl. "deletes ALL line-scoped leaves") / per-line Change / conditional `numberOfPackages` / ordinal renumbering / monotonic ids / CYA one-row-per-line |
| `e2e-units.test.js` | 14 | Manage-animals link gating, add-then-fill, 2 units on a line, ordinal renumber after delete, delete-unit, **delete-line cascades into units**, group-invariant status IP→F, CYA depth-2 change links |
| `obligations/evaluator.test.js` | 72 | includes group enumeration + purge over the real V4 manifest (`:439`, `:453`, `:466`) |
| `lib/state.test.js` | 8 | seed/cascade/id-minting |
| `features/commodity-lines/controller.test.js` | 4 | `LINE_PAGES` derivation |

Not covered anywhere: **changing a parent field so that a child collection's
items lose their last in-scope leaf** (§4.3). Nor is there any max/min test,
because there is no max/min.

---

## 9. Retrofit shopping list (what a third option should take, and what it costs)

**Take (cheap, high value):**
1. `within` + flat composite keys + prefix enumeration
   (`evaluator.js:244-271`, `:390-421`) — ~80 LOC, depth-generic, and it is the
   reason B's nesting story is coherent at all.
2. `requires.anyOf` + `groupInvariantErrors` (`obligations.js:581-593`,
   `engine/index.js:512-539`) — ~30 LOC engine + 1 manifest key. Vacuous-
   satisfaction semantics included.
3. Container status **re-derived** from the subtree (`engine/index.js:469-474`)
   — collection status for free, no roll-up precedence table.
4. `anyAllowListed` as the collection quantifier (`helpers.js:101-120`).
5. `coverage.test.js`'s allow-list gate — not this dimension, but it is what
   would have caught the `LINE_LEAF_OBLIGATIONS` drift (`features/commodity-lines/controller.js:45-53`).

**Do not take:**
1. Storage-derived instance identity **without** a fix for §4.1/§4.3. If you keep
   prefix-enumeration you must add a real presence marker that the enumerator
   *reads* (the doc already thinks one exists — make it true). That is a small
   change to `enumerateGroupFulfilmentIds` (also scan `amendedFulfilments[o.id]`
   keys) and it buys you: empty items, items that survive a parent-field change,
   and a delete that is a single key removal instead of a 40-line cascade.
2. The 3 parallel page-controller factories / `nextAfterFor*` /
   `firstUnfulfilledPageFor*` triples. Parameterise by ancestor-path, not by
   depth level.
3. `pathPrefix`'s `indexOf('/')` (`helpers.js:212-215`).

**Must build regardless (B has nothing to give here):**
- min/max entries, derived max (`maxEntriesFrom`), cross-collection cardinality
  links. If A has these, take them from A wholesale — B's group branch of
  `buildImplication` (`evaluator.js:457-467`) actively forecloses them.
