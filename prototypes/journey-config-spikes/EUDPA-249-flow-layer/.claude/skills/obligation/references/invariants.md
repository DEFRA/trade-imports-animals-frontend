<!--
CANONICAL: prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/invariants.md
This copy exists so the `obligation` skill can bundle its own reference set.
Edit the canonical version first, then copy across.
-->

# Group invariants — the five kinds

The engine's `groupInvariantErrors(group, state)` primitive
(`engine/index.js`) supports five distinct invariant kinds. A group
(`commodityLine`, `unitRecord`, `accompanyingDocument`, or any
structural container) may carry any combination on its `requires`
object.

Each unsatisfied invariant contributes one entry to the group-error
count. `classifyEntries` (page/container status) treats group errors
as unsatisfied mandatory concerns — an unmet invariant blocks F just
like an unfilled mandatory obligation would.

## `minEntries` — collection floor

**Shape:**

```js
requires: {
  minEntries: 1,
  errorCode: 'obligation.commodityLine.atLeastOne'
}
```

**Semantics:** emits ONE
`{ code: 'MIN_ENTRIES', minEntries, actual, errorCode }` when
`records.length < minEntries`. Empty when at or above the floor.
Empty when the group is out of scope.

**Wired into:** `commodityLine.requires.minEntries: 1` — every
notification must have at least one commodity line.

**Use when:** a records-shape group has a required lower bound. If
zero records isn't a valid submission for this group, it needs a
floor; without one, the subsection collapses to NA (0 in-scope
entries + 0 group errors) and `journeyState → fulfilled` for an
empty consignment. See REPORT §7 "No minimum-instance floor".

## `maxEntries` — collection cap

**Shape:**

```js
requires: {
  maxEntries: 10,
  maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
}
```

`maxEntriesErrorCode` falls back to `errorCode` when omitted.

**Semantics:** emits ONE
`{ code: 'MAX_ENTRIES', maxEntries, actual, errorCode }` when
`records.length > maxEntries`. Empty at or below the cap.

**Wired into:** `accompanyingDocument.requires.maxEntries: 10` (WS4).

**Use when:** a records-shape group has a required upper bound. Enforce
the cap in the UI too (grey out the Add button) — the invariant is the
authoritative defence for after-the-fact cases like a redeploy
lowering the cap after the user saved records over the new limit.

## `anyOfIds` — per-instance "at least one of"

**Shape:**

```js
requires: {
  anyOfIds: [passport.id, tattoo.id, earTag.id, /* … */],
  errorCode: 'obligation.unitRecord.identifiersRequired'
}
```

**Semantics:** emits one error per in-scope group instance where NONE
of the required leaves has a fulfilment. Skipped when no listed leaf
is in scope for that instance (vacuously satisfied). Uses
`isBlankValue` so composite-address all-blank values count as
unfilled.

**Wired into:** `unitRecord.requires.anyOfIds: [six identifier ids]`
— the V4 "at least one Animal Identifier per unit-record" rule.

**Use when:** each record in a group must satisfy at least one of a
disjunction of leaves. Typical when the spec lists alternative
identifiers.

## `allOrNothingOfIds` — notification-level scalar block

**Shape:**

```js
requires: {
  allOrNothingOfIds: [type.id, attachment.id, reference.id, dateOfIssue.id],
  errorCode: 'obligation.accompanyingDocument.allOrNothing'
}
```

**Semantics:** members are scalar (notification-level) obligations
keyed directly by id in `state.fulfilments`. Emits ONE
`{ code, groupId, groupName, missingIds }` when
`0 < filledCount < total` (partial block). Zero errors when all-
blank (inactive) or all-filled (complete).

**Wired into:** none as of WS4 — WS2 originally used this on
`accompanyingDocument` but the WS4 records-shape upgrade retired that
wiring. The invariant kind is still supported for future notification-
level scalar blocks.

**Use when:** a small set of notification-level scalars must be filled
together or all left blank, without needing records-shape storage.
For sets that grow to N > 1, use a records group + `maxEntries` cap
instead (the WS4 pattern).

**Container back-refs:** members need `member.containers = [container]`
so `collectGroupsPresentedIn` in the engine can surface the container
from any page presenting a member. The manifest's end-of-file
back-ref pass populates this automatically for any obligation with
`requires.allOrNothingOfIds`.

## `recordCountEquals` — cross-group per-parent count match

**Shape:**

```js
requires: {
  recordCountEquals: {
    fieldId: numberOfAnimals.id,
    errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
  }
}
```

**Semantics:** for each in-scope parent (`group.within`) instance
`parentId`: read the expected count from
`state.fulfilments[fieldId][parentId]`, skip when blank, count
`records` whose `fulfilmentId.startsWith(parentId + '/')`, emit one
error per mismatch with `{ instanceId: parentId, expected, actual }`.

**Wired into:** `unitRecord.requires.recordCountEquals` reading
`numberOfAnimals` (WS3) — the V4 "unit records ARE animals" reading
of the spec.

**Use when:** a records group nested inside another records group has
a count constraint driven by a scalar sibling in the parent. Rollup-
only — no purge; the user reconciles by adding/removing records or
amending the scalar.

## Composition

A single group can carry all five simultaneously. `groupInvariantErrors`
walks each branch independently and returns the combined list. See
the composition test in `engine/index.test.js`
(`composes with 'requires.anyOf' — both a floor error and per-instance
errors surface`) for the pattern.

## Adding a sixth kind

`groupInvariantErrors` is a switch of independent branches — each
branch reads different bits of state and appends independent errors.
Adding a new invariant kind is:

1. New branch in `groupInvariantErrors`. Return one or more error
   entries. Include `{ code, groupId, groupName }` at minimum; add
   whatever's useful to CYA/hub for context.
2. New docstring bullet enumerating the kind (this file + the
   engine docstring).
3. Consider whether MODEL.md's dependency graph should render a
   dotted `-.->` edge for it. `anyOfIds`, `allOrNothingOfIds`, and
   `recordCountEquals` do; `minEntries`/`maxEntries` don't (they're
   self-invariants with no cross-obligation reference).
4. CYA prompt routing in `features/check-your-answers/controller.js`
   — add a `switch (err.code)` arm.
5. Tests: at least the blank / satisfied / composes-with-others /
   out-of-scope cases. See the `minEntries` describe for the pattern.
