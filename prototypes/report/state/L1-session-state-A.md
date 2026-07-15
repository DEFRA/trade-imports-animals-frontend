# L1 — Session and state management — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

All paths below are relative to that root unless stated.

---

## 0. Headline

State management on side A is **entirely imperative and entirely hand-coded** — and that is
deliberate, not an omission. There is **no state model**: no config declares where a value
lives, no obligation carries a `store:` or `persist:` key, nothing in the 11-key obligation
vocabulary touches persistence. What side A *does* have is a **two-port architecture**
(SESSION + RECORDS), a **derived-not-stored discipline** that makes resume self-heal a
theorem rather than a feature, and a genuinely-working real adapter (yar/Redis + backend
`/notifications` HTTP) behind those ports.

The one thing here that is *derived from the model* rather than hand-coded is the **wipe
set**: `reconcile(answers)` returns `{ inScope, wiped }` and every scope-exit deletion in
the whole app is applied by `destroyWiped` from that derived list (`engine/write.js:15,58,75`
are the only three call sites in the codebase). No page can hand-roll a delete — there is no
per-key delete surface anywhere on either port.

Total surface: **838 LOC** across the 13 files that own state (engine/journey, read, write,
store, both port contracts, all four adapters, lib/path, flow/run-state, flow/entry-guard),
pinned by **~94 test cases** across 14 test files.

---

## 1. Where answers live in flight

Three tiers, one is the "state", two are pointers.

| Tier | What it holds | Stub mode | Real mode |
|---|---|---|---|
| **RECORDS** (the answers) | The whole `answers` map, one document per `journeyId` | in-memory `Map` (`services/persistence/records/stub.js:15`) | backend `POST/GET /notifications` over HTTP (`services/persistence/records/real.js:9,68,125`) |
| **SESSION** (the pointer) | active journeyId, known-journeys list, opening-run record | 3 Hapi cookies (`services/persistence/session/stub.js`) | 3 `request.yar` keys → Catbox-Redis (`services/persistence/session/real.js:18,22,32`) |
| **Per-request memo** | one loaded journey document | `request.app[Symbol]` (`engine/journey.js:35-43`) | same |

**There is no in-flight session copy of the answers.** Answers never sit in yar/Redis; they
go straight to the durable record on every write. yar/cookies hold only three scalars:
`liveAnimalsActiveJourney` (a journeyId), `liveAnimalsKnownJourneys` (a string[]), and
`liveAnimalsOpeningRun` (`{journeyId, phase}` — presentation state for the pre-hub linear
run, `flow/run-state.js:9-18`). That is a deliberate architectural choice and the docs argue
for it (`docs/persistence.md:110-123`).

Both ports are **unconfigured-throws** stubs at import time — `engine/persistence/records.js:4-6`
and `session.js:7-9` both start as `const unconfigured = () => { throw new Error('...not
configured — call configureX() at boot') }`, and `routes.js:23-24` injects the real impl at
boot. Selection is a global env switch: `services/mode.js` → `LIVE_ANIMALS_MODE=stub|real`,
consumed by `services/persistence/{session,records}/index.js` (5 LOC each:
`export const session = isRealMode() ? realSession : stubSession`).

---

## 2. Read path

`engine/read.js:43-44` is the entire read surface:

```js
export const get = async (request, h) =>
  readViewOf(await currentJourney(request, h))
```

`readViewOf` (read.js:37-41) returns `{ journey, answers, scope }` where **scope is recomputed
from the answers on every single read** (`makeScope` → `reconcile(answers)`, read.js:27-35).
Nothing derived is ever stored or cached across requests.

`currentJourney` (`engine/journey.js:59-71`) is load-or-create:

```js
const cached = memoRead(request)
if (cached) return structuredClone(cached)
const journeyId = await session.activeJourneyId(request)
const loaded = journeyId ? await records.load({ journeyId }) : undefined
if (loaded) { memoWrite(request, loaded); return structuredClone(loaded) }
return startJourney(request, h)
```

Two things worth naming:
- Every return is a `structuredClone` of the memo, so a caller mutating `journey.answers`
  (which `commit` does, via `destroyWiped`) can never corrupt the cache.
