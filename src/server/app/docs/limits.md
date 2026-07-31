# Platform limits and edges

## The obligation model is executable code

Obligation `applyTo` rules are JavaScript functions. Helper metadata makes their
dependencies inspectable, but the manifest is not portable JSON configuration.

## Derived gates use any in-scope obligation

The normal page gate passes when at least one collected obligation is in scope and
its prerequisites pass. A journey must author a gate when that rule does not express
the required policy.

## Array-valued answers do not drive scalar gates

The standard scalar gate helpers expect scalar fulfilment values. Collection
conditions use group-aware helpers and cardinality rules instead.

## Ownership at depth is derived

Pages claim root obligation names in `meta.collects`. Dispatch and the fulfilment
registry derive ownership of nested collection leaves from binding paths and the
manifest's `within` chain. Do not declare a second page owner for a nested leaf.

## Persistence is injected, not transactional across adapters

The engine writes through the configured records port. Real persistence can update
more than one backend projection, and adapter code is responsible for reporting
partial failures as recoverable backend errors.

Set-specific caps, projection differences and commodity constraints are documented
in [live-animals limits](../sets/live-animals/docs/limits.md).
