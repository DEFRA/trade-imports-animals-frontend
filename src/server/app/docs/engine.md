# Engine

The engine is the request-facing state layer. Controllers import
[`src/server/app/engine/index.js`](../engine/index.js), not the evaluator or service
adapters.

## Public surface

The barrel exports:

- `get` and `makeScope`
- scalar and collection write operations
- `submitJourney`
- `collectionView` and `collectionCapAt`
- record lifecycle status constants

## Read path

[`src/server/app/engine/read.js`](../engine/read.js) loads the current journey once
per request, reads flow-only session answers, assembles a request view and memoises
it on `request.app`. The view contains the journey, canonical fulfilment, evaluated
state, projected answers and scope.

The bridge converts between canonical UUID-keyed fulfilment and page-shaped
answers. [`src/server/app/bridge/evaluation.js`](../bridge/evaluation.js) is the only
runtime path from that bridge to the pure model evaluator.

## Pure evaluation

[`src/server/app/model/obligations/evaluator.js`](../model/obligations/evaluator.js)
creates an evaluator for the configured manifest. Each call:

1. drops stored ids that are not in the manifest
2. evaluates applicability
3. repeatedly purges out-of-scope values until the view converges
4. enumerates surviving group instances
5. builds an implication for every obligation

Evaluation is synchronous and has no request, session or service dependency.
[`state-queries.js`](../model/obligations/state-queries.js) reads mandates and group
invariant errors from its result.

## Write path

[`src/server/app/engine/write/commit.js`](../engine/write/commit.js) splits a patch
into canonical and flow-only values. Canonical writes rebuild fulfilment through
the registered bindings, evaluate and purge it, then replace the whole snapshot
through the records port. Flow-only values use the session port.

Collection mutations use the same canonical pipeline. They do not bypass scope,
purge, answer-key recognition or persistence.

[`src/server/app/engine/write/submit.js`](../engine/write/submit.js) checks recognised
answer keys and `scope.readyForCheckYourAnswers` before calling `records.finalise`.
Submit changes lifecycle state; it does not perform a separate fulfilment save.

## Answer-key recognition

[`bridge/obligation-source.js`](../bridge/obligation-source.js) is the one place
that says which keys may appear in a stored answers tree: manifest obligation
names in their declared position, flow-only keys and the system keys. The
evaluator never scopes or wipes a key outside that surface, yet the key would
ship raw at finalise, so the engine's write paths and `submitJourney` reject it
loudly instead. `referenceNumber` is accepted by answer validation but is left
out of canonical assembly, because runtime notification projections take the
reference from the journey envelope.

A collection's entry count is capped at the value of a sibling count field. The
declaration is `ENTRY_CAP_FIELD_BY_COLLECTION` in that file; enforcement is
`collectionCapAt` in
[`engine/evaluate/cardinality.js`](../engine/evaluate/cardinality.js), and
`appendEntryAt` rejects an append at the cap.

## Abstract ports

The engine owns the interfaces in
[`engine/persistence/records.js`](../engine/persistence/records.js) and
[`engine/persistence/session.js`](../engine/persistence/session.js). Unconfigured
calls fail loudly. L1 injects implementations with `configureRecords()` and
`configureSession()`.

Dependency Cruiser prevents engine production code from importing services, sets,
flow, analysis or the journey-facing shared kit.
