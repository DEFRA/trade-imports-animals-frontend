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

## Collection positions are snapshot-local

Grouped fulfilment tokens such as `line0` and `unit1` are positions in one canonical
snapshot, not durable record identifiers. Removing an earlier entry can renumber
later entries.

Generic constraints are documented in [Platform limits](../../../docs/limits.md).
