# L2 — Collections, nesting and cardinality — A (live-animals) vs B (flow-layer)

Clones (read-only):
- A: `workareas/model-comparison/clone-live-animals` @ b6ac2ed — root `prototypes/standalone/live-animals/`
- B: `workareas/model-comparison/clone-flow-layer` @ d59b432 — root `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

All paths below are relative to those roots.

---

## Verdict: **B-better** — but two things a third option MUST take from A

The standing prior survives, and it survives for reasons neither Layer-1 read got fully
right. B's collection model is better on **identity**, **status**, **group invariants**,
and — the biggest practical delta — it has a **declarative page-fan** (`presentsForEach`)
where A has nothing at all. A is better on exactly two things, both genuinely structural:
**an item can exist without data**, and **cardinality exists at all**.

Critically, **A's finish contributes nothing to this verdict.** A's extra breadth (upload,
amend, persistence, big E2E suite) is orthogonal to how it models repeating groups. Scored
purely as a model, A's two headline boasts in this dimension **do not survive contact with
the source**:

1. **Collection FACETS are not a capability — they are a patch for a hole B does not have.**
   `flow/task-rows.js:55-56` shows the default row-parts derivation is
   `row.pages.flatMap((page) => collectsOf(page.id))`. Facets are the *override* required
   because `flow/dispatch.js:15` strips indices and attributes every sub-field to the page
   owning its nearest collection ancestor — so `animalIdentificationPage` is forced to declare
   `collects: []` (`features/commodities/animal-identification.controller.js:20`) and the
   default derivation would give the wrong answer. B reaches the identical outcome (one stored
   collection → two hub rows with independent statuses) **with zero model vocabulary**, purely
   from flow position: `commodity-lines-details` (flow.js:431) and `per-unit-records`
   (flow.js:494) are sibling subsections, and `containerStatus` (`engine/index.js:469-474`)
   re-derives over any container. Layer-1-A called facets "the single cleanest idea in A's
   collection model". It is a workaround.

2. **`maxEntriesFrom` is thinner than advertised.** It is 12 lines of logic
   (`engine/evaluate/cardinality.js:20-31`), one carrier
   (`features/commodities/obligations.js:110`), one enforcement point
   (`engine/write.js:23-24`), a **MAX only** (1 record for 100 animals is complete —
   DESIGN-DELTA.md:706-708), and **one-directional**: the inverse (count edited down below
   the record count) is 20 LOC of hand-written controller code building its own GDS error
   text (`features/commodities/consignment-details.controller.js:126-145`). So A's flagship
   "cardinality link" is half-declarative, half-imperative.

And one Layer-1-A **limitation** is also wrong, in A's favour: the five hand-rolled
re-derivations of item-conditional gates were labelled STRUCTURAL. They are not.
`engine/read.js:27-35` (`makeScope`) already exposes `has(instancePathKey)` over the
reconcile fixpoint (`engine/evaluate/reconcile.js:13-30`), which answers exactly the
question those controllers are re-deriving by hand. That is tech debt, not a paradigm limit.

### The scorecard (model only)

| Sub-dimension | A | B | Winner |
|---|---|---|---|
| Collection declaration | `collection: true` + `item: [objects]` — explicit | `within` back-ref — group-ness *inferred* (`obligations.js:841-843`) | **tie** (B is more minimal; A's explicit marker is why cardinality has somewhere to live) |
| Nesting depth (model) | unbounded — no depth constant anywhere (`registry.js:44-71`, `complete.js:43-52`) | unbounded — `prefixLen = ancestors.length + 1` (`evaluator.js:406`) | **tie** |
| Nesting depth (app layer) | **no fan primitive at all**; 4 bespoke controllers, 1,278 LOC | `presentsForEach` (25 LOC, `engine/index.js:248-272`) drives **12 of 35 pages**; add/delete still bespoke (535 LOC) | **B** |
| Entry identity | **positional array index** — `splice` renumbers siblings | **stable string key**, monotonic, never recycled; display ordinal re-derived | **B — structural** |
| Item existence | first-class — `{}` is a representable entry | **impossible** — instance = prefix-set of descendant keys | **A — structural** |
| Cardinality min | `requiredAtLeastOne` (boolean) | none | **A** (thin) |
| Cardinality max | `maxEntriesFrom` (derived, 1 carrier, MAX only, one-directional) | none — but `requires` is the right slot, and would be bidirectional for free | **A ships it; B's architecture is its better home** |
| Cross-collection link | none | none | **tie** (both absent) |
| Item conditionality (expressiveness) | 4 operators × 3 frame modes; `notInUnionOf` derived by reference; `enclosing` walk is depth-generic | `allowListed` + `projectionGroup`; but `pathPrefix` (`helpers.js:212-215`) hard-ceilings at depth 1 | **A** |
| Item conditionality (drives the render?) | **no** — 5 hand-rolled re-derivations | **yes** — purge → `expandPresents` → descriptors, end to end | **B** |
| Group invariant (≥1 of N per item) | `requiredOneOf` — ad-hoc key, completeness-only | `requires.anyOf` + `groupInvariantErrors` — first-class, per-instance errors, vacuous satisfaction, folded into the classifier | **B** |
| Collection status | `statusOf(parts)` + facets (a patch, see above) | `containerStatus` re-derived over the flow subtree — free | **B** |

B takes five, A takes three, three ties. More importantly the *shape* of the wins differs:
B's wins are **architectural** (identity, status, invariants, the fan), A's are **local**
(three ad-hoc keys and a richer predicate library). Local wins port cheaply. Architectural
wins do not.

---

## 1. The two genuine A-only capabilities

### 1.1 A collection item can exist with no data (B structurally cannot)

This is the strongest thing A has here and it is not in either Layer-1 headline.

In A, an entry is an array element. `appendEntryAt(path, {})` (`engine/write.js:20-28`)
pushes an empty object; `walk` yields it (`registry.js:60-68`); it is addressable at `[i]`;
`entryComplete` reports it incomplete. A *guards against* empty records in a controller
(`animal-identification.controller.js:478-486`) — which is proof the model permits them.

In B an instance **is** the prefix-set of its descendants' storage keys:

```js
// obligations/evaluator.js:406-416
const prefixLen = obligationAncestorGroups.get(o.id).length + 1
for (const desc of obligationDescendants.get(o.id)) {      // DESCENDANTS ONLY
  const descendantFulfilment = amendedFulfilments[desc.id]
  ...
  ids.add(joinPath(segments.slice(0, prefixLen)))
}
```

Groups have no storage of their own — nothing anywhere writes `fulfilments[commodityLine.id]`.
Zero filled descendants ⇒ **no instance**. Three consequences, all live:

- **Add must seed a placeholder.** `addCommodityLine` writes `commodityCode[lineId] = ''`
  and never uses the group obligation it is passed (`lib/state.js:97-118`).
- **Depth-2 add hits a chicken-and-egg**, and the code says so verbatim
  (`features/units/controller.js:176-185`): *"at add-time no unit exists yet, so
  `impl.inScope` is false for the very obligation we want to seed … the evaluator's
  projection over `unitRecord.records` returns [], so the applyTo closure short-circuits."*
  The workaround is 37 lines that **bypass the evaluator** and sniff `applyTo.metadata`
  (`:186-222`), understanding only 2 of the 4 gate-helper shapes, and **silently swallowing
  the Add** when it finds none (`:277-283`).
- **Silent data loss, untested.** Change a line's `commodityCode` from `01061900` (pets) to
  `0102` (cattle) after adding units: `permanentAddress` leaves the scope, `purgeStorage`
  drops the leaf, and **every unit on that line ceases to exist**. The units controller
  knows ("a commodity-code change that purges an earlier seed", `:121-130`). Nothing prevents
  it. None of the 14 `it()` cases in `e2e-units.test.js` covers it.

B's own `obligations.md:1250-1252` **claims** a presence marker exists and is authoritative.
It does not (and `enumerateGroupFulfilmentIds` scans descendants only, so one written to a
group's own id would be stored and ignored). The doc describes the fix rather than the code.

### 1.2 A cardinality bound the ENGINE enforces at the point of mutation

A's engine owns the write path. `engine/write.js:23-24`:

```js
const cap = collectionCapAt(journey.answers, collectionPath)
if (cap !== null && list.length >= cap) return null      // store untouched
```

B's engine has **no mutation primitive at all** — `purgeStorage` is a scope purge, and every
write is imperative controller code (`lib/state.js`). B can therefore never express a bound
the *model* enforces; it can only report a violation after the fact.

**But be honest about which side that favours.** After-the-fact reporting is the better GDS
answer *and* it is bidirectional for free, because B re-derives everything on every
`evaluate()`. A's write-time cap is precisely *why* A's link is one-directional and needs
`countDropIssues` (20 LOC, hand-built error copy) for the other half. This is A-only, and it
is arguably not a thing B should want.

---

## 2. The two genuine B-only capabilities

### 2.1 A durable reference to a collection item (A structurally cannot)

A's entire path layer is positional. `lib/path.js`:

```js
export const pathKey = (path) => ... `${key}[${segment}]` ...        // :1-10
export const deleteAt = (answers, path) => {
  ...
  if (Array.isArray(parent) && typeof leaf === 'number') parent.splice(leaf, 1)   // :39
}
export const wipeOrder = (pathA, pathB) => {
  ...
  if (typeof pathA[i] === 'number' && typeof pathB[i] === 'number') {
    return pathB[i] - pathA[i]        // :51-52 — delete higher indices FIRST
  }
}
```

`wipeOrder` exists **for no other reason than** to stop a batch of sibling deletions shifting
indices under itself. That is a workaround whose existence is the proof: in A, deleting entry
1 silently renumbers entry 2 to `[1]`. Every path key, every anchor, every reference
retargets. A's CYA deep-link is literally `#identification-card-${index}`
(`consignment-details.controller.js:142`). The only identity concept A has is the
caller-supplied `keyOf` passed to `reconcileEntriesAt` (`engine/write.js:71`) — a *page-side
convention* (`search.controller.js`'s `lineKey`), not a model fact.

B separates **stable identity** from **display ordinal**, and reasons about it explicitly
(`features/units/controller.js:121-130`):

> *"unit ids are session-monotonic (no recycling) so after a delete or a commodity-code
> change that purges an earlier seed, the surviving units can have internal ids like unit2 +
> unit3 … The URL stays keyed by the internal id because URLs must be stable across
> renumbering."*

`lineDisplayIndex` (`:115-119`) re-derives the ordinal by `findIndex`. A conflates the two
and cannot separate them without rewriting `lib/path.js`, `engine/write.js` and the entire
instance-path key space in `reconcile.js`.

This matters far beyond cosmetics: **A cannot hold a durable reference to a collection item.**
Any future requirement of the form "this document relates to commodity line X", "this
transport leg carries these lines", or an amend-and-resubmit that diffs against a persisted
notification, needs an entry id A's model has no vocabulary for.

### 2.2 Separating "records that CAN exist" from "records that HAVE values"

B ships this as a first-class evaluator category (`obligations/evaluator.js:482-493`), and
the comment states the contract exactly:

```js
if (category === 'derived-leaf') {
  // Id set comes from applyTo — the authoritative "what records
  // CAN exist". Storage tracks which ones have VALUES.
  const fulfilmentIds = own?.records ?? []
```

A has no such separation anywhere. A's instance set comes from **exactly one** place —
`registry.js:60`:

```js
const entries = valueAt(answers, path) ?? []
```

There is no branch. A's instance tree **is** a projection of the answers document, and that
invariant is load-bearing for A's persistence mappers (which walk
`answers.commodityLines[i].animalIdentifiers[j]`). So A cannot express "this obligation
exists once per X, where X is derived" — and therefore can never express a *derived
collection cardinality* (N unit records materialised because you declared N animals); it can
only ever *cap* user-driven appends, which is precisely what `maxEntriesFrom` does.

