# L3 adversarial verification — C6 (conditionality-gating)

**Claim:** B's group instances have no storage of their own; existence is inferred post-purge from
descendants' composite-key prefixes; purging every descendant deletes the instance. Horse→pig commodity
change annihilates the animal silently. **Structural** — the fix is an instance registry, a storage-shape
change rewriting evaluator steps 2/5/6 and every `state.js` mutator. A is immune because its collections
are real arrays.

**VERDICT: AMENDED.** The failure mechanism is real, verified end-to-end, and *worse* than the claim
states. The **"structural"** label and the prescribed fix are **wrong**: B's own model already contains the
cure, applied to the sibling group, and it is a ~10-line manifest change that touches no engine code.

---

## 1. Every cited line checks out

| Citation | Verified |
|---|---|
| `evaluator.js:390-421` `enumerateGroupFulfilmentIds` | YES — reads `amendedFulfilments` (post-purge, passed in at `:110`). Group `records` in `buildImplication` (`:457-467`) come **only** from this map. |
| `evaluator.js:71-84` pre-purge group-path map | YES — `enumerateGroupPathsFromStorage` over `recognisedFulfilments`; feeds `applyTo`'s 2nd arg only. |
| `lib/state.js:196-200` `addUnitRecord` seeds `seed[compositeKey] = ''` | YES, verbatim. The comment says why: *"Seed a placeholder record … so the ObligationEvaluator recognises the unit as existing. The obligations model tracks a group instance by its descendants' composite-key prefixes."* Same trick at `:110-114` for `addCommodityLine`. |
| A: real nested arrays | YES, but the file is **`registry.js` at the prototype root**, not `engine/registry.js`. `walk`:59-69 reads `valueAt(answers, path) ?? []` and iterates `entries.length`. |

## 2. The failure trace — CONFIRMED, and understated

`unitRecord`'s children are **all seven gated**: passport, tattoo, earTag, horseName,
identificationDetails, description, permanentAddress (`obligations.js:634,644,654,664,683,696,709` — every
one has an `applyTo`, so `classifyObligations` (`evaluator.js:174-175`) puts every one in `derived-leaf`).
There is **no unconditional descendant storage anywhere under `unitRecord`.**

Horse line, code `0101`: in-scope identifiers = passport + horseName. Pig `0103`: tattoo + earTag.
**Disjoint.** So:

- `pickSeedObligationForLine` (`features/units/controller.js:186-222`) → mandatory bucket
  (`permanentAddress`, gated to `01061900`) misses → optional bucket → **passport**. Seed
  `passport['line1/unit1'] = ''`.
- Change the line's code to `0103` → `passport.applyTo` returns `records: []` → `inScope: false` →
  `purgeStorage` drops the whole entry at `evaluator.js:346`.
- Step 6 walks `amendedFulfilments` for unitRecord's descendants → nothing → `unitRecord.records = []`.
- `engine/index.js:258-262` `expandPresents` reads `state.obligations[unitRecord.id].records` → empty →
  every per-unit page collapses; `features/units/controller.js:233-240` lists zero animals.

**Stronger than the claim:** it is not only the empty seed. A **fully completed** horse animal (passport
number *and* horse name filled) is annihilated by `0101 → 0103`, because both surviving-storage obligations
go out of scope together. The claim's "the seeded `passport` record is purged" undersells it.

**"Silently" is confirmed structurally, not just observationally:** `groupInvariantErrors`
(`engine/index.js:496+`) walks *in-scope instances* and emits one error per violating instance. There is no
instance, so the "at least one animal identifier" invariant **cannot fire**. Nothing surfaces.

**Precision the claim lacks:** annihilation requires the new code's identifier whitelist to be disjoint from
*the leaves the user actually populated*. `0101 → 0102` survives (passport is in both whitelists).
`0101 → 0103 / 010410 / 010420` annihilates. The seed makes the abandoned-add case near-certain.

No test covers it (`evaluator.units.test.js` has no commodity-code-change case; `routes.test.js` has none),
and no doc owns it — `grep` for "anchor|instance registry|disappear" across `obligations.md`,
`RECOMMENDATION.md`, `NEXT.md` returns nothing on point.

