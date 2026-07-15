# L3 — Adversarial verification — asym-1

**Capability:** Collection cardinality cap enforced at mutation — cap identifier
records at the declared per-species animal count (c-031).
**Direction claimed:** A-only (A modelled-declaratively / B absent).
**Claim:** the weaker side (B) CANNOT do this without changing its model — it
must add BOTH a cardinality vocabulary to the obligation shape AND a
write/mutation primitive to an evaluator that has neither.

**Verdict: AMENDED.** A's declarative append-cap is real and B has no equivalent
*declarative* primitive. But the "structural / cannot without a model change"
framing is wrong: the *capability* ("cap records at the declared count at the
point of mutation") is achievable in B with a ~5–10 LOC guard in an **already
imperative add controller**, over data B **already models**. The claimed cost
("a model-shape change, not a controller edit") is the cost of A's *declarative,
generic* implementation, not the cost of the capability. And even A ships only
**half** of the cap declaratively.

---

## 1. A's side is confirmed — but it is only half declarative

Confirmed exactly as offered:

- `features/commodities/obligations.js:110` — the `animalIdentifiers` collection
  carries `maxEntriesFrom: numberOfAnimalsQuantity` (a data key on the shape).
- `engine/evaluate/cardinality.js:20-31` — `collectionCapAt` resolves the cap by
  reading the sibling count in the collection's parent frame.
- `engine/write.js:23-24` — `appendEntryAt` returns `null` (store untouched) when
  `list.length >= cap`.

So the **append** direction is genuinely declarative and engine-generic: one data
key, enforced by the engine's own write primitive for *any* collection.

**But the other direction is not.** Lowering the count below the existing record
count (the count-drop) is **20 LOC of hand-written controller code** building its
own GDS error copy — `features/commodities/consignment-details.controller.js:126-145`
(`countDropIssues`). That is imperative controller logic, identical in kind to
what B would write. So "A: modelled-declaratively" overstates A: A models the
append cap declaratively and the count-drop cap imperatively.

## 2. The cheap workaround exists on B — no model change

B's unit-add path is **already imperative controller code that mints**, not an
engine primitive:

```js
// features/units/controller.js:269-298  linesUnitsAddController.post.handler
const seed = pickSeedObligationForLine(state, lineId)
if (!seed) return h.redirect(`${BASE}/lines/${lineId}/units`)
const unitId = addUnitRecord(request, lineId, seed)   // lib/state.js:186
```

Both inputs the cap needs are already in B's model, today:

- **The declared count.** `numberOfAnimals` is a first-class per-line leaf,
  stored keyed by line id, validated by `numberOfAnimalsDomain`
  (`domain/index.js:798-815`). Read it: `readFulfilments(request)[numberOfAnimals.id][lineId]`.
- **The current record count.** Unit instances for a line are already derived by
  prefix enumeration — `state.obligations[unitRecord.id].records` filtered to the
  `line1/` prefix (`evaluator.js:400-419`), which B's own list/CYA views already
  compute.

A guard of the shape "if the count of unit records for `lineId` >=
`numberOfAnimals[lineId]`, bounce back with an error instead of minting" slots
straight into the existing handler in ~5–10 LOC. It touches **no obligation
shape**, adds **no evaluator branch**, and needs **no new engine write
primitive** — because B already mints imperatively at exactly this point. This is
the direct analogue of A's own imperative count-drop half, and it caps at the
mutation point.

**The L2 report itself concedes this** (`L2-collections-cardinality.md` §4.2.1):
"Add a 5-line cap guard on `POST /lines/{id}/units/add` for the UX."

## 3. What IS genuinely A-only (the narrower, true asymmetry)

A can express the cap **declaratively and generically** — one data key that the
engine enforces for any collection uniformly, with no per-collection code. B
cannot make the cap *declarative/generic* without model work: its group branch of
`buildImplication` reads instances from storage enumeration and ignores the
group's own `applyTo.records` (`evaluator.js:457-467`), so a *derived / capped*
instance set has nowhere to live in the shape, and the domain predicate layer
validates single field values, not collection counts. So the *declarative* form
does require vocabulary + evaluator changes.

But that is a claim about **declarativeness and reuse**, not about the capability.
The capability — cap records at the declared count at mutation — is not
structurally foreclosed for B. It is a controller edit, over data already present,
in an add path that is already imperative.

## 4. Why AMENDED, not CONFIRMED or REFUTED

- Not CONFIRMED: the concept does have somewhere to live in B — the existing
  imperative add controller, reading `numberOfAnimals` (already modelled) and the
  derived unit count (already computed). "B has no mutation primitive at all" is
  true of B's *engine*, but B mints imperatively in the controller, which is where
  the guard goes.
- Not REFUTED outright: there is a real, non-zero difference — A has a declarative,
  engine-generic append-cap primitive; B has none. A third option should note it.
- AMENDED fits: a real gap, overstated. The structural framing and the "model-
  shape change, not a controller edit" cost are both wrong.

## 5. Amended claim

A expresses the *append-side* cap **declaratively and generically** — one obligation
data key (`maxEntriesFrom`) enforced by the engine's write primitive for any
collection — which B has no declarative equivalent for. B **can** enforce the same
cap at the mutation point today with a ~5–10 LOC guard in its already-imperative
`linesUnitsAddController` add handler, reading `numberOfAnimals` (already modelled)
and the prefix-derived unit count (already computed); no obligation-shape or
evaluator change is required. The genuine A-only property is *declarativeness and
engine-generic reuse*, not the capability — and even A ships only the append half
declaratively (the count-drop half is 20 LOC of imperative controller code at
`consignment-details.controller.js:126-145`). True cost for B to reach parity on
the *capability*: a small controller edit. True cost for B to reach parity on the
*declarative primitive*: model vocabulary + evaluator change (real, but that is a
narrower and different claim).
