# Live-animals obligation set

The live-animals manifest is
[`src/server/app/sets/live-animals/obligations/index.js`](../obligations/index.js).
It imports the declarations in `obligations/sections/`, exports each obligation,
builds the ordered `obligations` array and derives `groups` from `within`
references.

## Sections

The set divides declarations by domain:

- arrival
- commodities, including aggregates, identifiers and line fields
- documents
- import reason
- miscellaneous consignment details
- origin
- parties
- system values
- transport

The declarations use helper functions from the platform model. They contain stable
identity, scope, mandate and cardinality rules, but no display copy or journey
knowledge.

## Commodity rules in the manifest

The CPH question is asked unless every commodity line's code is exempt; a line
with no code yet is ignored rather than counted as outside the exemptions
(`anyNotInUnionOf`). The animal identifiers floor asks for a record per commodity
line only on a consignment carrying more than one identified commodity line
(`moreThanOne` over the identified-commodity allowlist).

## Registration

This set's gateway,
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it), imports the
manifest namespace and passes it to `configureObligationSet()` under this set's
id. Generic model and bridge code then reads the set through
[`src/server/app/model/obligations/manifest.js`](../../../model/obligations/manifest.js).

The journey's feature bindings import the same obligation objects from this set.
This shared object identity lets the fulfilment registry check that every leaf is
owned once and that grouped binding paths match each `within` chain.

## Set checks

[`src/server/app/sets/live-animals/obligations/coverage.test.js`](../obligations/coverage.test.js)
checks manifest identity, dependency and group invariants.
[`src/server/app/sets/live-animals/obligations/allowlists.test.js`](../obligations/allowlists.test.js)
checks commodity allow-lists against the set-owned reference service. The test
iterates every allow-list and gated obligation pair, checks that a control value on
no list leaves the obligation out of scope, and pins each allow-list to an expected
list, so a single-file edit to a service list fails the drift check. To change an
allow-list on purpose, edit it in
[`rules.js`](../services/commodities/rules.js) and update the matching expected list
in the test in the same change.

The generic model contract is in the [platform obligation-model guide](../../../docs/obligation-model.md).
