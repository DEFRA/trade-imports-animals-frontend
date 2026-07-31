# Scope and wipe

Scope is derived from the configured manifest on every read and write. It is not a
stored flag.

## Evaluator scope

Each obligation either has direct status or an `applyTo` rule. The pure evaluator
in [`src/server/app/model/obligations/evaluator.js`](../model/obligations/evaluator.js)
runs those decisions, applies ancestor-group scope and removes out-of-scope
fulfilment. Purge repeats until the storage view stops changing.

This gives a stable Yes–No–Yes rule: when a controlling answer makes a value leave
scope, the value is deleted. Returning to the earlier branch does not restore stale
data.

## Controller-facing scope

[`src/server/app/bridge/scope.js`](../bridge/scope.js) projects evaluator
implications into path keys used by controllers. The returned object contains:

- `inScope`, a `Set` of scalar, group-node and positional leaf paths
- `has(path)`, an in-scope test
- `answered(name)`, an answer-presence test across instances
- `readyForCheckYourAnswers`, calculated through the configured task-row seam

Journey flow-only keys are added from `configureJourneyFlow()` because they are not
manifest obligations.

## Durable purge authority

[`src/server/app/bridge/purge.js`](../bridge/purge.js) exposes the evaluator's
post-purge canonical fulfilment as the write-path authority. The engine persists
that full snapshot.

`wipeSet()` projects removed canonical values back to page path keys for focused
tests and consumers that need to explain the difference. It does not maintain a
second wipe algorithm.

## Consumers

Controllers use `scope.has()` to avoid rendering, validating or committing hidden
fields. Flow gates use scope to decide reachability. Bridge status uses scope and
evaluation to classify task and section completeness.
