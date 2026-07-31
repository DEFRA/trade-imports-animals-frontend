# Collection cardinality

The model and engine enforce two kinds of collection limits.

## Manifest invariants

A group obligation can declare rules in `requires`. The generic queries in
[`src/server/app/model/obligations/state-queries.js`](../model/obligations/state-queries.js)
support:

- `minEntries` — a minimum number of group records
- `maxEntries` — a maximum number of group records
- `anyOfIds` — at least one listed in-scope leaf is filled per instance
- `allOrNothingOfIds` — a scalar block is either empty or complete
- `recordCountEquals` — a nested record count matches a declared field

`groupInvariantErrors()` emits structured errors only while the group is in scope.
Status and submit-readiness calculations consume those errors.

## Value-linked append caps

[`src/server/app/engine/evaluate/cardinality.js`](../engine/evaluate/cardinality.js)
implements `collectionCapAt(answers, collectionPath)`. The declaration map in
[`src/server/app/bridge/obligation-source.js`](../bridge/obligation-source.js)
links a collection name to a sibling count field.

The function returns a non-negative integer cap, or `null` when the collection has
no declared link, the count is blank or the value is not a non-negative integer.
The append write path rejects another entry when the current length has reached the
cap.

## Why both checks exist

Manifest `requires` rules determine completeness and defend loaded data. A
value-linked cap controls whether a write may add another nested record. A journey
can use either or both, depending on its model.