**Note the irony.** B does not ship derived *groups* — `buildImplication`'s group branch
(`evaluator.js:457-467`) reads records exclusively from storage enumeration and uses the
group's own `applyTo` decision only for `reasons`, never for `records`. But B ships the
*pattern* one category away, and `expandPresents` (`engine/index.js:262`) already fans the UI
over whatever `impl.records` says. **B is one `??` away from derived cardinality; A is a
materialiser rewrite away from it.** Layer-1-B called this "structurally foreclosed" for B —
that overstates it. It is foreclosed *by contract*, deliberately, and the contract is ~2 lines.

---

## 3. What is NOT asymmetric (and Layer-1 implied it was)

- **`presentsForEach`.** The single biggest maintainability delta in this dimension — 25 LOC
  drives 12 of B's 35 pages, versus A's 1,278 LOC across 4 bespoke loop controllers with a
  2.2:1 hand-written-UI-to-engine ratio. But A *could* build a generic loop renderer; nothing
  in A's model forbids it. It is unbuilt and expensive, not impossible. It stays out of
  `aOnly`/`bOnly` and belongs in the shopping list.
- **Cardinality in B.** B has zero cardinality facts today (verified: no `minEntries` /
  `maxEntries` / `minItems` / `maxItems` in any `.js`; `cardinality` and `indexedBy` appear
  only in `.md`, in the classifier, and in synthetic tests — `indexedBy` is **dead in the V4
  manifest**). But B has the right slot: `requires` (`obligations.js:581-593`) evaluated by
  `groupInvariantErrors` (`engine/index.js:512-539`), whose errors are already counted into
  the status classifier (`engine/index.js:398-400`). Adding `minEntries` / `maxEntriesFrom`
  there is additive. Unbuilt, not structural.
