# Persistence ports

The spike persists state through two narrow ports under
`engine/persistence/`. Both are honest stubs: the in-memory
implementations are throwaway, but the port shapes are the deliverable.
A real service swaps the internals and keeps the surfaces.

## The two ports

**SESSION** (`engine/persistence/session.js`) answers two questions:
who is the user, and which journey is active in this session.

- `userId(request)` returns a single constant stub user
  (`stub-user-0001`). An `x-stub-user` request header overrides it, so a
  test can play a second user cheaply.
- The active-journey pointer is a cookie (`liveAnimalsJourneyId`) that
  carries the `journeyId` directly. This deliberately collapses the
  production indirection of an opaque session id mapped to a journey in
  a session store — the cookie IS the pointer.
- `setActiveJourney` / `clearActive` pin and drop the pointer;
  `activeJourneyId` reads it.
- A second cookie (`liveAnimalsKnownJourneys`, base64json) carries the
  session's **known-journeys list** — every reference this session has
  created or amended. `knownJourneyIds` reads it; `addKnownJourney`
  appends (deduplicated). The dashboard lists and acts on ONLY these
  references, in both modes — there is no unscoped backend browse (the
  earlier resume-by-user global read was removed as a cross-user leak).
- A third cookie (`liveAnimalsOpeningRun`, base64json) carries the
  **opening-run record** `{ journeyId, phase }` — presentation state for
  the pre-hub linear run, never notification data. `openingRun` reads it;
  `setOpeningRun` replaces it. The flow layer owns its meaning (see
  [flow-and-gates.md](flow-and-gates.md), "The opening run").

**RECORDS** (`engine/persistence/records.js`) is the durable store: one
application document per `journeyId`, held in an in-memory `Map`.

- Records are deep-copied across the boundary both ways
  (`structuredClone`), so a caller can never mutate stored state by
  reference.
- Writes go through `saveAnswers(journeyId, answers)`, which replaces
  the whole answers map. There is no way to write a single key.
- `loadWritable` is the single gate in front of every mutating
  operation. An unknown id throws. A submitted record throws. No writer
  can skip either check. (Read-side `load` returns `undefined` for an
  unknown id instead of throwing.)