- A missing/stale pointer **mints a journey** — including on a GET. See §8, limitation L4.

---

## 3. Write path — write-through on every commit

`engine/write.js` (95 LOC) is the only side-effecting module. Five write verbs; every one
ends in `saveJourneyAnswers` → `records.saveAnswers`. There is **no batching, no dirty flag,
no end-of-page flush**: one page POST = one durable write.

```js
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }
}
```
(`engine/write.js:11-18`)

`saveAnswers` replaces the **whole** answers map (`records.js` port takes `(journeyId,
answers)`; the stub does `journey.answers = structuredClone(answers ?? {})` at
`records/stub.js:69`). There is no partial-write surface, by design — `docs/persistence.md:183-189`
("No per-key delete, anywhere") and the code agrees.

Pinned by `engine/write-through-per-commit.test.js` (2 cases): first commit lands durably
before any submit; second commit merges into the durable record.

**Submit is a pure status flip** — `submitJourney` (write.js:89-95) re-checks
`scope.readyForCheckYourAnswers` server-side and calls `records.finalise(journeyId)`, which
writes **no answers** (they are already byte-equal to the last commit). Real mode:
`POST /notifications/{ref}/submit` (`records/real.js:134-141`).

### Asymmetry inside the write path (a real, if latent, gap)

Of the five write verbs, only **three** run the wipe pass:

| verb | reconcile+destroyWiped? | line |
|---|---|---|
| `commit` | yes | write.js:14-15 |
| `removeEntryAt` | yes | write.js:57-58 |
| `reconcileEntriesAt` | yes | write.js:74-75 |
| `appendEntryAt` | **no** | write.js:20-28 |
| `updateEntryAt` | **no** | write.js:30-46 |

An `appendEntry`/`updateEntry` that writes an entry containing a now-out-of-scope field
persists it; nothing removes it until the next `commit`. Because scope is re-derived on read,
the UI and the hub statuses never *show* it — but the notification mappers read `answers`
directly, so a stale key could in principle reach the backend. Latent rather than live
(controllers build entries from in-scope schemas), and cheap to close — 4 lines. Not
structural.

---

## 4. One-load-per-request memoisation

`engine/journey.js:35-43` — a `Symbol`-keyed slot on Hapi's per-request `request.app`:

```js
const JOURNEY_MEMO = Symbol('liveAnimalsCurrentJourney')
```

Every `currentJourney` after the first in a request serves from the memo; every
`saveJourneyAnswers` **writes through the memo** so a post-write read sees the new answers
without a re-fetch (`journey.js:73-82`). This matters because the plugin-level
`onPreHandler` entry guard (`routes.js:26-29` → `flow/entry-guard.js:44-50`) calls
`currentJourney` on *every* guarded request before the controller does — without the memo
that is one extra backend GET per page view.

Pinned at the **network boundary**, not with module spies —
`engine/one-load-per-request.test.js` (3 cases) mocks `fetch` and asserts:
- read-then-write request → exactly **1 GET** + **1 POST** (`one-load-per-request.test.js:62-70`)
- post-write read → answers are fresh, still **1 GET** (`:72-81`)
- two requests → **2 GETs** (no cross-request leak) (`:83-88`)

The real adapter cooperates: `saveAnswers(journeyId, answers, { known })` skips its
freeze-check GET when the caller hands it the already-loaded record
(`records/real.js:106-116`). That is the optimisation — and the staleness hole in §8/L2.

---

## 5. Resume and self-heal

The record stores **answers + 6 lifecycle fields and nothing else**. `resume-self-heal.test.js:38-45`
asserts the record's key set is exactly `['answers','createdAt','journeyId','status','submittedAt','userId']`.
Because scope is re-derived on every read (§2), a days-later resume **cannot** be stale:
`resume-self-heal.test.js:18-30` saves `{countryOfOrigin:'FR', regionOfOriginCodeRequirement:'no',
regionOfOriginCode:'FR-75'}` and asserts the resumed scope excludes `regionOfOriginCode`.

