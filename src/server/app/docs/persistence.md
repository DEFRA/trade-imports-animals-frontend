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
delegates known journey ids, opening-run state, flow-only answers and the
reviewed token — the concurrency token this browser last rendered an editable
review at, which the declaration requires before it will show or submit. It also
holds the configured cookie names used by `registerJourneyCookie()`.

The live-animals journey supplies these names in its
[`config.js`](../sets/live-animals/journeys/linear/config.js):

```js
{
  knownJourneys: 'liveAnimalsKnownJourneys',
  openingRun: 'liveAnimalsOpeningRun',
  flowOnlyAnswers: 'liveAnimalsFlowOnlyAnswers',
  addressHandshakeTokens: 'liveAnimalsAddressHandshakeTokens',
  addedAddressBanner: 'liveAnimalsAddedAddressBanner',
  reviewedConcurrencyTokens: 'liveAnimalsReviewedConcurrencyTokens'
}
```

Session-port state (known journeys, opening run, flow-only answers and reviewed
tokens) is keyed by journey id. It does not replace the canonical record.

The address handshake's two cookies bypass the session port and are set with
`h.state` in both modes. The token cookie holds a map keyed by fulfilment id.
The added-address banner cookie holds only the added address's name.

In stub mode each journey cookie is its own cookie, scoped to the set's mount,
so one set's dashboard never sees another set's drafts. In real mode the same
values are keys in the one server-wide session cookie, and each set's distinct
cookie names keep them apart.

The cookie names are read through per-set accessors rather than one module
constant, because two sets in one process need two sets of names and a shared
object would let the second registration rename the first set's cookies. The
accessors return the default names until a set is configured, and the session
port throws. `registerJourneyCookie` refuses to run before `configureSession`
(`engine/journey.js`), so a set never registers cookies under the default names.

## Lifecycle and request memoisation

[`src/server/app/engine/journey.js`](../engine/journey.js) connects a request to one
journey record. It memoises loads on `request.app`, tracks known journey ids and
implements create, amend, cancel-amend, copy and soft-delete orchestration.

Viewing and amending a notification load it from the records port and add it to
the session's known journey ids, so a notification submitted in an earlier browser
session can be amended from the dashboard. Copying checks that the notification
exists (`records.has`), then registers the new copy's id, not the original's.
Cancel-amend and soft-delete act only on known journey ids.

A save replaces the memo with the result it returns, so the next save in the
same request sends the concurrency token the backend returned.

[`src/server/app/engine/read.js`](../engine/read.js) separately memoises the assembled
request view so controllers in one request do not repeat evaluation or IO.

## Notification projections

The real records adapter writes canonical fulfilment first, then derives backend
notification projections through
[`src/server/app/services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/).
The projections are downstream views, not resume sources.

A commodity line is one CN code with one species and its own counts and nested
identifier records. The backend commodity is one complement per CN code, holding
a species array. The mapper groups the lines by CN code and sums the counts up
to the complement totals as numbers, as the backend's own lodash sum does. The
per-species counts stay the raw string answers. A complement's `typeOfCommodity`
is the text of the line's stored commodity type, and is left out when that text is
blank.

The backend stores parties as they are and hands them back the same way, so the
records adapter never sends the reader's organisation to it. The organisation is
the address book's business, not the backend's.

GBN-AG's `TradeCountry` carries an ISO 3166-1 alpha-2 code, so a territory the
destination and transit selects offer must leave as its country. The identification
page stores the ISO code, so persistence carries it through without a reverse
lookup.

Each line also carries a species common name. The mapper does not send it yet;
EUDPA-669 maps it into the payload.

## Boot wiring

Each set's gateway — today
[`routes-live-animals.js`](../routes-live-animals.js), which
[`routes.js`](../routes.js) re-exports — passes the mode-selected records and
session adapters to `configureRecords()` and `configureSession()` under its own
set id, then registers the configured journey cookie names before adding routes.
