# Persistence

A journey persists through two narrow ports: **SESSION** and **RECORDS**.
Each port is a thin shim under `engine/persistence/`, and each has two
interchangeable implementations under `services/persistence/` — a `stub`
and a `real` one. `services/mode.js` picks between them: real is the default,
and `LIVE_ANIMALS_MODE=stub` selects the stubs (`isRealMode()`).

The shim carries the shared constants and the vocabulary the rest of the
engine imports; it holds no logic of its own and throws until wired. The
plugin picks an implementation once at boot and injects it
(`configureRecords`, `configureSession` in `routes.js`). Callers depend
only on the port surface, so the same journey code drives an in-memory
map in the stub and the trade-imports backend in real mode.

## The two ports

### SESSION (`engine/persistence/session.js`)

The SESSION port records which journeys this session knows about. The journey
being handled comes from the URL, not session state. The port also carries
presentation state for the pre-hub linear run (the
"opening run" — see [flow-and-gates.md](flow-and-gates.md)) and the
journey-keyed flow-only answers (`importType`, `declaration`) that do not
belong to the notification.

Its surface: `knownJourneyIds` / `addKnownJourney`, `openingRun` /
`setOpeningRun`, and `flowOnlyAnswers` / `setFlowOnlyAnswers`.

**Stub** (`services/persistence/session/stub.js`) keeps everything in
cookies:

- `liveAnimalsKnownJourneys` (base64json) carries the
  session's known-journeys list — every reference this session has
  created, resumed or amended. The dashboard lists and acts on only
  these references.
- `liveAnimalsOpeningRun` (base64json) maps each `journeyId` to its
  opening-run phase — presentation state only, never notification data.
- `liveAnimalsFlowOnlyAnswers` (base64json) maps each
  `journeyId` to its flow-only values, so switching journeys in one
  session cannot leak the filter or declaration selection.

**Real** (`services/persistence/session/real.js`) keeps the same three
state values in the server-side session (`request.yar`, backed by Redis).

The cookies are path-scoped to `/` because the service is mounted at the root
(see `config.js`), and parallel browser contexts each carry their own journey.
`registerJourneyCookie` in `engine/journey.js` declares the journey cookies
(httpOnly, SameSite Lax).

### RECORDS (`engine/persistence/records.js`)

The RECORDS port is the durable store: one application document per
`journeyId`. Its surface: `create`, `load`, `list`, `has`,
`replaceFulfilment`, `finalise`, `amend`, `cancelAmend`, `copy`,
`softDelete`, `clear`.

A record is:

```js
{
  journeyId: 'GBN-AG-26-ABC123',
  status: 'draft',
  createdAt: '2026-07-23T12:00:00.000Z',
  submittedAt: null,
  fulfilment: {}
}
```

- `fulfilment` is the only repeatedly-writable field — the decoded,
  UUID-keyed evaluator map. `answers`, `evaluation` and `scope` are
  request-local projections, never port DTO fields.
- `status` is `draft`, `submitted`, `amend` or `deleted`. `finalise`
  transitions a draft or amend record to `submitted` and stamps
  `submittedAt`; while submitted, every mutating call throws — the
  freeze. `amend` is the one sanctioned transition to `amend`, and a
  later `finalise` re-freezes. Deleted is terminal.
- `journeyId` doubles as the user-facing **reference number**
  (`GBN-AG-YY-XXXXXX`, Crockford base32 body).

**Stub** (`services/persistence/records/stub/index.js`) holds records in an
in-memory `Map`.

- At rest it uses `{ id, fulfilment: entry[] }` (plus lifecycle metadata).
  `services/persistence/records/fulfilment-codec/index.js` encodes on
  replacement and decodes on load.
- A scalar entry is `{ obligationId, value }`; a grouped entry is
  `{ obligationId, records: [{ fulfilmentId, value }] }`. Empty grouped
  instances have no leaf record from which to infer identity, so they are not
  persisted.