- **`notInUnionOf`.** A's derived-by-reference negation (`predicate.js:4-10, 20-24`) is a nice
  idea, but B's helpers already expose `.metadata.values` on every gate
  (`helpers.js:49-55`) precisely so callers can introspect the allowlists. A `notInUnionOf`
  helper in B is ~5 LOC over machinery that already exists.
- **A's facets.** Covered above — B gets the outcome from flow position.

---

## 4. Retrofit

### 4.1 B's collections into A — a storage-contract rewrite, and A's persistence has no answer

Adopting `within` + flat composite keys + prefix enumeration + `presentsForEach` means
touching essentially **all ~576 LOC of A's collection-aware engine**:

| A file | LOC | Fate |
|---|---|---|
| `lib/path.js` | 63 | **Rewritten.** Nested containers + numeric indices → flat composite string keys. `wipeOrder` (index-shift protection) becomes *unnecessary* and is deleted — a genuine simplification. |
| `registry.js:44-71` (`walk`) | 28 | **Rewritten.** Materialisation from nested arrays → prefix enumeration. |
| `engine/write.js` | 95 | **Rewritten.** append/update/remove all index into a nested array. "Append" becomes "mint an id + write a seed". `reconcileEntriesAt`'s key-preserving batch reconcile — the thing that stops the commodity-search page destroying identifier records — becomes *trivial*, because surviving keys simply keep their storage. Another simplification. |
| `engine/evaluate/reconcile.js` | 48 | Rewritten (fixpoint over composite keys, not instance path keys). Prefix-collapse survives conceptually. |
| `engine/evaluate/complete.js` | 93 | Rewritten (iterate instance ids, not nested entries). |
| `engine/status.js` | 79 | Facets **deleted** — *if* A also adopts B's "a page declares what it presents". Otherwise they stay. |
| `engine/evaluate/cardinality.js` | 31 | **Survives**, translated: resolve the count at the parent prefix instead of `collectionPath.slice(0,-1)`. Same size. |
| 4 loop controllers | 1,278 | Rewritten. `presentsForEach` would collapse the *edit* pages into flow declarations; add/remove stay imperative. |

