# Collection cardinality

Collection size rules live in two places. Static invariants sit on a group
obligation's `requires`. The one value-linked add cap sits in
`bridge/obligation-source.js`.

Neither kind removes records. A user or controller must resolve a mismatch.

## Static `requires` rules

`model/obligations/state-queries.js` evaluates all `requires` rules for an
in-scope group. It returns every error that applies, so rules can fail at the
same time.

### `minEntries`

`minEntries` sets a collection floor:

```js
requires: {
  minEntries: 1,
  errorCode: 'obligation.commodityLine.atLeastOne'
}
```

`commodityLines` uses this rule. With no line, the task stays not started. The
current status bridge treats this as an at-least-one floor. The current
manifest does not declare a floor above one.

### `maxEntries`

`maxEntries` sets a fixed upper bound:

```js
requires: {
  maxEntries: 10,
  maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
}
```

`documents` uses this rule. Ten documents satisfy the cap. Eleven produce a
`MAX_ENTRIES` invariant error and keep the task in progress.

The model rule is the final status defence. It does not stop a write by itself.
The documents page reads the same value through `maxDocuments()` to hide or
reject another add.

### `anyOfIds`

`anyOfIds` requires at least one listed leaf in each collection instance. It
checks only listed leaves that are in scope for that instance. If none of the
alternatives is in scope, the rule is satisfied.

`animalIdentifiers` lists passport, tattoo, ear tag, horse name, identification
details and description. Each animal record must have at least one applicable
identifier.

This rule also makes an empty identifier collection incomplete. One complete
record meets the alternative rule, but other cardinality rules can still fail.

### `recordCountEquals`

`recordCountEquals` links a nested collection count to a field on its parent:

```js
recordCountEquals: {
  fieldId: numberOfAnimals.id,
  errorCode: 'obligation.unitRecord.countMustMatchNumberOfAnimals'
}
```

For each commodity line, the evaluator counts identifier records below that
line and compares the count with `numberOfAnimals`.

A blank expected count is skipped. The mandatory rule on `numberOfAnimals`
still blocks completion. A mismatch produces one error keyed to the parent
line. It affects roll-up status, not scope or stored values.

## The value-linked add cap

`MAX_ENTRIES_FROM` maps:

```js
animalIdentifiers: 'numberOfAnimalsQuantity'
```

`collectionCapAt(answers, path)` reads that sibling count in the same parent
frame. It returns a non-negative integer cap. It returns `null` when there is no
mapping, the count is blank or the value is not a non-negative integer.

`appendEntryAt()` returns `null` without writing when the list is already at
the cap. This protects a stale form as well as the visible add control.

This cap controls admission only. `recordCountEquals` controls completion.
Together they mean:

- the page cannot add more identifier records than the animal count
- the task is not complete until the record count exactly matches
- lowering the count does not trim records
- a blank count gives no add cap, but the mandatory count still blocks submit

The consignment-details controller also rejects a count reduction below the
number of saved identifier records. This gives the user a field error instead
of storing a mismatch.

## How rules combine

The identifier group combines three effects:

1. `anyOfIds` requires an applicable identifier in each record.
2. `recordCountEquals` requires the exact number of records for each line.
3. `MAX_ENTRIES_FROM` prevents another record once the line count is reached.

Meeting one rule does not bypass another. A single valid ear tag can satisfy
the alternative rule while the task stays in progress because the line says
there are two animals.

The documents group has a maximum but no minimum. No documents gives the task
the optional status. Once a document is started, its mandatory member fields
must be complete, and the collection must stay within the cap.

Add new static rules to the group obligation. Add a value-linked add cap only
when the limit comes from a sibling field in the same parent frame. Pin the
invariant in `model/obligations/state-queries.test.js`, the status in
`bridge/status/status.test.js`, and write admission in
`engine/mutators.test.js`.