## 3. Counter-example hunt — where the claim BREAKS

**`commodityLine` does not have this bug, and the reason is the refutation.**

`commodityLine`'s children include four **plain `field`s with no `applyTo`** — `commodityCode`,
`commodityType`, `species`, `numberOfAnimals` (`obligations.js:412-444`). `classifyObligations`
(`evaluator.js:176-177`) tags them `field`; `purgeStorage`'s `field` branch (`evaluator.js:369-373`) **never
drops them** — it keeps any non-empty keyed record. So a commodity line is anchored by unconditional
storage and survives arbitrary gate flips. Step 6 always finds it.

So the model's storage shape ("instance = union of descendant key prefixes") is **not** the defect. The
defect is that **`unitRecord` has no unconditional descendant** — a manifest omission, not an engine
limitation. B already uses the anchoring idiom one level up.

**The fix is therefore NOT an instance registry.** Add one always-in-scope `field` leaf under `unitRecord`
(status set, no `applyTo`, no page):

- `purgeStorage` keeps it (`field` branch, `:369-373`) — **no evaluator change**.
- Step 6 enumerates `line1/unit1` from it — **no storage-shape change**.
- `addUnitRecord` already takes a `seedObligation` param — **no `state.js` mutator change**; seed on the
  anchor.
- It is inert for status: `classifyEntries` only sees obligations a flow page `presents`, so an
  unpresented anchor never holds a subsection at In Progress.
- Two one-line follow-ons: add it to `UNIT_LEAF_OBLIGATIONS` (`features/units/controller.js:42`) so delete
  still works, and to `coverage.test.js`'s `KNOWN_UNWIRED`.
- It **deletes** `pickSeedObligationForLine` (37 lines) and the `.metadata` sidecar dependency it was
  written for. Net LOC is negative.

A second, cheaper-looking fix — have step 6 enumerate from `recognisedFulfilments` instead of
`amendedFulfilments` (a one-argument change) — works *today* only because the purge is never persisted
(`state.js:42-44`). It becomes unsound the moment the other recommended fix (persist the amended map) lands.
Do not take it.

## 4. The A-side half — CONFIRMED, and it is genuinely apples-to-apples

I expected to find that A dodges the bug only because it doesn't model per-item gates. It does model them,
identically. `features/commodities/obligations.js:96-111`: `animalIdentifiers` is a collection whose item is
the **same seven obligations**, and **all seven carry `activatedBy: enclosingCommodity(...)` + `wipeOnExit:
true`** (`:31-85`). The A entry has **zero unconditional fields — exactly B's manifest shape.**

A survives anyway:

- `reconcile` (`engine/evaluate/reconcile.js:32-45`) emits **obligation paths** as wiped — always ending in
  a string id, never a collection index.
- `destroyWiped` → `deleteAt` (`lib/path.js:33-41,59-63`) splices only when the leaf segment is a
  **number**; for a string leaf it does `delete parent[leaf]`. The entry object stays in the array as `{}`.
- `walk` (`registry.js:59-68`) re-yields it (`entries.length` is unchanged), and `requiredOneOf` /
  `requiredAtLeastOne` (`:108-109`) then correctly report the animal as incomplete under the new commodity,
  prompting the user to fill tattoo/earTag.

So the asymmetry is real and it is a **storage-shape** asymmetry, not a manifest accident: A's answers tree
tolerates an all-gated collection item; B's inferred-instance storage requires an anchor **by convention**,
and that convention is nowhere written down (`obligations.md` never states it) and nowhere enforced
(`coverage.test.js` has 8 invariants, none of them "every group has an unconditional descendant").

## 5. What survives

**The durable finding is not "B annihilates animals" — it is "B's group-instance identity depends on an
undocumented, untested manifest convention that the V4 unit-record requirements happen to violate."** That
is a real hazard, a real black mark against the inferred-instance design, and a real thing to fix before
adopting it — but it is a **10-line fix inside the existing model**, not a storage-shape rewrite, and it
must not be scored as a structural defeat for B on this dimension.

If a third option keeps inferred instances, it must add the invariant as a boot assertion. If it wants the
hazard gone by construction, it takes A's nested-array entries.
