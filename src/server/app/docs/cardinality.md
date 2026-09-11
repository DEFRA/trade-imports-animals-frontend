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
- `fulfilmentIndexCountEquals` — a nested record count matches a declared field

`groupInvariantErrors()` emits structured errors only while the group is in scope.
Status and submit-readiness calculations consume those errors.

## The empty-collection floor

A group whose `requires` carries `minEntries` or `anyOfIds` also carries an
empty-collection floor: with no records saved under a parent, the collection is
not satisfied. `requires.floorAppliesToParent` narrows the `anyOfIds`-derived
floor ONLY. A group carrying `minEntries` is asked of every parent regardless:
`emptyCollectionSatisfiesFloor` returns false on `minEntries` before it consults
the gate, so declaring both keys leaves the gate silently ignored. The key holds
an INDEXED, DEPTH-1 gate over a parent-level obligation — one whose
`fulfilmentIndexes` are the parent collection's own indexes, such as
`allowListed(field, values, null)`, optionally wrapped in `moreThanOne` — read
over the PARENT's stored values in
[`src/server/app/bridge/status/completeness/invariants.js`](../bridge/status/completeness/invariants.js);
a parent the gate does not name passes with no records at all. A gate carrying a
`gatedParentGroup` projection, or an unindexed gate, is NOT supported here: it is
read with an empty index map and stands the floor down for every parent,
silently. The animalIdentifiers group is the exemplar — design release 1 asks for
at least one identifier record per commodity line only on a consignment carrying
more than one identified commodity line, which the `moreThanOne` combinator
expresses over the identified-commodity allowlist. The gate counts lines whose
commodity has an identifier set, not distinct species, so two lines of the same
species satisfy it.

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
