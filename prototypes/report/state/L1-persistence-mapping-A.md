# L1 — Persistence, mapping, upload, amend-after-submit — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`

## Headline

This dimension is **fully built and genuinely wired to a real backend + Mongo** — but it is
**almost entirely HANDLED IMPERATIVELY**. The obligation model contributes *nothing* to
persistence or mapping. Not one of the 44 obligations carries a backend path, a type, a
serialisation hint, or a persistence flag. The whole mapping surface is 507 hand-written
lines (`services/persistence/records/notification-mapper.js`) that name every obligation id
and every backend field home by hand, in both directions, twice (Mapper A and Mapper B).

The *ports* are the modelled part: two 48/51-LOC injected contracts
(`engine/persistence/records.js`, `engine/persistence/session.js`) whose unconfigured
defaults throw. That is a clean, testable seam — but it is dependency-injection discipline,
not a model.

Totals for this dimension: **3,277 LOC** across records/session/document-uploads (1,090 LOC
source, 2,187 LOC test), plus the 2 parity harnesses and 33-test E2E suite that cover it.

---

## 1. Does it persist? Yes — two ports, two modes, real backend.

### The port seam (MODELLED — as DI, not as data)

`engine/persistence/records.js` (48 LOC) is an 8-method port whose default impl is a thrower:

```js
const unconfigured = () => {
  throw new Error('records not configured — call configureRecords() at boot')
}
```
(`engine/persistence/records.js:4-6`; `session.js:7-9` is the twin.)

Methods: `create / load / list / has / saveAnswers / finalise / amend / clear`
(`engine/persistence/records.js:8-17`). Session: `userId / activeJourneyId /
setActiveJourney / knownJourneyIds / addKnownJourney / clearActive / openingRun /
setOpeningRun` (`session.js:11-20`).

Bound at boot in `routes.js` (`configureRecords(records)` → `configureSession(session)`),
selecting stub vs real off one env var:

- `services/persistence/records/index.js:5` — `export const records = isRealMode() ? realRecords : stubRecords`
- `services/persistence/session/index.js:5` — same shape.
- `services/mode.js` — `LIVE_ANIMALS_MODE=stub|real`.

**Notably: there is no per-key write and no delete anywhere in either port.**
`saveAnswers(journeyId, answers)` replaces the whole answers map. This is what forces
scope-exit wipe to stay derived (`reconcile` → `destroyWiped`) rather than hand-rolled per
page. That coupling *is* a model-driven property of the persistence layer, and it is the
one place the model shapes persistence at all. (`engine/write.js:11-18`, `docs/persistence.md:183-190`.)

### Stub mode (`services/persistence/records/stub.js`, 95 LOC)

In-memory `Map`, `structuredClone` both ways, mints Crockford-base32 references
(`GBN-AG-{yy}-{6}`, stub.js:4-13). `loadWritable` is the single freeze gate:

```js
const assertWritable = (journey) => {
  if (journey.status === SUBMITTED) {
    throw new Error(`Journey "${journey.journeyId}" is submitted — writes blocked`)
  }
}
```
(`stub.js:18-24`.)

### Real mode (`services/persistence/records/real.js`, 153 LOC)

Talks HTTP to the Java backend (`TRADE_IMPORTS_ANIMALS_BACKEND_URL`, default `:8085`):

| port method | real call |
|---|---|
| `create` | `POST /notifications` with `{}` → backend mints `referenceNumber` (real.js:68-72) |
| `load` | `GET /notifications/{ref}` (real.js:56-64) |
| `list` | N× `GET /notifications/{ref}` over the **session-known** ids only (real.js:95-100) |
| `saveAnswers` | `POST /notifications` (full-document upsert, mapped) (real.js:125-129) |
| `finalise` | `POST /notifications/{ref}/submit` (real.js:135) |
| `amend` | `POST /notifications/{ref}/amend` (real.js:144) |

Two details worth lifting:

1. **Null-strip before mapping** (real.js:30-42, `marshal` at 52: `answers: toAnswers(stripNulls(notification))`).
   The backend echoes explicit `null`s for unset fields; without the strip they marshal into
   answers as answered-with-null and poison scope/completeness. Pinned by
   `real.null-echo.test.js` (51 LOC).
2. **No resume-by-user in real mode** — `load({ journeyId })` only; `load({ userId })`
   returns `undefined` and issues no list read (`real.js:85-93`, pinned by
   `real.no-resume-by-user.test.js`). This was a deliberate security fix: an earlier adapter
   did a global `GET /notifications?sort=updated,desc` and returned `list[0]` — a cross-user
   leak (`docs/persistence.md:220-236`). The session's known-journeys list is now the
   *only* authorisation seam, and the doc says plainly the backend still has no owner field
   (`docs/persistence.md:206-218`).

### Session (`services/persistence/session/{stub,real}.js`, 48 / 46 LOC)

Stub = three signed cookies (`liveAnimalsJourneyId`, `liveAnimalsKnownJourneys` base64json,
`liveAnimalsOpeningRun` base64json), registered in `engine/journey.js:23-33`.
Real = `request.yar` (Redis-backed) with the same three keys, and `userId` from
`request.auth.credentials.sub` when auth exists (`session/real.js:13`). Pinned by a
testcontainers Redis integration test (`real.redis.integration.test.js`, 164 LOC).

### Write-through per commit

Every mutating engine op ends with `saveJourneyAnswers` → `records.saveAnswers`
(`engine/write.js:16,26,45,59,76` — five call sites). So the durable record is always
current, and **submit is a pure status flip**:

```js
export const submitJourney = async (request, h) => {
  const journey = await currentJourney(request, h)
  const scope = makeScope(journey.answers)
  if (!scope.readyForCheckYourAnswers) return { ok: false, journey, scope }
  const submitted = await records.finalise(journey.journeyId)
```
(`engine/write.js:89-95` — the readiness gate is re-checked server-side, not trusted from the page.)

Cost of write-through in real mode: **every page POST is a full-notification upsert** over
HTTP. There is no PATCH and no dirty-field tracking.

---

## 2. Mapping to the backend notification — HANDLED IMPERATIVELY, and lossy by default

`services/persistence/records/notification-mapper.js` — **507 LOC, 4 exported functions**,
selected at call time by `mapper.js` (20 LOC):

```js
const useB = () => (process.env.LIVE_ANIMALS_MAPPER ?? 'a') === 'b'
export const toNotification = (answers) =>
  (useB() ? answersToTargetNotification : answersToNotification)(answers)
```
(`mapper.js:14-17`.)

### Mapper A — skeleton-exact, storable-only (the DEFAULT)

`answersToNotification` / `notificationToAnswers` (mapper.js lines 164-317). Hand-written
field-by-field: `answers.countryOfOrigin → notification.origin.countryCode`,
`answers.placeOfDestination → notification.destination`,
`answers.contactAddress → notification.consignment`, `arrivalDateAtPort` {day,month,year}
→ ISO string, `commercialTransporter|privateTransporter + transporterType` → one collapsed
`transport.transporter` object, and the commodity grain change: the store is
line-per-species; the skeleton blob is one *complement per commodity* with a species array
and **summed** complement totals (`groupLinesByCommodity`, `totalOf` — mapper.js:53-72).

**Mapper A is provably lossy.** Pinned as a test, not just documented — the test is titled
"Should lose every gap obligation across a full round-trip (pinning the lossiness)"
(`notification-mapper.test.js:293-323`). Ten top-level answer keys have **no backend home**:

`responsiblePersonForLoad`, `regionOfOriginCode`, `purposeInInternalMarket`,
`privateTransporter`, `meansOfTransport`, `transportIdentification`,
`transportDocumentReference`, `transitedCountries`, `declaration`, **`documents`**
(list verbatim at `notification-mapper.test.js:301-312`).