This is the strongest property in the dimension and it is a **structural consequence of storing
nothing derived**, not a feature someone built. Costless to copy: it is a rule ("no derived
field is persisted"), not code.

Re-entry paths: the dashboard (`features/dashboard/controller.js`) over
`listKnownJourneys` → `records.list({ journeyIds })` (journey.js:84-85). `selectJourney` /
`amendJourney` (journey.js:90-104) both refuse a reference not in the session's known list —
`if (!(await isKnownJourney(request, journeyId))) return undefined`. **That check is the
entire authorisation seam.** Resume-by-user was deliberately removed as a cross-user leak
(`docs/persistence.md:220-240`; pinned by `records/real.no-resume-by-user.test.js`, 2 cases).

---

## 6. State SHAPE

A **nested plain-JS object**, keyed by obligation id at the root, with arrays for collections
and objects for collection entries. Not flat, not an event log, no revisions, no history. Example
(from `store-ops.test.js` fixtures / `features/commodities/obligations.js`):

```
{
  countryOfOrigin: 'FR',
  commodityLines: [
    { commoditySelection: '...', speciesSelection: '...', numberOfAnimalsQuantity: 3,
      animalIdentifiers: [ { earTag: '...' }, ... ] }
  ],
  documents: [ { accompanyingDocumentType: '...', uploadId: '...', filename: '...' } ]
}
```

Address arithmetic lives in one 63-LOC file, `lib/path.js`: `pathKey` (path → `a.b[0].c`),
`parsePath` (inverse), `valueAt`, `setAt` (persistent/copy-on-write), `deleteAt` (mutating),
`wipeOrder` + `destroyWiped`. **Two identity vocabularies** — template addresses (index-free
obligation ids) and instance path keys (bracketed) — bridged by `pathKey`/`parsePath` and by
`ownerOfObligation` in `flow/dispatch.js`; `docs/limits.md` admits they are "bridged not
unified".

**The answers map is not strictly obligation-keyed.** `features/documents/controller.js:269-274`
appends `uploadId` and `filename` into a documents entry — neither is an obligation
(`features/documents/obligations.js` declares only 4 item fields). So controllers can and do
smuggle unmodelled keys into state. Conversely, scan status is *not* stored — it is polled
live from the uploader on every render (`documents/controller.js:87-98`), keeping faith with
"nothing derived is stored" at the cost of a network call per page view.

---

## 7. Per-user scoping and identity

- `session.userId(request)` is `request?.auth?.credentials?.sub ?? STUB_USER` in real mode
  (`session/real.js:13-15`) — i.e. **a constant**, because prototype auth is a no-op.
- `records.create({ userId })` stamps the user in stub mode and indexes it (`byUser`,
  `records/stub.js:44`), which is what `journey-user-assoc.test.js` (3 cases) proves.
- **In real mode the userId is never persisted.** `records/real.js:67-83` POSTs
  `body: JSON.stringify({})` and keeps `userId` only on the FE-side marshalled object. The
  backend notification has **no owner field**. Ownership in real mode therefore rests entirely
  on the session's known-journeys list, and `docs/persistence.md:208-218` says so plainly
  ("Session-known is not identity... the backend still has no owner field").

This is an honest, documented hole, and it is a *backend* hole — not something either
prototype's model can fix.

---

## 8. Concurrency and staleness

**Absent.** No version, no ETag, no `If-Match`, no revision counter — a grep for
`etag|if-match|optimistic` across the whole root returns exactly one hit, and it is prose in
`docs/persistence.md:81`. Concretely:

- **L1 — lost update, last-writer-wins.** Two tabs on the same journey both `structuredClone`
  the record, both compute a whole new `answers` map, both `saveAnswers` the whole map. The
  second overwrites the first's page in full. Nothing detects it. *Not structural* — the
  RECORDS port is one method away from taking a version, and the backend would need a field.
- **L2 — the freeze check can read a stale status.** `records/real.js:106-119` trusts the
  in-request cached `known.status` rather than re-reading. Submit in tab A, then a write from
  tab B whose memo was loaded pre-submit, and the FE-side freeze does not fire. The window is
  one request wide and the backend may or may not reject; the FE cannot say. This is a hole
  *opened by* the one-load optimisation — a genuine trade-off, worth naming when the two
  prototypes are merged.
- **L3 — no locking, no queue, no retry.** A failed backend POST throws (`failed()`,
  `real.js:18-25`) and the answers are simply not saved; the memo still holds the *new*
  answers from the caller's perspective only if the save succeeded (it doesn't write the memo
  before the await), so the state is consistent, but the user loses the page. No offline/retry
  affordance.
