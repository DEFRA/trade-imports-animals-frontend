# L3 asym-12 — "A collection instance that EXISTS with zero answered leaves"

**Direction claimed:** A-only, structural. B cannot without a storage-shape / model change.
**Verdict: AMENDED.** B already ships the trader-facing capability; the residual gap is
durability + code-cost, not expressibility; the fix is additive (~10–15 LOC), not structural.
The doc's own canonical storage example already carries the group-own marker the claim says
would require a storage-shape rewrite.

Clone: `clone-flow-layer` @ d59b432, root
`prototypes/journey-config-spikes/EUDPA-249-flow-layer/`. Paths below relative to that root.

---

## 1. The capability-as-worded is ALREADY LIVE in B

The capability: *"an empty-but-addressable, walkable entry the trader can return to."* B builds
exactly this today.

- `addCommodityLine` (`lib/state.js:97-118`) mints `line{n}` and writes a seed
  `commodityCode[lineId] = ''`.
- `enumerateGroupFulfilmentIds` (`obligations/evaluator.js:408-416`) enumerates a group
  instance from **the presence of a descendant key**, not from its value:
  `for (const key of Object.keys(descendantFulfilment)) { ... ids.add(prefix) }`. The seed
  `commodityCode = { line1: '' }` therefore yields instance `line1`.
- The seed value `''` is **blank**: `isFilled('')` → false (`obligations.js:741`);
  `hasFulfilment` / `entryStatus` use `!isBlankValue(stored)` (`engine/index.js:422,431,527`).
  So `line1` exists yet has **zero *answered* leaves** — status NOT_STARTED, addressable by
  URL (keyed on the internal id), shown in the hub, returnable.

That is the claimed capability, in shipped code. "B cannot do this" is **literally false** — the
claim's own EVIDENCE concedes it ("B seeds a placeholder '' leaf"). The dispute is therefore not
*whether* B can express an empty walkable entry, but whether B's way of doing it is a "fake" that
needs a model change to make real. It is not.

---

## 2. The "structural storage-shape change" framing is refuted by B's OWN doc

The claim says closing the gap needs "an instance registry / group-own storage — a storage-shape
change touching evaluator steps 2/5/6 and every state.js mutator … Structural," citing
`obligations.md:1164` as the doc "sketching the fix" against a no-group-storage invariant at
`:1173-1176`.

Read those lines together and the "invariant" collapses:

- `obligations.md:1163-1170` — the **canonical storage example** already writes group-own
  storage: `commodityLine: { line1: {}, line2: {} }` and `unitRecord: { 'line1/unit1': {}, … }`.
- `obligations.md:1250-1252` states it as the design: *"Group presence uses a marker map
  (`{ [lineId]: {} }`), which is what the evaluator's classifier treats as authoritative for
  which line-ids exist."*
- `obligations.md:1173-1176` says the opposite — "groups have no storage of their own" — and it
  is **this** line the shipped `enumerateGroupFulfilmentIds` matches (descendants only).

So the group-own marker map is not a *new storage shape the claim invents*; it is the storage
shape the doc **already specifies** (`commodityLine: {line1:{}}`) and even calls authoritative.
The shipped evaluator simply doesn't read it. The claim inverts which of the two contradictory doc
passages is load-bearing: the marker-map passages (1163-1170, 1250-1252) are the *design*; 1173-1176
is the *as-built shortcut*. The storage shape does not have to change to close the gap — it is
already `{line1:{}}` on paper.

The substrate confirms it: `fulfilments` is a flat `{[obligationId]: keyedRecord}` map. A group id
is a manifest obligation id, so `fulfilments[commodityLine.id] = { line1: true }` is a
representable value — the L2 read already notes "one written to a group's own id would be stored
and ignored." **Stored** = the substrate admits it. **Ignored** = one function declines to read it.

---

## 3. The true cost is additive, and it removes more code than it adds

Walking the claimed blast radius against the code:

- **Step 6 (enumerate), `evaluator.js:390-421`:** union the group's own keys into the id set —
  `for (const k of Object.keys(amendedFulfilments[o.id] ?? {})) ids.add(k)`. ~3 LOC, additive.
- **Step 5 (purge), `evaluator.js:333-378`:** *no change needed.* An in-scope group entry is a
  keyed record; it falls through to `isKeyedRecord` → kept (`:369-373`); out-of-scope groups are
  dropped at `:346`. Purge already preserves group-own storage correctly.
- **Step 2 (applicability):** groups already receive an `own` decision
  (`obligationApplicabilityDecisions`); own storage needs no applicability change. No change.
- **state.js mutators:** `addCommodityLine`/`addUnitRecord` write
  `fulfilments[group.id][id] = true` instead of seeding a descendant leaf;
  `deleteCommodityLine`/`deleteUnitRecord` delete the marker key. This is a *simplification*: it
  **retires** `pickSeedObligationForLine` (37 LOC of metadata-sniffing that understands only 2 of
  4 gate shapes, `features/units/controller.js:186-222`) and lets the delete cascade shrink.

Net: ~10–15 additive LOC in the engine, negative LOC overall. Touches one evaluator step, not
"2/5/6 and every mutator." This is the "small extension over an existing dispatch table" the
adversarial protocol asks me to find. It is **not** structural.

---

## 4. The residual real gap (why AMENDED, not REFUTED)

There is a genuine, narrower asymmetry worth keeping on the shopping list:

B's shipped empty instance is **parasitic on a purgeable seed leaf**. Change a parent field so the
seed obligation leaves scope and Step-5 purge drops the seed — and the instance ceases to exist.
The units controller documents this exact hazard ("a commodity-code change that purges an earlier
seed", `features/units/controller.js:121-130`); no test in `e2e-units.test.js` covers it. A's empty
entry is first-class (`appendEntryAt(path,{})`, `engine/write.js:20-28`; walk yields it,
`registry.js:60-68`) and survives parent-field changes because the group has real storage.

So A **is** better here — but on **durability + code-cost**, not on **expressibility**. The claim
overstates on both axes it names: it says B *cannot express* the entry (it does, live) and that the
fix is *structural* (it is additive, and the doc already specifies the storage shape).

---

## 5. Amended claim

> B already models an empty, addressable, walkable, returnable collection instance (the seed
> placeholder: `enumerateGroupFulfilmentIds` keys existence on descendant-key *presence*, and the
> seed value `''` is blank, so the instance exists with zero *answered* leaves —
> `lib/state.js:110-114`, `evaluator.js:408-416`, `obligations.js:741`). The genuine A-advantage is
> **durability and code-cost, not expressibility**: B's empty instance is parasitic on a seed leaf
> that a scope-purging parent-field change silently drops (documented, untested —
> `features/units/controller.js:121-130`), and it costs a 37-LOC seed-picker. Closing it to A-parity
> is an **additive ~10–15 LOC** change — union the group's own storage keys into
> `enumerateGroupFulfilmentIds` and write a boolean marker in the add/delete mutators — **not** a
> storage-shape or model change: the flat `{obligationId → keyedRecord}` substrate already admits a
> group's own key, `purgeStorage` already preserves it, and the doc's own canonical example
> (`obligations.md:1163-1170, 1250-1252`) already writes `commodityLine: { line1: {} }` as the
> intended storage. The "structural, touches evaluator steps 2/5/6 and every state.js mutator"
> costing is wrong; the change touches Step 6 only and net-removes code. Keep A's durable
> empty-instance idea in the third option — but implement it as B's marker-map read, cheaply.
