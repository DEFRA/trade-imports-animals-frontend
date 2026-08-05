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

## Registration

[`src/server/app/routes.js`](../../../routes.js) imports the manifest namespace and
passes it to `configureObligationSet()`. Generic model and bridge code then reads the
set through
[`src/server/app/model/obligations/manifest.js`](../../../model/obligations/manifest.js).

The journey's feature bindings import the same obligation objects from this set.
This shared object identity lets the fulfilment registry check that every leaf is
owned once and that grouped binding paths match each `within` chain.

## Set checks

[`src/server/app/sets/live-animals/obligations/coverage.test.js`](../obligations/coverage.test.js)
checks manifest identity, dependency and group invariants.
[`src/server/app/sets/live-animals/obligations/whitelists.test.js`](../obligations/whitelists.test.js)
checks commodity allow-lists against the set-owned reference service.

The generic model contract is in the [platform obligation-model guide](../../../docs/obligation-model.md).
