# Persistence

A journey persists through two narrow ports: **SESSION** and **RECORDS**.
Each port is a thin shim under `engine/persistence/`, and each has two
interchangeable implementations under `services/persistence/` — a `stub`
and a `real` one. `services/mode.js` picks between them:
`LIVE_ANIMALS_MODE=real` selects the real implementations, anything else
selects the stubs (`isRealMode()`).

The shim carries the shared constants and the vocabulary the rest of the
engine imports; it holds no logic of its own and throws until wired. The
plugin picks an implementation once at boot and injects it
(`configureRecords`, `configureSession` in `routes.js`). Callers depend
only on the port surface, so the same journey code drives an in-memory
map in the stub and the trade-imports backend in real mode.

## The two ports

### SESSION (`engine/persistence/session.js`)

The SESSION port answers three questions for a request: who is the user,
which journey is active, and which journeys this session knows about. It
also carries the presentation state for the pre-hub linear run (the
"opening run" — see [flow-and-gates.md](flow-and-gates.md)).

Its surface: `userId`, `activeJourneyId` / `setActiveJourney` /
`clearActive`, `knownJourneyIds` / `addKnownJourney`, and `openingRun` /
`setOpeningRun`.

**Stub** (`services/persistence/session/stub.js`) keeps everything in
cookies:

- `userId` returns the constant `stub-user-0001`. An `x-stub-user`
  request header overrides it, so a test can play a second user cheaply.
- The active-journey pointer is a cookie (`liveAnimalsJourneyId`) that
  carries the `journeyId` directly.
- A second cookie (`liveAnimalsKnownJourneys`, base64json) carries the
  session's known-journeys list — every reference this session has
  created, resumed or amended. The dashboard lists and acts on only
  these references.
- A third cookie (`liveAnimalsOpeningRun`, base64json) carries the
  opening-run record `{ journeyId, phase }` — presentation state only,
  never notification data.

**Real** (`services/persistence/session/real.js`) keeps the same three
values in the server-side session (`request.yar`, backed by Redis), and
reads the user from the Defra ID OIDC credentials
(`request.auth.credentials.sub`), falling back to the stub user when
auth is off.

The cookies are path-scoped to `BASE` (see `config.js`), so this
prototype can never read another prototype's cookie, and parallel
browser contexts each carry their own journey. `registerJourneyCookie`
in `engine/journey.js` declares all three cookies (httpOnly, SameSite
Lax).

### RECORDS (`engine/persistence/records.js`)

The RECORDS port is the durable store: one application document per
`journeyId`. Its surface: `create`, `load`, `list`, `has`,
`saveAnswers`, `finalise`, `amend`, `clear`.

A record is:

```js
{
  ;(journeyId, userId, status, createdAt, submittedAt, answers)
}
```

- `answers` is the only repeatedly-writable field — the obligation-id
  keyed answers map the engine reads and writes.
- `status` is `in-progress` or `submitted`. `finalise` flips it to
  `submitted` and stamps `submittedAt`; while submitted, every mutating
  call throws — the freeze. `amend` is the one sanctioned way back to
  `in-progress`, and a later `finalise` re-freezes.
- `journeyId` doubles as the user-facing **reference number**
  (`GBN-AG-YY-XXXXXX`, Crockford base32 body).

**Stub** (`services/persistence/records/stub.js`) holds records in an
in-memory `Map`, plus a `byUser` index mapping a user to their active
journey.

- Records are deep-copied across the boundary both ways
  (`structuredClone`), so a caller can never mutate stored state by
  reference.
- `saveAnswers(journeyId, answers)` replaces the whole answers map.
  There is no way to write a single key.
- `loadWritable` guards every mutating operation: an unknown id throws,
  a submitted record throws. No writer can skip either check.
- `load({ journeyId })` fetches by id and returns `undefined` for an
  unknown id. `load({ userId })` is a resume-by-identity affordance
  (via the `byUser` index) that only the stub offers.
- `list({ journeyIds })` loads exactly the handed references, skipping
  any the store no longer knows. It never lists the wider store.
- `amend(journeyId)` requires a submitted record, clears `submittedAt`
  and returns it to `in-progress`. Amending a record that is not
  submitted throws — the transition is never a freeze bypass.
- `mintReferenceNumber` generates the id; `clear()` exists for test
  hygiene.

**Real** (`services/persistence/records/real.js`) is a REST client for
the trade-imports backend, rooted at
`TRADE_IMPORTS_ANIMALS_BACKEND_URL` (`.../notifications`). It forwards
the CDP trace id on every call.

| Port method   | Backend call                              |
| ------------- | ----------------------------------------- |
| `create`      | `POST /notifications` (empty body)        |
| `load`        | `GET /notifications/{ref}`                |
| `list`        | `GET /notifications/{ref}` per handed ref |
| `has`         | `GET /notifications/{ref}`                |
| `saveAnswers` | `POST /notifications` (mapped body)       |
| `finalise`    | `POST /notifications/{ref}/submit`        |
| `amend`       | `POST /notifications/{ref}/amend`         |

- `marshal` turns a backend notification into a record. It reads the
  reference number, maps the backend status (`SUBMITTED` → `submitted`,
  anything else → `in-progress`), and runs the notification through the
  answers mapper. It **strips backend nulls before mapping**
  (`stripNulls`), so a backend field echoed back as `null` cannot leak
  in as a stored answer.
- `saveAnswers` upserts by reference number: it confirms the record is
  not submitted (from the passed `known` record if the caller has it,
  otherwise a `GET`), maps the answers to a notification via
  `toNotification`, and `POST`s the whole document.
