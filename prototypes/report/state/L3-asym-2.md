# L3 — Adversarial verification — asym-2

**CAPABILITY:** Minimum-instance floor — `requiredAtLeastOne`: ≥1 commodity line, and
≥1 identifier record per species at submit (spec-mandated, c-031 floor).
**DIRECTION claimed:** A-only, STRUCTURAL (B cannot without changing its model).
**VERDICT: REFUTED** — the "structural / cannot without changing its model" framing is wrong.
B genuinely lacks the floor today (the live defect is real), but closing it is a purely
**additive** extension — one config key + one ~8-LOC reader over state the evaluator
**already produces**, injected through a classifier slot that **already exists**. This is the
textbook "small extension, not structural" case.

---

## 1. What A actually ships (evidence, both floors)

A carries `requiredAtLeastOne: true` as a first-class boolean on **two** collection
obligations:

- Top-level: `commodityLines` (`features/commodities/obligations.js:123`).
- Nested: `animalIdentifiers` (`:108`) — the per-species/per-line identifier collection.

Two read sites, both trivial:

- Completeness walk — `engine/evaluate/complete.js:65`:
  `if (obligation.requiredAtLeastOne && entries.length === 0) return false`.
- Classifier — `engine/status.js:24`: `isRequiredObligation = obligation?.required ||
  obligation?.requiredAtLeastOne`, so an empty required collection cannot reach
  `FULFILLED`/`OPTIONAL` in `statusOf` (`:59-79`); it returns `NOT_STARTED`.

So A is `modelled-declaratively`, and both floors are real. The A side of the claim is
accurate. The dispute is entirely about whether B's absence is **structural**.

## 2. The live defect on B is confirmed — but that only proves "unbuilt", not "structural"

B has no min/max-cardinality verb anywhere (re-verified: no `minEntries`/`maxEntries`/
`minItems`/`maxItems` in any `.js`; matches L1-B §5). `commodityLine`
(`obligations/obligations.js:405-410`) carries no cardinality field. `requires.anyOf` on
`unitRecord` (`:581-593`) is a **within-instance field invariant** (≥1 of 6 sibling
*fields*), evaluated per-instance by `groupInvariantErrors` (`engine/index.js:512-539`)
with **vacuous satisfaction** at `:524` (`if (inScopeLeaves.length === 0) continue`). It is
structurally the wrong shape for "≥1 *instance*": with zero instances the per-instance loop
runs zero times and passes vacuously.

Trace of the claimed defect through `journeyState` (`engine/index.js:583-599`) with zero
commodity lines: `expandPresents(commodity-details)` yields no in-scope entries;
`commodityLine` has no `requires`, so `groupInvariantErrorsForContainer` contributes 0. If
the scalar sections are filled, `classifyEntries` sees all mandatory concerns satisfied →
`FULFILLED`. **Confirmed: a zero-line B journey classifies ready-to-submit.** The gap is
real. The question is its *cost*, not its existence.

## 3. The mechanism to close it already exists — three pieces, all present

### 3.1 The instance count is already derived (no `buildImplication` change)

The group branch of `buildImplication` (`obligations/evaluator.js:457-467`) always emits
`impl = { inScope: true, records: fulfilmentIds.map(...) }` for a structural group. With
zero descendants, `fulfilmentIdsByObligationId.get(commodityLine.id)` is empty ⇒
`state.obligations[commodityLine.id] = { inScope: true, records: [] }`. **The count
(`records.length`) is readable and equals 0 even when the collection is empty.** A floor
reader needs no new derivation — it reads `.records.length` off state that is already there.
This is the decisive point: unlike *derived-MAX* cardinality (`maxEntriesFrom`, L1-B §5.1),
which requires rewriting the group branch to honour `own.records`, a *floor* reads the
count the evaluator hands it for free.

### 3.2 The classifier slot that "reads it" already exists

The claimed cost includes "plus a classifier branch that reads it." That branch is **not
new.** `classifyEntries` (`engine/index.js:386-410`) already accepts a `groupErrorCount`
decoupled from `inScope`:
- `:387` returns `NOT_APPLICABLE` only when `inScope.length === 0 && groupErrorCount === 0`
  — a non-zero floor error flips it off NA.