**What breaks that B has no answer for:** A ships real persistence — two notification mappers
and a Mongo parity pin against the legacy skeleton. Those mappers walk the nested
`answers.commodityLines[i].animalIdentifiers[j]` document. B's store is
`fulfilments[obligationId]['line1/unit1']` — a *completely different document shape*. Every
mapper, every canned-data fixture and the parity test are rewritten. **B has no persistence,
no backend mapping and no submit at all**, so it contributes nothing here; this cost is pure
loss.

**And A would REGRESS** unless the retrofit also fixes B's hole: adopting prefix-enumeration
wholesale would import the empty-item impossibility, the 37-LOC seed-picker and the untested
data-loss hazard into an app that currently has none of them.

Verdict: **this is not a retrofit, it is a rewrite of the storage contract.**

### 4.2 A's collections into B — additive, ~80 LOC, and it is the right direction

Three separable ports, in value order:

1. **Cardinality (~30-40 LOC engine + 1 manifest key).** Do **not** port A's write-time cap —
   B has no write path and does not want one. Port it as a sibling of `requires.anyOf`:
   `requires: { minEntries: 1, maxEntriesFrom: numberOfAnimals }`, evaluated by a sibling of
   `groupInvariantErrors` (`engine/index.js:512-539`), emitting one error per violating
   instance into `classifyEntries`'s existing `groupErrorCount` (`engine/index.js:398-400`).
   The classifier plumbing **already exists**. This gets **both directions of the link from a
   single declaration** — the thing A needed 20 LOC of `countDropIssues` for. Add a 5-line cap
   guard on `POST /lines/{id}/units/add` for the UX.