- `load({ userId })` returns `undefined` and issues no read — the real
  adapter has no resume-by-user path.

## The notification mapper

`services/persistence/records/mapper.js` bridges the engine's
obligation-id keyed `answers` and the backend `notification` (the Live
Animals Data Fields V4 shape). It exposes `toNotification(answers)` and
`toAnswers(notification)` and selects one of two mapper pairs in
`notification-mapper.js` by `LIVE_ANIMALS_MAPPER` (default `a`), read at
call time so a test can switch it.

- **Mapper A** (`answersToNotification` / `notificationToAnswers`)
  reproduces exactly what the production skeleton frontend persists —
  the same backend field homes and transforms. It is total over the
  storable obligations and carries nothing the skeleton does not
  persist.
- **Mapper B** (`answersToTargetNotification` /
  `targetNotificationToAnswers`) is Mapper A plus the extra fields — a
  lossless round-trip over every captured obligation, including the
  per-species commodity lines and the full identifier records.

The store is line-per-species: a commodity line is one commodity code
plus one species with its own counts and nested identifier records. The
backend commodity blob is one complement per commodity with a species
array, per-species counts and complement-level totals. Both mappers
group lines by commodity and consolidate counts up to the complement
total (`groupLinesByCommodity`).

### Mapper A is lossy in reverse

The skeleton notification shape cannot carry everything the store holds,
so `notificationToAnswers` loses:

- **Commodity identity of every group after the first.** The
  notification has a single top-level `commodity.name` and no
  per-complement code, so lines rebuilt from the second commodity
  onwards come back with no `commoditySelection`.
- **Identifier records beyond one per species, and every identifier
  field except earTag and passport.** Tattoo, horse name, the free-text
  fallbacks and the per-animal permanent address have no home in the
  skeleton shape.

Mapper B carries per-group `commodityCode` and full per-species
`animalIdentifiers` arrays precisely to round-trip losslessly, falling
back to Mapper A recovery when a backend strips the extras. The forward
direction is pinned in `skeleton-equivalence.test.js`; both directions
in `notification-mapper.test.js`.

## journeyId lifecycle

`engine/journey.js` is the journey-isolation seam — the one place a
request is tied to a journey document. It memoises the loaded journey on
`request.app` so a request loads at most once.

- `startJourney` mints a fresh journey (`records.create`, stamped with
  the user), pins it active, and appends it to the session's
  known-journeys list. Every Start-now begins a new journey; earlier
  journeys stay listed on the dashboard.
- `currentJourney` returns the memoised journey, else loads the one
  named by the active pointer, else mints a fresh one (load-or-create
  per request).
- `listKnownJourneys` loads the session's known references through
  `records.list` — the dashboard's data source.
- `selectJourney` repoints the active journey at a session-known
  reference (dashboard Resume / View). An unknown reference is refused —
  the session-known check is the authorisation seam.
- `amendJourney` is select-plus-unfreeze: for a session-known submitted
  journey it calls `records.amend`, then makes it active again. An
  already-editable journey just re-enters, so a repeated POST is not an
  error.

## Write-through and submit-is-finalise

Durable answers land on every write. `commit` and every collection
mutation (`appendEntryAt`, `updateEntryAt`, `removeEntryAt`,
`reconcileEntriesAt` in `engine/write.js`) end with
`saveJourneyAnswers` → `records.saveAnswers`. Every write first purges
out-of-scope answers: `destroyWiped(answers, wipeSetFromB(answers))`, so
the store never holds a value the model has ruled out of scope (see
[scope-and-wipe.md](scope-and-wipe.md)).

Because the durable record is always current, submit is a pure status
flip. `submitJourney` re-checks readiness server-side
(`scope.readyForCheckYourAnswers`), then calls `records.finalise` —
which writes no answers, stamps `submittedAt`, and freezes the record. A
not-ready submit is a no-op that leaves the journey in progress. Pinned
by `engine/write-through-per-commit.test.js` and
`engine/submit-is-finalise.test.js`.

## Self-heal on re-entry

The record stores answers and lifecycle metadata only — no derived
fields. Every load rebuilds scope fresh from the answers: `get` in
`engine/read.js` returns `makeScope(journey.answers)`
(`makeScopeFromB`). A days-later re-entry therefore self-heals — a
stored obligation that has since left scope is simply absent from the
rebuilt scope, with nothing stale to reconcile away. Pinned by
`engine/resume-self-heal.test.js`.

## No per-key delete

Neither port offers a delete-a-key surface. RECORDS accepts only the
whole answers map. Scope-exit wipe stays derived by the model
(`wipeSetFromB`) and applied by `destroyWiped` — the ports cannot
hand-roll a wipe.

## Identity and multi-draft scope

The dashboard's authorisation seam is the session's known-journeys list,
not a per-user owner check on the record. A reference reaches another
session only if the session state carrying it does. The known-journeys
list gives one session several drafts, so multi-draft is session-scoped:
a user on a new device starts with an empty dashboard.

Resume is by reference, not by identity. The main flow only ever loads
`load({ journeyId })`; the stub's `load({ userId })` resume-by-identity
is a stub-only demo affordance that the real adapter does not implement.

## Boot wiring

`routes.js` `register` wires persistence in order: `configureRecords`
and `configureSession` inject the mode-selected implementations,
`registerJourneyCookie` declares the SESSION cookies, and in real mode
`countries.prime()` / `ports.prime()` warm the reference-data caches
before routes are mounted.