Plus, per animal-identifier unit: only `earTag` and `passport` survive; the other five
(tattoo, horseName, identificationDetails, description, permanentAddress) are dropped, and
only the **first** unit per species entry is carried (`speciesEntryFromLine`,
mapper.js:79-89). Plus commodity identity of every group after the first
(`lineFromSpeciesEntry(index === 0 ? commodity.name : undefined)`, mapper.js:245-249).

### Mapper B — lossless over the obligations (opt-in, `LIVE_ANIMALS_MAPPER=b`)

Reuses A's builders and layers the extras: per-complement `commodityCode` + `name`, full
per-species `animalIdentifiers` arrays via `targetUnit`/`unitFromTarget` (mapper.js:323-343),
the split transport fields, `documents`, `declaration`, `purpose`, `regionCode`
(mapper.js:430-467). The reverse **falls back to Mapper A recovery** when a backend has
stripped the extras (`targetLinesFromCommodity`, mapper.js:382-404) — that graceful
degradation is genuinely nice work.

**But note what even Mapper B drops:** `targetDocuments` (mapper.js:406-416) emits only
`{documentType, attachmentType, reference, dateOfIssue}`. It does **not** emit `uploadId` or
`filename` — the two keys the documents controller stores alongside the obligation answers
(`features/documents/controller.js:269-274`). So the link from a persisted document row back
to its scanned file, and the filename shown in the virus-found error, are lost on any
backend round-trip. Consistent with the mapper's stated contract ("lossless on all 46
obligations", mapper.js:320) — `uploadId`/`filename` are not obligations — but the
consequence is real: a resumed real-mode journey shows documents with no `uploadId`, and
`scanStatusOf` then returns `COMPLETE` unconditionally for them
(`features/documents/controller.js:88`: `if (!entry.uploadId) return 'COMPLETE'`).

### The parity harness — the strongest single artefact in this dimension

Two levels, both real:

1. **Unit** — `skeleton-equivalence.test.js` (238 LOC, 2 cases). It does **not** hand-copy
   an expected payload. It imports the *actual production skeleton client* from the same
   repo and drives it:
   `import { notificationClient } from '../../../../../../src/server/common/clients/notification-client.js'`
   (line 3), stubs `fetch` to capture the exact JSON body the skeleton would POST
   (lines 203-218), then asserts `expect(mapperAPayload).toEqual(skeletonPayload)`
   (line 227). Second case pins the two-species → summed-complement consolidation (line 230).
2. **Browser + Mongo** — `prototypes/e2e/skeleton-vs-prototype-mongo.spec.js` (399 LOC, 1
   test) drives BOTH journeys (legacy skeleton at `/`, prototype at
   `/prototype-standalone/live-animals`) against the same real backend, then compares the two
   persisted Mongo documents field-by-field after stripping volatile keys
   (`VOLATILE`, spec lines 27-35; `expect(prototype).toEqual(skeleton)`). Runs as its own
   Playwright project (`playwright.config.js:65-66`, `npm run test:prototype:parity`).

Caveat the spec itself states: **the parity compare is on DRAFT documents, not submitted** —
"the prototype in the default Mapper A mode cannot reach final submit, so we compare the
persisted DATA, not the submit" (spec lines 14-15).

There is also a gated real-backend integration test (`real.integration.test.js`, 289 LOC,
6 cases) behind `LIVE_ANIMALS_IT=real` — zero cost on the default hermetic run
(`describe.skipIf(!runsIt('real'))`, line 39).

---

## 3. Draft → submitted → amend lifecycle

Status vocabulary: `IN_PROGRESS = 'in-progress'`, `SUBMITTED = 'submitted'`
(`engine/persistence/records.js:1-2`); backend `SUBMITTED` marshals in via
`mapStatus` (`real.js:27-28`).

