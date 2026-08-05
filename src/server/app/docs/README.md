# Application platform documentation

`src/server/app/` is the shared notification-journey platform. It evaluates an
obligation set, manages canonical state, runs journey flow machinery and connects
abstract persistence ports to service implementations.

The application has four layers:

1. L1 — `src/server/app/`: composition and registration
2. L2 — the existing `engine`, `model`, `bridge`, `flow`, `services`, `lib`,
   `shared` and `analysis` directories under `src/server/app/`: set-agnostic
   platform code
3. L3 — `sets/<set>/obligations/`: one set's obligation data
4. L4 — `sets/<set>/journeys/<style>/`: one journey's pages and topology

[`src/server/app/routes.js`](../routes.js) is the composition point. It selects
the live-animals set and linear journey, then supplies them to the platform through
the `configure*` seams.

## Platform guides

- [Architecture](architecture.md)
- [Architecture decisions](decisions.md)
- [Engine](engine.md)
- [Obligation model](obligation-model.md)
- [Flow machinery and gates](flow-and-gates.md)
- [Scope and wipe](scope-and-wipe.md)
- [Collection cardinality](cardinality.md)
- [Validation](validation.md)
- [Persistence](persistence.md)
- [Services](services.md)
- [Analysis and reachability](analysis.md)
- [Platform limits](limits.md)
- [Testing the platform](testing.md)
- [Cross-repository test ownership](test-ownership.md)

## Set guides

- [Live-animals set and linear journey](../sets/live-animals/docs/README.md)
