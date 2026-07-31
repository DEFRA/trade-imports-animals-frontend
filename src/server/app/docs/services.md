# Platform services

Services implement IO and reference-data access below the engine. The engine never
imports them directly; L1 injects adapters into engine ports.

## Run mode

[`src/server/app/services/mode.js`](../services/mode.js) selects stub or real mode
from `LIVE_ANIMALS_MODE`. Service barrels use that common decision where both
implementations exist.

## Reference services

Platform services include:

- [`countries`](../services/countries/index.js)
- [`ports`](../services/ports/index.js)
- [`document-uploads`](../services/document-uploads/index.js)
- [`address-book`](../services/address-book/index.js)
- [`transport-reference`](../services/transport-reference/index.js)
- [`import-reason-purpose`](../services/import-reason-purpose/index.js)

Countries and ports expose `prime()` operations. `routes.js` primes them when the
application runs in real mode, before Hapi routes are registered.

## Persistence adapters

[`src/server/app/services/persistence/`](../services/persistence/) implements the
records and session contracts. L1 passes the selected adapters to
`configureRecords()` and `configureSession()`.

The records adapter owns canonical storage and backend notification projections.
The session adapter owns known journey ids, opening-run state and flow-only answers.
See [Persistence](persistence.md).

## Set-owned services

Reference data that only makes sense for one obligation set belongs to that set.
The live-animals commodities service is documented in the
[live-animals services guide](../sets/live-animals/docs/services.md).
