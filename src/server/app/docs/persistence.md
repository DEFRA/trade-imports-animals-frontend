# Persistence

The engine depends on two abstract ports. Implementations live under services and
are injected at boot.

## Records port

[`src/server/app/engine/persistence/records.js`](../engine/persistence/records.js)
defines lifecycle constants and delegates these operations to a configured adapter:

- create, load, list and has
- replace fulfilment
- finalise, amend and cancel amend
- copy and soft delete
- clear for test support

[`src/server/app/services/persistence/records/index.js`](../services/persistence/records/index.js)
selects the stub or real implementation. Both expose the same operation names.

Canonical fulfilment is the durable answer source. Writes replace a whole evaluated
and purged snapshot. Reads rebuild projected answers, scope and status, so derived
state is not stored.

## Session port

[`src/server/app/engine/persistence/session.js`](../engine/persistence/session.js)
delegates known journey ids, opening-run state and flow-only answers. It also holds
the configured cookie names used by `registerJourneyCookie()`.

The live-animals journey supplies these names in its
[`config.js`](../sets/live-animals/journeys/linear/config.js):

```js
{
  knownJourneys: 'liveAnimalsKnownJourneys',
  openingRun: 'liveAnimalsOpeningRun',
  flowOnlyAnswers: 'liveAnimalsFlowOnlyAnswers'
}
```

Session state is keyed by journey id. It does not replace the canonical record.

## Lifecycle and request memoisation

[`src/server/app/engine/journey.js`](../engine/journey.js) connects a request to one
journey record. It memoises loads on `request.app`, tracks known journey ids and
implements create, amend, cancel-amend, copy and soft-delete orchestration.

[`src/server/app/engine/read.js`](../engine/read.js) separately memoises the assembled
request view so controllers in one request do not repeat evaluation or IO.

## Notification projections

The real records adapter writes canonical fulfilment first, then derives backend
notification projections through
[`src/server/app/services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/).
The projections are downstream views, not resume sources.

## Boot wiring

[`src/server/app/routes.js`](../routes.js) passes the mode-selected records and
session adapters to `configureRecords()` and `configureSession()`, then registers the
configured journey cookie names before adding routes.