- `load` is polymorphic: `load({ journeyId })` fetches by id.
  `load({ userId })` is a stub/demo-only resume-by-identity — it fetches
  the user's active journey through the `byUser` index. In REAL mode
  there is no resume-by-user: `load({ userId })` returns `undefined` and
  issues no list read (see [Resume by user is stub-only](#resume-by-user-is-stub-only)).
- `list({ journeyIds })` loads exactly the handed references (skipping
  ones the store no longer knows) — the dashboard's session-scoped read.
  It never lists the wider store.
- `amend(journeyId)` is the **sanctioned unfreeze** (c-029
  amend-and-resubmit): a submitted record transitions back to
  `in-progress` (`submittedAt` cleared) so writes pass `loadWritable`
  again; a resubmission goes back through `finalise`. Amending a record
  that is not submitted throws — the transition is never a freeze
  bypass. The REAL adapter POSTs the backend's
  `/notifications/{ref}/amend`; the backend's `AMEND` status marshals to
  `in-progress`.
- `clear()` exists for test hygiene only.

## Record shape and lifecycle

A record is:

```js
{
  ;(journeyId, userId, status, createdAt, submittedAt, answers)
}
```

- `answers` is the only repeatedly-writable field.
- `status` cycles `in-progress` → `submitted` → (`amend`) →
  `in-progress` → … `finalise` flips the status and stamps
  `submittedAt`; while submitted, every mutating call throws — the
  freeze. `amend` is the one sanctioned way back to writable, and a
  later `finalise` re-freezes.
- A second index, `byUser`, maps a `userId` to that user's active
  `journeyId`. It is last-writer-wins: creating a new journey for the
  same user repoints the index.

## How `journey.js` composes the ports

`engine/journey.js` is the journey-isolation seam — the one place a
request is tied to a journey document.

- `currentJourney` loads the journey named by the session cookie, or
  mints a fresh one if the cookie is missing or stale (load-or-create
  per request).
- `startJourney` always mints a fresh journey, stamps the user, pins it
  as active AND appends it to the session's known-journeys list. Every
  Start-now begins a new journey; earlier journeys stay listed on the
  dashboard.
- `listKnownJourneys` reads the session's known references and loads
  them through `records.list` — the dashboard's data source.
- `selectJourney` repoints the active journey at a session-known
  reference (dashboard Resume/View). An unknown reference is refused —
  the session-known check is the authorisation seam.
- `amendJourney` is select-plus-unfreeze: for a session-known submitted
  journey it calls `records.amend` then makes the journey active again
  (dashboard Amend). Already-editable journeys just re-enter — a
  repeated POST is not an error.

The cookie is path-scoped to `BASE` (see `config.js`), so this spike can
never read another spike's cookie, and parallel browser contexts each
carry their own journey.

## Write-through and submit-is-finalise

Durable answers land on every write. `commit` and every collection
mutation (`appendEntryAt`, `updateEntryAt`, `removeEntryAt` in
`engine/write.js`) end with `records.saveAnswers`.

Because the durable record is always current, submit is a pure status
flip. `submitJourney` re-checks readiness server-side, then calls
`records.finalise` — which writes no answers (they are byte-equal to the
last commit), stamps `submittedAt`, and freezes the record. A not-ready
submit is a no-op that leaves the journey in progress.

Pinned by `engine/write-through-per-commit.test.js` and
`engine/submit-is-finalise.test.js`.

## Mapper A round-trip losses (the lossy-A caveat)

The store is line-per-species (inc-062): a commodity line is one commodity
plus ONE species with its own counts and nested identifier records. Mapper A
(`services/persistence/records/notification-mapper.js`) consolidates that
grain UP to the skeleton-exact notification — lines grouped by commodity,
one complement per group, per-species counts kept on the species entries and
SUMMED into the complement totals. `skeleton-equivalence.test.js` pins the
forward direction: same user intent, identical backend document.

The REVERSE direction (real-mode marshal, backend → answers) rebuilds one
line per species entry, but the skeleton notification shape cannot carry
everything, so a Mapper A round-trip **loses**:

- **Commodity identity of every group after the first.** The notification
  has a single top-level `commodity.name` and no per-complement code, so
  lines rebuilt from the second commodity onwards come back with no
  `commoditySelection`. This is the unrecoverable per-species/per-commodity
  split of the consolidated shape.
- **Identifier records beyond one per species, and every identifier field
  except earTag/passport.** A species entry carries one earTag/passport
  pair; tattoo, horse name, the free-text fallbacks and the per-animal
  permanent address have no home.
- **`typeSelection`** — out of the journey per c-037, no longer emitted.

Mapper B (`LIVE_ANIMALS_MAPPER=b`) exists precisely to demonstrate the
lossless alternative: per-group `commodityCode` + `name` and full
per-species `animalIdentifiers` arrays, with the reverse falling back to
Mapper A recovery when a backend strips the extras. Pinned in
`notification-mapper.test.js`.

## Self-heal on re-entry

The record stores answers and lifecycle metadata only — no derived
fields. Every load (`get` in `engine/read.js`) rebuilds scope fresh
from the answers via `reconcile`. A days-later re-entry (dashboard
Resume) therefore self-heals: a stored obligation that has since left
scope is simply not in scope on load, with nothing stale to reconcile
away.

This is the headline strength of storing nothing derived, and it is now
a test: `engine/resume-self-heal.test.js` saves answers containing an
out-of-scope `regionOfOriginCode` (its requirement answer is `no`) and
asserts the resumed scope excludes it.

## No per-key delete, anywhere

Neither port offers a delete-a-key surface. RECORDS accepts only the
whole answers map. This is deliberate: scope-exit wipe stays derived by
`reconcile` and applied by `destroyWiped` — the ports cannot hand-roll a
wipe. See [scope-and-wipe.md](scope-and-wipe.md) for the full wipe
model.

## Intended production mapping

The port methods carry "prod seam" notes. Treat these as a reasoned
hypothesis about the production shape, not a verified integration:

| Stub                           | Intended production equivalent                                                  |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `records.create`               | `POST /applications` (Mongo via the backend API)                                |
| `records.load`                 | `GET /applications/{id}` or `GET /applications?userId=`                         |
| `records.saveAnswers`          | `PATCH /applications/{id}/answers`                                              |
| `records.finalise`             | `POST /applications/{id}/submit`                                                |
| `records.amend`                | `POST /notifications/{ref}/amend` (already live in the REAL adapter)            |
| Cookie carries `journeyId`     | Opaque session id; Redis `GET`/`SET`/`DEL session:{sid}` maps it to the journey |
| `session.userId` stub constant | Validated Defra ID OIDC `sub`                                                   |

## Stub caveats

Two things the stubs do not answer:

- **Session-known is not identity.** The dashboard's authorisation seam
  is the session's known-journeys list, not a per-user owner check on
  the record. A reference leaks into another session only if the cookie
  does; the backend still has no owner field. Real identity integration
  stays the one thing not to copy from the stubs.
- **Multi-draft-per-user is session-scoped, not account-scoped.** The
  known-journeys list gives one SESSION several drafts, but a user on a
  new device starts with an empty dashboard — cross-device recovery
  needs the backend owner field below.

## Resume by user is stub-only

Resume-by-identity (`load({ userId })` → the `byUser` index) is a stub
demo affordance. The real production FE has no resume-by-user path — it
resumes only by `referenceNumber` (a session-held one for an in-flight
draft, or one the user picks from a list). The REAL adapter mirrors
this: `load({ userId })` returns `undefined` and does no list read. The
old `/resume` route (recover-by-identity) was retired with the
dashboard notifications list — the dashboard's session-known rows are
now the only re-entry path, in both modes.

This is also a safety fix. An earlier REAL adapter answered
`load({ userId })` with a global-newest read
(`GET /notifications?sort=updated,desc`, returning `list[0]`), which
had no per-user filter — a resuming user would get whoever's
notification was updated last, a cross-user leak.

**Backend follow-up.** Closing per-user scoping properly (rather than
removing the path) would need a backend owner field on the notification
— set on `POST`, e.g. via a `User-Id` header — plus a by-user list
filter on the read. That is out of scope for this spike.