2. **Fix item existence (~10 LOC, and it pays for itself).** Make
   `enumerateGroupFulfilmentIds` also scan `amendedFulfilments[group.id]` keys, and have
   `addCommodityLine`/`addUnitRecord` write a real presence marker. This is what
   `obligations.md:1250-1252` already (falsely) claims happens. It buys: empty items; items
   that survive a parent-field change; a **model-driven delete** replacing the 40-LOC
   imperative cascade (`lib/state.js:120-162`) and its hard-coded subsection-id leaf list
   (`features/commodity-lines/controller.js:56-65`); and it **retires
   `pickSeedObligationForLine` entirely** (37 LOC of metadata-sniffing that understands only
   half the gate shapes).
3. **`notInUnionOf` (~5 LOC)** over B's existing `.metadata.values` sidecar.

**Do not port:** facets (B gets it from flow containers); A's nested-array store; A's
positional paths.

**What breaks in B:** nothing structural — all three are additive. Re-run the 72 evaluator
tests, `e2e-commodity-lines` (24) and `e2e-units` (14). The presence-marker change alters
`enumerateGroupFulfilmentIds`'s contract, which is where the risk sits.

**What is load-bearing in B that A has no answer for (in this dimension):** `presentsForEach`.
Going the other way, B's 12 fanned pages all become bespoke controllers.

### 4.3 The asymmetry is the finding

**A → B is ~80 LOC and additive. B → A is a storage-contract rewrite that also destroys A's
persistence mappers.** Whatever the other dimensions say, on collections the third option
should be built on **B's spine** — `within` + composite keys + `presentsForEach` +
`containerStatus` + `requires` — with A's cardinality vocabulary ported into B's `requires`
slot and B's instance-existence hole closed first.

---

## 5. Residual risks in the recommended direction

- B's `pathPrefix` (`helpers.js:212-215`) returns only the first path segment, so the shipped
  gate helpers cannot project from a depth-2 gate. The "any depth" claim in
  `obligations.md:1285-1287` is true of the evaluator and false of the gate library. ~10 LOC.
- B's browser layer is hard-coded to depth 2: `routes.js:154` identity-branches on
  `=== unitRecord`; 3 near-copy page-controller factories (111/141/179 LOC); 2 near-copy
  `firstUnfulfilledPageFor*`; 2 near-copy `nextAfterFor*`. ~700 LOC of duplication *per new
  depth level*. Parameterise by ancestor-path before adding depth 3.
- Three of `obligations.md`'s claims about collections are false against the code (presence
  marker, ancestor-cascade delete, `cardinality`/`indexedBy` on the group). A's
  `docs/add-a-collection.md:254-260` is false in the other direction ("the model cannot
  express cross-frame conditionality" — it ships, with 7 live carriers). **Neither side's
  collection documentation can be trusted; both were checked line by line for this report.**
