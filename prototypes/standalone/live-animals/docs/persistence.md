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
- `load` is polymorphic: `load({ journeyId })` fetches by id,
  `load({ userId })` fetches the user's active journey through the
  `byUser` index.
- `clear()` exists for test hygiene only.

## Record shape and lifecycle

A record is:

```js
{
  ;(journeyId, userId, status, submittedAt, answers)
}
```

- `answers` is the only repeatedly-writable field.
- `status` moves one way: `in-progress` → `submitted`. `finalise` flips
  the status and stamps `submittedAt` once. After that, every mutating
  call throws — the freeze.
- A second index, `byUser`, maps a `userId` to that user's active
  `journeyId`. It is last-writer-wins: creating a new journey for the
  same user repoints the index.

## How `journey.js` composes the ports

`engine/journey.js` is the journey-isolation seam — the one place a
request is tied to a journey document.

- `currentJourney` loads the journey named by the session cookie, or
  mints a fresh one if the cookie is missing or stale (load-or-create
  per request).
- `startJourney` always mints a fresh journey, stamps the user, and pins
  it as active. Every Start-now begins a new journey.
- `resumeByUser` recovers the journey by identity alone:
  `records.load({ userId })`, no cookie needed. It then re-pins the
  cookie so the session carries on normally.

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

## Self-heal on resume

The record stores answers and lifecycle metadata only — no derived
fields. Every load (`get` or `resume` in `engine/read.js`) rebuilds
scope fresh from the answers via `reconcile`. A days-later resume
therefore self-heals: a stored obligation that has since left scope is
simply not in scope on load, with nothing stale to reconcile away.

This is the headline strength of storing nothing derived, and it is now
a test: `engine/resume-self-heal.test.js` saves answers containing
out-of-scope drivers data and asserts the resumed scope excludes it.

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
| Cookie carries `journeyId`     | Opaque session id; Redis `GET`/`SET`/`DEL session:{sid}` maps it to the journey |
| `session.userId` stub constant | Validated Defra ID OIDC `sub`                                                   |

## Stub caveats

Two things the stubs do not answer:

- **The resume route has no auth.** `GET {BASE}/resume`
  (`features/resume/controller.js`) serves the single global stub user's
  record to anyone. The shape (load-by-user, then reconcile) is the
  thing to copy; the missing identity integration is the one thing not
  to.
- **Multi-draft-per-user is undecided.** The `byUser` index holds one
  active journey per user, last-writer-wins. Whether a user can hold
  several drafts is an open product question, not a decision this spike
  has made.