- **L4 — a GET can mint a backend record.** `entryGuardTarget` runs on `onPreHandler` for
  every guarded path and calls `currentJourney`, which falls back to `startJourney` →
  `records.create` → `POST /notifications`. A deep-link from a fresh browser therefore
  creates an empty DRAFT in Mongo before redirecting to the filter. Not structural; a
  read-only `currentJourneyOrNull` would fix it.

---

## 9. Doc-vs-code disagreements (checked, as instructed)

1. **`docs/persistence.md:34-35`** says RECORDS is "the durable store: one application
   document per `journeyId`, held in an in-memory `Map`." That describes the **stub only**.
   The real adapter (`records/real.js`, 153 LOC) is an HTTP client against the backend
   `/notifications` API. The doc's own §"Intended production mapping" (`:191-204`) still lists
   `records.saveAnswers → PATCH /applications/{id}/answers` as *intended*, when the shipped
   real adapter POSTs the whole notification to `/notifications`. The doc lags the code.
2. **`docs/persistence.md:10-32`** describes SESSION as three **cookies**. In real mode all
   three are `request.yar` keys backed by Catbox-Redis (`session/real.js`), registered by the
   host frontend's `src/server/common/helpers/session-cache/session-cache.js` (`maxCookieSize`
   effectively server-side). The doc mentions yar only in passing elsewhere
   (`DESIGN-DELTA.md:435`, `docs/flow-and-gates.md:106`). Its table row "Cookie carries
   `journeyId` → Opaque session id; Redis GET/SET" is listed as *future work* when it is in
   fact **done** in real mode and proved by a testcontainers Redis integration test
   (`session/real.redis.integration.test.js`, 5 cases, incl. "Should write the session
   server-side into Redis" and "Should keep two parallel session contexts isolated").
3. **`engine/store.js`** — `docs/engine.md:193-206` calls it "a compat shim... do not add new
   consumers". Verified: **zero production importers.** All 21 importers are `*.test.js` files
   plus `engine/test-support.js`. It is a 12-LOC test-only facade. Worth deleting; worth *not*
   carrying into a third option.

---

## 10. Retrofit cost — what a merged model would pay to take A's state layer

Cheap to lift (rules and small files, no coupling to A's obligation model):
- **The derived-not-stored rule** and the resume self-heal that falls out of it. Zero code —
  it is a constraint on what you persist.
- **The two-port split** (`engine/persistence/{records,session}.js`, 99 LOC combined) with
  unconfigured-throws defaults. Depends on nothing.
- **The per-request memo** (9 LOC, `journey.js:35-43`) plus its network-boundary test.
- **`lib/path.js`** (63 LOC) — pure, dependency-free path maths.

Coupled to A's model, cannot be lifted alone:
- **`destroyWiped`-on-write** requires `reconcile(answers)` to return a `wiped` set, which
  requires obligations to carry `wipeOnExit` and the engine to walk instances. If B's model
  derives scope differently, the *shape* (`{inScope, wiped}` on every read and write) still
  transfers; the contents do not.

Absent, so nothing to lift: concurrency control, per-user ownership, event log/history,
optimistic locking, offline/draft-in-browser.

---

## 11. Verdict for this dimension

Side A's state layer is **HANDLED IMPERATIVELY, well** — clean ports, one memo, write-through,
whole-map replacement, freeze/amend lifecycle, real Redis + real backend behind the seams,
~94 tests including a testcontainers Redis IT and a mocked-fetch load-count contract. **Nothing
about it is declarative.** There is exactly one derived thing in the whole dimension — the wipe
set — and its value is that it makes hand-rolled deletes *impossible*, not that it makes
persistence *configurable*.

If B's model is better, it will not be because it has a better `saveAnswers`. It will be
because it can *express* things about state that A can only hand-code. On this dimension A is
a good, honest, unremarkable Hapi app with two unusually well-drawn seams.