- **Freeze**: stub throws in `assertWritable` (stub.js:18-24); real re-checks status before
  every save — `if (status === SUBMITTED) throw new Error(...writes blocked)`
  (`real.js:117-119`). Real mode skips the confirming GET when the request-scoped memo
  already knows the status (`real.js:107-116` + `engine/journey.js:73-82` `{ known }`).
- **Amend = the sanctioned unfreeze**: `records.amend` → status back to `in-progress`,
  `submittedAt` cleared; amending a *non*-submitted record throws, so amend can never be a
  freeze bypass (`stub.js:80-89`). Real mode POSTs `/notifications/{ref}/amend` (real.js:143-150).
- Composed at `engine/journey.js:97-104` — `amendJourney` = session-known check → load →
  unfreeze-if-submitted → make active. The session-known check is the authorisation seam
  (`isKnownJourney`, journey.js:87-88).
- Dashboard wiring: `GET home/{id}/resume`, `GET home/{id}/view` (→ CYA),
  `POST home/{id}/amend` (`features/dashboard/controller.js:85-115`).
- **E2E-proved**: `prototypes/e2e/live-animals.spec.js:2806` — "dashboard amend — a submitted
  row offers View and Amend; Amend re-enters an editable journey and the resubmission passes
  the same gate" (drives submit → row flips to Submitted → View → Amend → edit
  `AmendedRef99` → resubmit → row reads Submitted again, lines 2806-2886).

**Gap: there is no read-only view mode.** `SUBMITTED` is consulted in exactly 3 non-test
places outside the ports — `confirmation/controller.js:19`, `declaration/controller.js:47,55`,
`shared/kit.js:19` (the journey-strip Draft/Submitted badge). "View" redirects a submitted
journey to Check your answers (`dashboard/controller.js:75-78`), whose rows carry `?change=1`
Change links into fully editable pages. Following one and POSTing hits
`records.saveAnswers` → throws → 500. The freeze is enforced at the store, but nothing
stops the UI from walking into it.

---

## 4. File upload + virus scan — real, but NOT a direct cdp-uploader integration

**The frontend never talks to cdp-uploader.** It proxies bytes through the *backend's*
document-upload endpoints, which broker cdp-uploader. `services/document-uploads/real.js`
(89 LOC):

- `POST /notifications/{journeyId}/document-uploads` with `{documentType, documentReference, dateOfIssue, maxFileSize, mimeTypes}` → `{uploadId}` (real.js:29-45)
- `POST /document-uploads/{uploadId}/file` — multipart `FormData` with the raw bytes (real.js:47-63)
- `GET /document-uploads/{uploadId}` → `{ scanStatus }` (real.js:72-80)
- `DELETE /document-uploads/{uploadId}` (real.js:82-88)

`docs/services.md:56` is honest about this: "trade-imports-animals-backend document-upload
endpoints (**broker for cdp-uploader**)". So there is **no** initiate→redirect→callback
dance in this codebase — the browser POSTs multipart to the prototype, the prototype holds
the bytes in memory (`payload.file.payload`) and re-POSTs them. That is a materially
different (and simpler) integration from the cdp-uploader redirect pattern, and it means the
50MB cap must survive two hops (`MAX_PAYLOAD_BYTES = 50MB + 1KB`, `upload-config.js:39-45`).

Controller (`features/documents/controller.js`, 358 LOC):
- Poll-by-refresh-link, not JS: `?attempt=N` (`getAttempt`, line 164; `refreshHref`, 169),
  `MAX_POLLING_ATTEMPTS = 10` → timed-out state (line 204).
- Three scan states → GDS tags: COMPLETE=Safe/green, REJECTED=Virus found/red,
  PENDING=Checking/blue (lines 117-121).
- REJECTED **blocks Continue** with a per-file error naming the filename (lines 156-162,
  278-295); any non-COMPLETE also blocks unless the user is exiting to the hub.
- Remove deletes the upload then the entry (`getRemove`, 299-313).
- Oversize 413 caught in `onPreResponse` and re-rendered as a GDS field error rather than a
  Boom page (lines 315-332, 344-349) — a nice touch.
