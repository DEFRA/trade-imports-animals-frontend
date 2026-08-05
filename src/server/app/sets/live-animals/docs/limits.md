# Live-animals limits and edges

## Accompanying documents are capped at ten

The document collection has a maximum of ten entries. The set manifest declares the
cardinality and the documents feature enforces it on its write path.

## Commodity rules are set data

Species options, Cow Domestic/Game mapping and obligation allow-lists come from the
set-owned commodities service. They are stub data in this application and do not
prove compatibility with an external master-data source.

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
