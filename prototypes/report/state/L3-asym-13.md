# L3 asym-13 — Cardinality as vocabulary (floor + field-linked max) — A-only

**CAPABILITY:** minimum-instance floor ("at least one commodity line") + field-linked
maximum ("at most N animal records where N = numberOfAnimals").
**DIRECTION claimed:** A-only, B absent AND cannot express it without a model change.
**VERDICT: AMENDED.** The *absence* is real (B ships zero cardinality vocabulary today, and
the missing floor is a live defect). The *structural* framing is wrong: both the floor and a
field-linked maximum-as-validation are additive extensions to B's existing
`requires` / `groupInvariantErrors` / `classifyEntries` primitive. ~25-30 LOC, no model change.

---

## 1. What A actually ships (verified, fair to A)

- **Floor:** `collectionComplete` (`engine/evaluate/complete.js:63-65`):
  `if (obligation.requiredAtLeastOne && entries.length === 0) return false`. A boolean flag on
  the collection, consumed by the completeness function. Blocks submit on an empty collection.
- **Max:** `collectionCapAt` (`engine/evaluate/cardinality.js:20-31`) resolves a **sibling**
  count obligation's value at the parent frame and returns it as a cap; `engine/write.js:23-24`
  rejects an append at the cap. Confirmed **MAX-only and one-directional** (the file's own
  docstring: "the per-species at-least-one floor still bites at submit"; the *inverse* — count
  edited below the record count — is hand-built `countDropIssues`, per L2 §1.2).

Both mechanisms are real. A's headline is accurate *as a description of A*.

## 2. B genuinely lacks it today (the real kernel — CONFIRMED)

`grep -rniE "minEntries|maxEntries|maxEntriesFrom|minItems|maxItems|requiredAtLeastOne"` over
the entire B fork returns **zero matches**. `numberOfAnimals` is a bare per-line integer with a
`>= 1` lower bound only (`domain/index.js:798-815`) and is completely unconnected to the number
of `unitRecord` instances. The floor's absence is a live defect: nothing forces a notification to
have any commodity lines, so a journey with an empty (NA) commodity section but everything else
filled can classify toward Fulfilled. This part of the claim survives.

## 3. Why "cannot without a model change" is REFUTED — the mechanism already exists

B has a first-class engine primitive that emits per-group errors and folds them into the status
classifier. The plumbing the floor/cap need is **already load-bearing**:

- `groupInvariantErrors(group, state)` (`engine/index.js:512-539`) iterates
  `state.obligations[group.id].records` — **the group's instance set is already in `state`** —
  and emits one error per violating instance.
- `collectGroupsPresentedIn` (`engine/index.js:545-556`) walks the **flow structure** and
  collects every group referenced by a `presentsForEach.forEachOf` node **regardless of instance
  count**. So a group with *zero* instances is still collected — a floor error would surface even
  at count 0. This is the exact condition the floor must fire on, and the collection path already
  reaches it.
- `classifyEntries` (`engine/index.js:386-408`) already takes a `groupErrorCount` and adds it to
  `totalMandatoryConcerns` / `totalMandatoryUnsatisfied`. `journeyState` (`:585-600`) and
  `containerStatus` (`:469-474`) already sum `groupInvariantErrorsForContainer(...).length` into
  that count.

### Floor — ~8-10 LOC, additive
Add `commodityLine.requires = { minEntries: 1 }`. Extend `groupInvariantErrors` (or add a sibling
`groupCardinalityErrors`) to emit one error when `groupImpl.records.length < requires.minEntries`.
The error rides the existing `collectGroupsPresentedIn` → `groupErrorCount` → `classifyEntries`
path untouched. This is precisely the "new predicate in an existing dispatch table" that downgrades
a structural claim. The claim's own cost line concedes it ("~8 LOC, additive-structural").

### Field-linked max — ~15-20 LOC, additive (as a GDS over-cap *validation*)
Add `unitRecord.requires = { maxEntriesFrom: numberOfAnimals }`. A sibling reads, per parent
instance `lineK`, the count field `state.fulfilments[numberOfAnimals.id]['lineK']` and counts
`unitRecord` records whose composite `fulfilmentId` has prefix `lineK` (splitPath, already the
storage model), emitting an error when the count exceeds N. **Every input is already in `state`.**
The claim asserts this "needs a cardinality RELATION the evaluator can read (structural, new
concept)". That overstates it: B's evaluator **already reads a parent-level answer to gate a
child-level obligation** — `allowListed(commodityCode, …, unitRecord)` /`projectionGroup`
(`helpers.js:204-209`) bridges the exact same line→unit identity gap this cap needs. Reading a
parent count to validate a child collection size is the same cross-level read, not a new concept.

## 4. The one genuinely structural item nearby — and the claim does NOT describe it

B *is* structurally foreclosed from **derived cardinality that MATERIALISES instances** — creating
N unit records because N animals were declared. `buildImplication`'s group branch
(`evaluator.js:457-467`) reads a group's instances exclusively from storage-key enumeration and
ignores `own.records` (L1-B §5.1). That is a real model wall.

But the claim describes a **cap** ("at most N"), not a materialiser — and A itself only caps
(`maxEntriesFrom` is MAX-only). A cap is a validation over storage-derived instances, which is
exactly what `groupInvariantErrors` already does. So the structural wall exists but sits on the
other side of the line the claim draws.

## 5. Honest note on what B should *not* copy
A's cap is enforced on the **write path** (`write.js` returns null over cap), which is *why* A's
link is one-directional and needs 20 LOC of hand-built `countDropIssues` for the inverse. B has no
write primitive and does not want one: a re-derived over-cap *error* (folded into `classifyEntries`)
is the better GDS answer and is bidirectional for free — one `requires.maxEntriesFrom` declaration
covers both "too many units" and "count dropped below units". So B closing this gap ends up
*better* than A's shipped version, not merely at parity.

---

## AMENDED CLAIM
B ships no cardinality vocabulary today and the missing minimum-instance floor is a **live defect**
(zero commodity lines does not block submit). But this is an **unbuilt** gap, not a structural one:
both the floor and a field-linked maximum (as a GDS re-derived over-cap validation) are **additive**
extensions to B's existing `requires` / `groupInvariantErrors` / `classifyEntries` primitive — new
`minEntries` / `maxEntriesFrom` manifest keys plus a sibling of `groupInvariantErrors` that reads
`state.obligations[group.id].records.length` and the parent-level count field (both already in
`state`, over the same cross-level identity bridge `allowListed`/`projectionGroup` already uses),
riding the existing `groupErrorCount` plumbing. ~25-30 LOC, **no model change** — and the result is
bidirectional, which A's write-time cap is not. The only genuinely *structural* A-only capability in
this neighbourhood is **derived cardinality that materialises instances** (N records created from a
declared N), which B's `buildImplication` group branch forecloses — but the claim does not describe
that; A only caps.
