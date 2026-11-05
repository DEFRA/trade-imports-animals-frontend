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

## A number of animals above the largest signed 64-bit integer is refused, but the save path holds less than that exactly

Commodity details refuses a number of animals above 9,223,372,036,854,775,807,
the largest signed 64-bit integer. The save path does not hold every accepted
value exactly: it converts the count with `Number()`, which holds an integer
exactly only up to 9,007,199,254,740,991, so a count between that figure and
the enforced cap is accepted and then saved as a different number.

## Collection positions are snapshot-local

Grouped fulfilment tokens such as `line0` and `unit1` are positions in one canonical
snapshot, not durable record identifiers. Removing an earlier entry can renumber
later entries.

Generic constraints are documented in [Platform limits](../../../docs/limits.md).
