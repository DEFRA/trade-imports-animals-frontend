# L3 — Adversarial verification — session-state — SS-5

**CLAIM:** A's obligation id is a single identifier doing four jobs including the persisted storage
key, so B's UUID/name split cannot be retrofitted as a refactor — it is a live data migration
against DRAFTs already in Mongo.

**VERDICT: REFUTED.**

The central assertion — "the persisted storage key" / "a live data migration against DRAFTs already
in Mongo" — does not survive contact with the source. **A never persists an obligation-id-keyed
document anywhere.** Side A already has the id↔storage-key indirection that the claim says it lacks:
it is the notification mapper. Re-keying obligation ids changes **zero persisted bytes**.

---

## 1. The quote is real (partial confirm)

`features/documents/obligations.js:1-4` — verified verbatim:

```js
export const accompanyingDocumentType = {
  id: 'accompanyingDocumentType',
  required: true
}
```

The id genuinely is overloaded, and B genuinely does split it. Verified on B:
`obligations/obligations.js:153-154` etc. — every obligation carries `id: '<uuid>'` **and**
`name: '<camelCase>'` (`id: '9a0b1c2d-3e4f-4a5b-8c6d-7e8f9a0b1c2d', name: 'poApprovedReferenceNumber'`).

`grep -rln accompanyingDocumentType` over A's tree returns **18 files** — obligations, controller,
`template.njk` (`id:`, `name:`, `value: values.accompanyingDocumentType`, `errorMessage:` — so it is
the HTML form field name too, a *fifth* job the claim doesn't count), `spec/journey-spec.json`,
`spec/conflicts.json`, fixtures, the mapper, and ~8 tests. For **one** of ~46 obligations. So the
"one identifier, many jobs" observation is sound and the refactor is genuinely wide.

**Every one of those 18 files is source code.** None is data.

## 2. The counter-example: A's durable store is domain-shaped, not id-keyed

This is where the claim breaks. I traced the write path end to end.

- `services/persistence/records/index.js` — **exactly two** adapters: `stub` (in-memory `Map`,
  `records/stub.js:15` `const journeys = new Map()` — process memory, wiped on restart, not a
  migration target) and `real` (Mongo, via the backend).
- `services/persistence/records/real.js:121-124` — the real `saveAnswers` does **not** persist the
  answers map:
  ```js
  const notification = toNotification({ ...answers, referenceNumber: journeyId })
  const response = await fetch(notificationsUrl, { method: 'POST', ... body: JSON.stringify(notification) })
  ```
  and `real.js:52` reads back `answers: toAnswers(stripNulls(notification))`.
- `services/persistence/records/notification-mapper.js:1-2` states it outright:
  *"Native bidirectional mappers between the engine's obligation-id-keyed `answers` and a backend
  `notification`."*

The mapper is a **total, explicit, per-field translation** between the two vocabularies:
`notification.origin.countryCode ← answers.countryOfOrigin` (`:174`), `notification.cphNumber ←
answers.countyParishHoldingCph` (`:208-210`), `notification.transport.portOfEntry ←
answers.portOfEntry` (`:214`), and — for the very obligation the claim cites —
`documentType: doc.accompanyingDocumentType` (`:411`).

**The Mongo document's key for that obligation is `documents[].documentType`, not
`accompanyingDocumentType`.** The obligation id is on the *left*-hand side of the mapper: it is a
property accessor in JavaScript source, not a field name in a stored document.

## 3. Nothing else persists the id-keyed map either

`grep -rln yar` over A's whole prototype tree returns 3 non-doc/non-test JS hits, and the only
production one is `services/persistence/session/real.js` — which stores **three journeyId pointers
and nothing else**: `ACTIVE_JOURNEY`, `KNOWN_JOURNEYS`, `OPENING_RUN`. No answers in the session.

So in `LIVE_ANIMALS_MODE=real` the obligation-id-keyed answers map exists **only inside a single
request**, materialised on load by `toAnswers()` and dissolved on save by `toNotification()`. It has
no durable representation at all.

## 4. Each stated consequence of a re-key, checked

| Claim's consequence | Reality |
|---|---|
| "breaks both notification mappers" | **True but trivially** — it changes the LHS accessors in `notification-mapper.js`. That is one 507-line file, and it is the *designated* place where the two vocabularies meet. That is what a mapper is for. |
| "every Nunjucks binding" | **True** (`features/documents/template.njk:19-23`). Real refactor cost. B pays a version of this too — B's widgets bind by `name`. |
| "breaks the Mongo parity pin (`skeleton-vs-prototype-mongo.spec.js` compares real documents field-by-field)" | **False.** The spec compares two **backend notification documents** (`:397 expect(prototypeDoc).toEqual(skeletonDoc)`), whose fields are notification field names. An obligation-id rename leaves both documents byte-identical. Worse for the claim: the spec's `VOLATILE` strip list (`:27-35`) **already deletes `accompanyingDocuments` before the compare** — the cited obligation's persisted data is not compared at all. |
| "**every DRAFT already persisted in Mongo** — this is a live data migration, not a refactor" | **False.** A DRAFT in Mongo is a notification (`origin`, `transport`, `commodity`, `cphNumber`, …). Re-key the obligations, update the mapper's accessors, and every existing DRAFT still loads: `getNotification()` → `toAnswers()` rebuilds the answers map under whatever keys the model now uses. Not one stored document is touched. |

## 5. Is this "not built" vs "cannot be built"? No — it's the reverse

The claim asserts a *structural* coupling that the code does not have. A already achieves the exact
benefit B's doc claims for the UUID/name split (`obligations.md:2056-2073`: *"Renaming a field is a
code-only change; storage is untouched"*). In A, renaming an obligation id is **also** a code-only
change and storage **is** untouched — by a different mechanism (an explicit mapper rather than a
declarative `id`/`name` attribute pair).

Note also that B's version of the property is **doc-only, not demonstrated**: B has no durable store
at all (`lib/state.js` is yar, one fixed session key). B's "storage is untouched by a rename" is an
assertion about an intended shape, not a behaviour any B code exhibits.

## 6. The real asymmetry, which runs the *other* way from the claim

Having hunted for it, the genuine A/B difference on this axis is:

- **B's decoupling is declarative and free per obligation.** Add an obligation, get a stable storage
  key, no extra code.
- **A's decoupling is hand-written and per-field.** Every persisted obligation costs two lines in
  `notification-mapper.js` (one each way), and **anything the mapper does not name is silently not
  persisted**: `targetDocuments` (`:406-416`) carries only 4 of the documents-entry fields, so the
  `uploadId`/`filename` that `features/documents/controller.js:269-274` writes into the answers map
  are **dropped at the Mongo boundary**. Mapper A is explicitly *"total on the storable obligations
  and carries nothing the skeleton does not persist"* (`notification-mapper.js:7-8`).

That is a real cost of A's approach — but it is a *maintenance-burden and completeness* cost, not
the *migration* cost the claim asserts. And it buys something B has no answer for: A's persisted
document is domain-meaningful and byte-comparable against the production skeleton's, which is what
makes the parity pin possible at all. B's persisted document would be a UUID-keyed flat blob needing
a manifest-driven un-flattener before any backend could read it (already conceded at
`L2-session-state.md:75`).

---

## Searched and found nothing to save the claim

- `grep -rln accompanyingDocumentType` across A → 18 files, all source/spec/test/doc.
- `grep -rln yar` across A → session pointers only.
- `records/index.js`, `records/stub.js`, `records/real.js`, `engine/persistence/records.js` — the
  full port + both adapters read; no adapter persists the answers map verbatim to durable storage.
- `notification-mapper.js` read in full (507 lines) — every mapping is an explicit named pair.
- `skeleton-vs-prototype-mongo.spec.js:1-50, 397` — compares notification documents; strips
  `accompanyingDocuments`.
- B `obligations/obligations.js:153-251` — UUID/name split confirmed real in code, not just doc.