- Composite fulfilment ids such as `line0` and `line0/unit1` identify positions
  within one whole snapshot. Removing or reordering entries can change them;
  they are not stable longitudinal record ids and must not be patched
  individually.
- Records are deep-copied across the boundary both ways
  (`structuredClone`), so a caller can never mutate stored state by
  reference.
- `replaceFulfilment(journeyId, fulfilment)` replaces the whole canonical
  snapshot. There is no way to write a single UUID.
- `loadWritable` guards every mutating operation: an unknown id throws,
  a submitted record throws. No writer can skip either check.
- `load({ journeyId })` fetches by id and returns `undefined` for an
  unknown id.
- `list({ journeyIds })` loads exactly the handed references, skipping
  any the store no longer knows. It never lists the wider store.
- `amend(journeyId)` requires a submitted record, clears `submittedAt`
  and transitions it to `amend`. Amending a record that is not
  submitted throws — the transition is never a freeze bypass.
- `mintReferenceNumber` generates the id; `clear()` exists for test
  hygiene.

**Real** (`services/persistence/records/real/index.js`) is a REST client for
the trade-imports backend, rooted at
`TRADE_IMPORTS_ANIMALS_BACKEND_URL`. It forwards the CDP trace id on
every call.

| Port method         | Backend call                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `create`            | `POST /fulfilments`                                                |
| `load`              | `GET /fulfilments/{ref}`                                           |
| `list`              | `GET /fulfilments?page={page}&sort={sort}`                         |
| `has`               | `GET /fulfilments/{ref}`                                           |
| `replaceFulfilment` | `PUT /fulfilments/{ref}`, then both notification projection `PUT`s |
| `finalise`          | `POST /fulfilments/{ref}/submit`                                   |
| `amend`             | `POST /fulfilments/{ref}/amend`                                    |
| `cancelAmend`       | `POST /fulfilments/{ref}/cancel-amend`                             |
| `copy`              | `POST /fulfilments/{ref}/copy`                                     |
| `softDelete`        | `POST /fulfilments/{ref}/soft-delete`                              |

- `/fulfilments` is the source of truth. `marshal` maps lifecycle metadata and
  decodes `document.fulfilment` directly; resume never passes through a
  notification or a name-keyed answers store.
- `replaceFulfilment` freezes one canonical evaluator snapshot, encodes
  `{ id, fulfilment: entry[] }`, and writes it first with idempotent `PUT`.
  It then writes the current notification to `/notifications/{ref}` and the
  full-fat notification to `/proposed-notifications/{ref}`. Each projection is
  derived from that same snapshot and retried once; neither is a resume source.
- If a projection write still fails after retry, the adapter reports that the
  canonical save succeeded and identifies the failed projection. A later repair
  can safely regenerate it from canonical fulfilment.

## The notification projections

`services/persistence/records/mapper.js` exposes two forward projections from
canonical fulfilment. There is no runtime mapper selector and no reverse mapper:

- **Mapper A** (`fulfilmentToNotification`) reproduces exactly what the
  production skeleton frontend persists and is written to `/notifications`.
- **Mapper B** (`answersToTargetNotification`, a legacy name for a canonical
  input) is Mapper A plus the additional durable fields and is written to
  `/proposed-notifications`.

The store is line-per-species: a commodity line is one commodity code
plus one species with its own counts and nested identifier records. The
backend commodity blob is one complement per commodity with a species
array, per-species counts and complement-level totals. Both mappers
group lines by commodity and consolidate counts up to the complement
total (`groupLinesByCommodity`).

Mapper A is intentionally narrower: its notification shape cannot carry the
identity of every commodity group or every animal identifier. Mapper B adds
per-group `commodityCode`, full per-species `animalIdentifiers`, typed
documents, and the other projection fields. This loss never affects resume
because both shapes are downstream views; the forward directions are pinned by
`skeleton-equivalence.test.js` and
`notification-mapper/notification-mapper.test.js`.

## journeyId lifecycle

`engine/journey.js` is the journey-isolation seam — the one place a
request is tied to a journey document. It memoises the loaded journey on
`request.app` so a request loads at most once.