- `:398-400` fold `groupErrorCount` into `totalMandatoryConcerns`/`totalMandatoryUnsatisfied`.
- With an empty collection + one floor error: `totalMandatoryConcerns = 1`,
  `totalMandatoryUnsatisfied = 1`, `touched = []` ⇒ `NOT_STARTED` (`:404`). **Blocks submit.**

The docstring states the design intent verbatim (`:381-384`): "Group-invariant errors count
as additional unsatisfied mandatory concerns … The count-based encoding lets a single
classifier serve every level." A minimum-instance floor is exactly one more count into that
same slot.

### 3.3 The injection point already collects the right group

`groupInvariantErrorsForContainer` (`:561-570`) already walks `collectGroupsPresentedIn`,
which picks up `commodityLine` because the commodity-details page declares
`presentsForEach.forEachOf = commodityLine` (`flow/flow.js:438-445`). `journeyState:589`
already sums that container error count across sections.

## 4. The cheap workaround (true cost)

Give `commodityLine`/`unitRecord` a `requires.minEntries` config key, then:

```js
// sibling of groupInvariantErrors — ~8 LOC, reads already-derived count
export function groupCardinalityErrors(group, state) {
  const min = group?.requires?.minEntries
  if (min == null) return []
  const groupImpl = state.obligations?.[group.id]
  if (!groupImpl?.inScope) return []
  const n = (groupImpl.records ?? []).length          // count is already there
  return n >= min ? [] : [{ code: group.requires.minEntriesErrorCode,
                            groupId: group.id, groupName: group.name }]
}
```

Wire it into the existing loop at `engine/index.js:566` (which already proceeds for any
group carrying `requires`) so its errors add to the same `groupErrorCount`. Total: **1
config key + ~8-LOC reader + 1 wiring line (~15-20 LOC)**, reusing the derived instance
list, the existing group-collection walk, and the existing count-based classifier slot.

Nested floor #2 ("≥1 unitRecord per commodityLine") is the same shape, and is precisely
what L1-B §5.2 already classified `structural: false`: attach it to `commodityLine`, iterate
its (existing, ≥1) instances, count `unitRecord` records under each prefix. The two floors
compose — floor #1 catches zero lines, floor #2 catches a childless line.

**No storage-contract change. No `buildImplication` change. No new evaluation mode over
storage.** It reads what `evaluate()` already emits and drops one count into a slot built
for exactly this.

## 5. Why this is REFUTED, not AMENDED

The verdict rubric makes REFUTED cover "the 'structural' framing is wrong (merely unbuilt,
or a small extension)." That is exactly the situation:

- The claim's **headline** ("B CANNOT do this without changing its model") and **DIRECTION**
  ("A-only structural") are false. Adding an optional config key that a new reader consumes
  is a model-shape *addition* that leaves every existing semantic, the storage contract, and
  the instance-derivation untouched — not a model *change* in the sense that separates
  structural from additive here. Contrast the genuinely structural B gap (derived-MAX
  `maxEntriesFrom`, which forces a `buildImplication` rewrite + an instance-purge path,
  L1-B §5.1) — the FLOOR shares none of that cost.
- The claim's own "CLAIMED COST TO CLOSE" already concedes "small code," and even overstates
  the small part: the classifier branch it says must be added is already present as
  `groupErrorCount`.

**What survives as a true (narrower) statement, for the shopping list:** B ships neither
floor today and has a live "zero commodity lines ⇒ ready-to-submit" defect; the fix is a
~15-20 LOC additive port of A's `requiredAtLeastOne` into B's `requires` slot, reading the
already-derived `state.obligations[group.id].records.length` and feeding the existing
count-based classifier. It is unbuilt, not structural. This is consistent with L2
collections-cardinality (row "Cardinality min": "A (thin)"; §3 "Adding minEntries there is
additive. Unbuilt, not structural") and L1-B §5.2.

## 6. Fairness check — did I hunt the other way?

Yes. I confirmed A genuinely ships both floors (§1) and that B's `requires.anyOf` cannot be
repurposed as-is (vacuous satisfaction, §2) — so the asymmetry is not imaginary. But
"cannot repurpose the *existing* verb unchanged" ≠ "structural." The tree already holds
every load-bearing piece (derived count, group-collection walk, count-based classifier slot,
journey-level sum); only a config key and a small reader are missing. Structural obligations
would have nowhere to put the concept; B has three ready homes for it.