- Attachment type is **derived from the filename extension**, not user-selected
  (`attachmentTypeFor`, `upload-config.js:50-55`) — the c-034 source flip.

Stub (`stub.js`, 30 LOC) fakes the scan by filename convention: `/virus/i` → REJECTED,
`/never-scans/i` → stays PENDING, everything else COMPLETE, and only settles on a read
carrying `refresh: true` so server-side gate reads cannot consume the PENDING state before
the user sees it (stub.js:3-25). 98 LOC of tests on that 30 LOC.

**The sting:** the documents collection is **not persisted to the backend at all in the
default mode.** Mapper A never emits it — `expect('documents' in notification).toBe(false)`
(`notification-mapper.test.js:261`). In real+Mapper-A mode the upload happens, the backend
scans it, and the answers-side document rows vanish on the next load. Only
`LIVE_ANIMALS_MAPPER=b` persists them, and even then without `uploadId`. (This mirrors the
legacy skeleton — c-004 records that documents never enter `buildNotificationPayload` — so
it is faithful, not accidental. It is still a hole.)

---

## 5. The retrofit question — what does the MODEL buy you here? Nothing.

This is the finding that matters for the comparison.

- **No obligation carries any persistence metadata.** The whole 11-key vocabulary (id,
  required, requiredAtLeastOne, requiredOneOf, collection, item, system, renderOnly,
  activatedBy, wipeOnExit, maxEntriesFrom, enforcedAt) has no `type`, no `backendPath`, no
  serialiser. `docs/obligation-model.md` states this as doctrine.
- Therefore mapping is **4 hand-written functions naming every field twice** (forward and
  reverse) **× 2 mappers**. Adding one persisted field is **4 mapper edit sites** on top of
  the 5 places `docs/add-a-field.md` names.
- And **`docs/add-a-field.md` does not mention the mapper.** Its five steps are
  obligations.js → controller schema → controller commit → template → CYA row (line 16:
  "Adding a field touches five places"). Line 11 waves at "the persistence wiring" but no
  step covers it. **No test fails** if you forget: `contract.test.js` checks *collects vs
  commits*, not *commits vs maps*. So a new field added by the book works perfectly in stub
  mode and is **silently dropped** in real mode. That is a live trap in the current
  codebase, and it is a direct consequence of the model carrying no field-level type
  information.

The **document-vs-code disagreements** I found:

1. `docs/persistence.md:34-45` describes RECORDS as "an in-memory `Map`" with `loadWritable`
   as "the single gate in front of every mutating operation". That describes the **stub
   only**; the real adapter re-implements the freeze independently (`real.js:117-119`) and
   the two can drift. The doc's "Intended production mapping" table (lines 196-204) is also
   stale in places — it still proposes `POST /applications` / `PATCH /applications/{id}/answers`
   when the shipped adapter uses `POST /notifications` (upsert) and `/submit`.
2. `docs/persistence.md:150-154` says Mapper B is "lossless" — true over obligations, false
   over the stored record (`uploadId`, `filename`).

---

## Bottom line for the shopping list

**Take from A:** the two injected ports with throwing defaults; the whole-answers-only write
surface (it is what keeps wipe derived); the *null-strip-before-mapping* rule; the
session-known-journeys authorisation seam and the removal of resume-by-user; and above all
**both parity harnesses** — driving the real legacy client in a unit test, and comparing two
real Mongo documents in a browser test, are reusable against any model.

**Do not take from A:** the mapper design. 507 LOC of bidirectional hand-mapping with a
`LIVE_ANIMALS_MAPPER` env flag is a maintenance liability, and the fact that no test names
the mapper when you add a field is a defect in the paradigm, not a bug in the code. If B's
domain layer carries type/shape information per field, the correct third option is a
**derived** mapper (obligation → backend path declared once, both directions generated),
with A's parity harnesses pointed at it as the acceptance test.
