# Live-animals limits and edges

## Accompanying documents are capped at fifteen

The document collection has a maximum of fifteen entries. The set manifest declares
the cardinality and the documents feature enforces it on its write path.

## Commodity rules are set data

Species come from MDM through reference-data. The rules in
[`rules.js`](../services/commodities/rules.js) are set data: the identifier,
package-count, permanent-address, unweaned, CPH-exemption and type rules. They must
match MDM's spelling exactly.

## Backend notification projections differ

Canonical fulfilment can contain values that one backend projection cannot
represent. Mapper B layers its additional fields over Mapper A. A new obligation
always needs a feature binding, but it only gets a mapper field when the target
backend schema has a real home for it.

## A number of animals or packages above what the backend's field can hold is refused

Commodity details refuses a number of animals, and a number of packages,
above 2,147,483,647 on each species line. The animals backend's
`CommodityComplement.totalNoOfAnimals`, `CommodityComplement.totalNoOfPackages`
and `Species.noOfPackages` are Java `Integer` fields, so a count above their
range is rejected by the backend rather than stored.

The cap guards each line's own number, not the totals the backend derives
from it. `CommodityComplement.totalNoOfAnimals` and `totalNoOfPackages`
receive the SUM of a commodity's lines
([`commodity.js`](../services/persistence/records/notification-mapper/mapper-a/commodity.js)
sends `totalNoOfAnimals: totalOf(group, 'numberOfAnimalsQuantity')` and
`totalNoOfPackages: totalOf(group, 'numberOfPackages')`), so several lines
under one CN code can still sum past the field's range, and nothing in the
frontend refuses that.

## Collection positions are snapshot-local

Grouped fulfilment tokens such as `line0` and `unit1` are positions in one canonical
snapshot, not durable record identifiers. Removing an earlier entry can renumber
later entries.

Generic constraints are documented in [Platform limits](../../../docs/limits.md).