- `startJourney` mints a fresh journey (`records.create`) and appends it to
  the session's known-journeys list. Every
  create POST begins a new journey; earlier journeys stay listed on the
  dashboard.
- `currentJourney` returns the memoised journey, else loads the one named by
  `request.params.journeyId`. Missing, unknown and stale references are
  answered with 404; a successfully loaded reference is added to the
  session-known list. Reads never create a journey.
- `listKnownJourneys` passes the session's known references to `records.list`,
  which is the dashboard's data source. The adapters use that list differently,
  as described below.
- `amendJourney` checks the session-known reference and unfreezes a
  submitted journey with `records.amend`. An already-editable journey
  just re-enters, so a repeated POST is not an error.

## Real and stub listing semantics

`listKnownJourneys` always reads the session's known IDs and passes them to
`records.list`. The two record adapters use that input differently.

**Stub mode** uses the IDs as the dashboard boundary. It looks up only those
records in the in-memory map, drops unknown and deleted records, then applies
the reference filter, sort and paging. A new browser session therefore starts
with an empty stub dashboard, even if the process map contains records made by
another session.

**Real mode** ignores `journeyIds`. It sends `page`, `sort` and the optional
`referenceNumber` to `GET /fulfilments`. The dashboard shows the rows and
paging values returned by the backend. The backend list, not the browser
session's known-ID set, is the real-mode listing boundary.

The SESSION known-ID list still has work in both modes:

- `startJourney` adds the new backend or stub reference.
- `currentJourney` loads the ID from the URL and adds it after a successful
  load when the session does not know it.
- `copyJourney` adds the new copy's reference.
- amend, cancel-amend, copy and soft-delete require the source ID to be known
  to the session before they call the records port.

The current journey always comes from `request.params.journeyId`. SESSION does
not hold a current pointer. Opening-run and flow-only state are also keyed by
that journey ID, so two journey URLs in one session do not share those values.

## Write-through and submit-is-finalise

Durable fulfilments land on every write. `commit` and every collection
mutation (`appendEntryAt`, `updateEntryAt`, `removeEntryAt`,
`reconcileEntriesAt` in `engine/write/index.js`) rebuild the canonical map through
the feature-owned binding registry, evaluate/purge it, and call
`replaceJourneyFulfilment` → `records.replaceFulfilment` with
`evaluation.fulfilments`. The store never holds a name-keyed answers tree (see
[scope-and-wipe.md](scope-and-wipe.md)).

`commit` splits out every key in `FLOW_ONLY_OBLIGATIONS` before that canonical
write. Those values go only to the journey-keyed SESSION map. A read merges the
current journey's session values into the projected `answers`; they never
enter fulfilment, its codec, or the notification mapper.

Because the durable record is always current, submit is a pure status
flip. `submitJourney` re-checks readiness server-side
(`scope.readyForCheckYourAnswers`), then calls `records.finalise` —
which writes no fulfilment, stamps `submittedAt`, and freezes the record. A
not-ready submit is a no-op that leaves the journey in progress. Pinned
by `engine/write-through-per-commit.test.js` and
`engine/submit-is-finalise.test.js`.

## Self-heal on re-entry

The record stores canonical fulfilment and lifecycle metadata only — no
derived fields. Every load calls `assembleRequestView`, which evaluates once
and derives `answers` and `scope`. A days-later re-entry therefore self-heals:
an obligation that has since left scope is absent from the evaluator's
post-purge request view. Pinned by
`engine/resume-self-heal.test.js`.

## No per-key delete

Neither port offers a delete-a-key surface. RECORDS accepts only a whole
canonical fulfilment snapshot. Scope-exit purge stays derived by the evaluator
and the ports cannot hand-roll a wipe.

## Boot wiring

`routes.js` `register` wires persistence in order: `configureRecords`
and `configureSession` inject the mode-selected implementations,
`registerJourneyCookie` declares the SESSION cookies, and in real mode
`countries.prime()` / `ports.prime()` warm the reference-data caches
before routes are mounted.
