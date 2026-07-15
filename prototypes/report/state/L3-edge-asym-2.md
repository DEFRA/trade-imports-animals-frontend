# L3 edge-case asymmetry #2 — adversarial verification

**Capability:** Cardinality-linked collection SHRINK — a count lowered below existing
child records (claimed facet of `maxEntriesFrom`).
**Direction claimed:** A-only (A partial / B absent), *structural* — "B cannot do this
without changing its model."

## VERDICT: REFUTED (the "structural" framing is wrong — the shrink is imperative controller validation on BOTH sides; B needs no model-shape change)

---

## 1. What the shrink actually is, on A's own side

A's shrink handler is `countDropIssues`
(features/commodities/consignment-details.controller.js:126-145). Read it closely:

- It reads `entry.animalIdentifiers.length` (the raw child-record count) and
  `values[animalsField(index)]` (the newly-entered count), coerces, and if
  `entered < records` pushes a validation error that **blocks the save** (post
  handler lines 161-166 re-render instead of committing).
- It **never calls `collectionCapAt` and never reads `maxEntriesFrom`.** The model's
  cardinality vocabulary (engine/evaluate/cardinality.js, engine/write.js:23-24) is
  the APPEND cap and is untouched by the shrink path.

So on A itself the shrink is **not a model capability** — it is a hand-coded
cross-field comparison in a page controller that reads two answer values. The
evidence offered concedes exactly this ("nothing re-trims on a count drop, so the
shrink is hand-coded imperatively… Even A pushes the shrink direction outside the
model"). That concession is fatal to an *A-only structural* claim: a behaviour A
implements **outside** its model cannot be an asymmetry **of** the models.

## 2. B has every ingredient to do the identical thing — no model change

The shrink scenario is fully representable in B's journey and every piece the
imperative check needs is already exposed:

1. **The count field exists.** `numberOfAnimals` is a mandatory line-level leaf
   (obligations/obligations.js:439-444), sitting on `commodityLine` exactly like A's
   `numberOfAnimalsQuantity`.
2. **The child sub-collection exists.** `unitRecord` is the per-animal depth-2
   collection under `commodityLine` — the direct analogue of A's `animalIdentifiers`.
3. **The per-line child-record count is already read this way.** B counts a line's
   units by filtering the evaluator's records:
   `state.obligations[unitRecord.id].records.filter(r => r.fulfilmentId.startsWith(`${lineId}/`))`
   (features/units/controller.js:234-236; line-page-controller.js:64-65 does the same
   for scope). "How many animal records exist on this line" is a one-liner B already
   writes.
4. **A write-time block-the-save site already exists.** line-page-controller.js:103-126
   is precisely a validate→(re-render 400 | writeAnswer) branch. A `numberOfAnimals`
   page controller drops a `count < unitRecordCount` guard into that same branch — the
   identical shape and roughly the identical ~20 LOC as A's `countDropIssues`. This is
   the "write-time enforcement site" the claim says B lacks; it is line-page-controller
   post handler.

That is a controller-level addition using data B's evaluator already surfaces. **Zero
change to the obligation vocabulary, evaluator, storage shape, or any model concept.**

## 3. B even has a MODEL-LEVEL hook the invariant could ride, additively

Beyond the controller route, B already ships a cross-collection invariant primitive:
`requires.anyOf` on a group obligation, evaluated by `groupInvariantErrors`
(engine/index.js:512-539), which walks every in-scope group instance and emits
instance-keyed errors. It is the live carrier of the V4 "at least one Animal Identifier
per unit-record" **floor** (unitRecord.requires, obligations.js:574-582). A
count-vs-child-count relation is a new *kind* of clause in that existing dispatch — an
additive extension to a hook that already reads across a group's instances and produces
blocking errors, not a model-shape change. So B has TWO non-structural routes (a
controller guard, or a new `requires` variant), and needs neither a new storage shape
nor a mutation primitive to detect the shrink.

## 4. Where the claim went wrong — a conflation

The claim fuses two different things under `maxEntriesFrom`:

- **APPEND CAP as model vocabulary** — `maxEntriesFrom` declared on the collection,
  resolved by `collectionCapAt`, enforced in the engine write primitive
  (engine/write.js:24). This **is** genuinely A-only model vocabulary; B has no
  `maxEntriesFrom`, no count relation, and no centralized write primitive (grep of B's
  obligations.js confirms `maxEntries`/`cardinality` are absent — only an address-block
  "single-cardinality" comment). **But that is the *cap direction*, already catalogued
  as the cardinality asymmetry (L4-model-power §3.2 / L1 collections-cardinality) — not
  this claim.**
- **The SHRINK facet** — blocking a save when a count is lowered below existing child
  records. This is imperative controller validation on both sides. A built it; B did
  not. That is a **built-vs-unbuilt** difference, not a structural one.

The load-bearing word "structural" attaches to the shrink facet in this claim, and the
shrink facet is not structural.

## 5. Cost to close (true version)

Not "a cardinality vocabulary AND a write-time enforcement site — a model-shape change."
The true cost in B is a controller guard on the `numberOfAnimals` page: read the entered
value, read the line's `unitRecord` record count (code B already writes), and take the
existing 400 re-render branch instead of `writeAnswer` when `entered < count`. ~15-20
LOC, no model touch — the same weight A's `countDropIssues` carries. Optionally, the
same rule could be lifted into the existing `requires`/`groupInvariantErrors` hook as a
new clause kind (additive), if a declarative form is preferred.

## Evidence index
- A shrink is imperative, not model: consignment-details.controller.js:126-145,161-166;
  ignores cardinality.js / write.js:23-24.
- B count field: obligations.js:439-444 (`numberOfAnimals`, mandatory, within
  commodityLine).
- B child sub-collection + per-line count read: features/units/controller.js:234-236;
  line-page-controller.js:64-65.
- B block-the-save site: line-page-controller.js:103-126 (validate → 400 | writeAnswer).
- B model-level cross-collection invariant hook: engine/index.js:512-539
  (`groupInvariantErrors`), obligations.js:574-582 (`unitRecord.requires.anyOf`).
- B genuinely lacks `maxEntriesFrom` cap vocabulary (grep obligations.js) — but that is
  the *append cap* asymmetry, not the shrink facet.
