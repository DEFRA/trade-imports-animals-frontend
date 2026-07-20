# Plan — unit-count-equals-numberOfAnimals invariant

Adds a cross-group invariant enforcing that, per commodity-line
instance, the number of `unitRecord` children equals the scalar
`numberOfAnimals` stored for that line. Closes the "unit records ARE
animals" reading of the V4 spec (Confluence page 6497338582):

- L2: "Commodity line — 1..N per notification. A commodity code plus
  its taxonomy chain (Type, Class, Species) plus a quantity."
- L3: "Unit record — 0..N per line. Per-animal identifiers, per-animal
  Permanent Address."
- Animal Identifiers section: "A notification must be submitted with
  at least one animal identifier per animal."

The identifier rule is only coherent if unit records are the animals.
Combined with `numberOfAnimals: Mandatory to proceed`, this
transitively requires `unitRecord.records.length ===
numberOfAnimals` per line.

## Locked decisions

1. **Invariant lives on `unitRecord.requires`** (not `commodityLine`).
   Reason: `collectGroupsPresentedIn` walks `presentsForEach.forEachOf`
   edges; any subsection presenting unit-scoped obligations
   (animal-identifiers) already surfaces `unitRecord`. Routing the
   invariant to `unitRecord` means its status flip lands on the
   animal-identifiers subsection — exactly where the user expects to
   see it. Putting it on `commodityLine` would leave that subsection
   showing "complete" while the mismatch fires at journey rollup only
   — the classic "task list says F but journey says IP" smell.
2. **Rollup-only, no purge.** Reducing `numberOfAnimals` below the
   current unit-record count leaves the extra unit records intact;
   the invariant fires until the user removes them (or bumps the
   number back). Auto-purge would silently discard data (identifier
   values, permanent addresses) without asking. Symmetric with
   the too-many-units direction.
3. **Simple numeric error.** One error per violating line-instance
   with `{expected, actual}`. Copy: "Commodity line N says X animals
   but you've added Y sets of identifiers" (change link into
   `/lines/{lineId}/units`).
4. **Skip when `numberOfAnimals` is blank** for a line — the existing
   `mandatoryToProceed: true` on the number-of-animals page catches
   that case at journey level; no need to double-fire.
5. **New invariant kind** `requires.recordCountEquals` — sits
   alongside `anyOfIds` / `minEntries` / `allOrNothingOfIds` on the
   same `groupInvariantErrors` primitive.

## Semantics

Given `unitRecord.requires.recordCountEquals: { fieldId, errorCode }`:

- Walk every in-scope parent (`unitRecord.within`, i.e.
  `commodityLine`) instance.
- For each parent instance `lineId`:
  - Read `expected = state.fulfilments[fieldId][lineId]`.
  - Skip if `isBlankValue(expected)`.
  - Count `actual = state.obligations[unitRecord.id].records`
    where `fulfilmentId.startsWith(lineId + '/')`.
  - Emit one error `{code, groupId, groupName, instanceId: lineId,
expected, actual}` iff `actual !== expected`.

Uses `isBlankValue` for the skip check to stay consistent with the
other invariant kinds.

## File-by-file changes

### 1. `engine/index.js` — extend `groupInvariantErrors`

Add a fourth branch alongside `minEntries` / `anyOfIds` /
`allOrNothingOfIds`. Docstring updated to enumerate all four.

Requires access to the parent group — `group.within` is the natural
data. If `within` is unset the invariant is malformed; treat as noop
(defensive).

Reads `state.obligations[parent.id].records` for the parent instance
list, `state.fulfilments[fieldId]` for the expected count, and
`state.obligations[group.id].records` for the actual count. All
existing state shape — no evaluator changes needed.

### 2. `obligations/obligations.js`

Extend `unitRecord.requires`:

```js
export const unitRecord = {
  id: '...',
  name: 'unitRecord',
  within: commodityLine,
  requires: {
    anyOfIds: [
      /* six identifier ids, unchanged */
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired',
    recordCountEquals: {
      fieldId: numberOfAnimals.id,
      errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
    }
  }
}
```

`numberOfAnimals` is declared above `unitRecord` in the manifest so
no TDZ issue. If it wasn't, we could use an `{id}` proxy the same way
the accompanying-document code once did.

### 3. `features/check-your-answers/controller.js`

Add a second `groupInvariantErrorsForState` branch (alongside the
existing per-unit-identifier prompt) matching the new error `code`.
Emit one prompt per violating line with:

```
"Commodity line {N} lists {expected} animal(s) but you've added {actual}"
  href: /lines/{lineId}/units
```

Use `ordinalOfLineId` (already imported) for the human ordinal. No
`unitN` reference — this is a line-level mismatch.

New i18n key: `cya.promptUnitCountMismatch`.

### 4. `locales/en.json`

- `errors.unitRecord.countMustMatchNumberOfAnimals` — surfaced by
  `groupInvariantErrors` if a caller ever wants the raw code.
- `cya.promptUnitCountMismatch` — the templated prompt copy.

### 5. Tests

**`engine/index.test.js`** — new describe for `recordCountEquals`
mirroring the existing `anyOfIds` describe. Cases:

- empty list when no group carries `requires`
- empty list when the group is out of scope
- empty list when the field value is blank (skip-case)
- one error when `actual < expected` (too few units)
- one error when `actual > expected` (too many units)
- zero errors when `actual === expected`
- correct instanceId + expected + actual on the error
- multi-line: one error per violating line, other lines silent

**`obligations/evaluator.test.js`** — one integration case walking
the full evaluate path with the invariant in place. Assert the
implication `state.obligations[unitRecord.id]` still shapes
correctly (invariant is state-side, evaluator-agnostic).

**`integration.test.js`** — the golden path from the thought
experiment:

1. `numberOfAnimals: 2`, no unit records — journey IP, animal-
   identifiers subsection status = NS (or IP depending on parent
   scope; assert against actual).
2. Two units with identifiers filled — animal-identifiers = F,
   journey = F.
3. Amend `numberOfAnimals: 1` — animal-identifiers flips back to IP,
   journey IP. Assert the error surfaces on that subsection.

**`features/check-your-answers/controller.test.js`** — assert the
new prompt renders with the right text + href when the mismatch
condition is set up in state.

### 6. Docs regeneration

- `npm run docs:model` — MODEL.md regenerates. New dotted edge:
  `unitRecord -.-> numberOfAnimals`. Update the generator's caption
  (currently mentions `anyOfIds` and `allOrNothingOfIds`) to include
  `recordCountEquals`.
- Also update the generator's `dependencyNodeShapes` +
  `requires*Edges` functions to render the new edge type.

### 7. Handover

Tick this off in `EUDPA-288-HANDOVER.md`. Cross-reference the
"animalsCertifiedFor pending APHA" open follow-up so future readers
see the connection (the two are related in the "how strict is the
model about commodity-line-scoped rules" theme).

## Commit shape

Single commit:
`feat(EUDPA-288): unit-count-equals-numberOfAnimals invariant`

## Out of scope (deferred)

- **Purge / auto-cleanup of unit records when `numberOfAnimals`
  drops.** Auto-purge silently loses data; rollup-only lets the user
  choose which units to remove.
- **Page-save block on the number-of-animals page.** Locked decision
  #1 in the thought experiment — the rule is "mandatory to complete
  the journey", not "mandatory to proceed at page level".
- **Cross-line invariants** (e.g. "total animals across all lines
  must be ≥ 1"). Spec is silent; `minEntries: 1` on `commodityLine`
  already covers "at least one line", and the new per-line invariant
  covers the count.
- **UI affordance to auto-add empty unit records** when
  `numberOfAnimals` increases. The user should choose to add units;
  the "add another animal" affordance in the units index already
  supports this.
