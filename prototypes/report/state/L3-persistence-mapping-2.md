# L3 — persistence-mapping — CLAIM PM-2 — **REFUTED**

> **CLAIM:** A's durable key is semantic, B's is opaque, and this is a deliberate identity design
> B cannot escape. … B's durable document is meaningless without shipping the code registry …
> "The moment B talks to anything outside the process, it needs a translation table. **A does not.**"

Verdict: **REFUTED**. The quotes are all real. The *inference* is not. Two independent failures, either
of which is fatal:

1. **A's durable document is not the answers map.** In real mode A persists a *backend notification*
   keyed by backend schema paths, reached through a 507-line hand-written bidirectional translation
   table. `answers.countryOfOrigin` never reaches Mongo.
2. **"A does not [need a translation table]" is false on its face.** A's translation table is
   `notification-mapper.js`. It is the largest single file on this dimension.

The residue that survives is a *serialisation-boundary ergonomics* difference, not an asymmetric
structural capability.

---

## 1. What I verified as stated (the claim's quotes are honest)

| Cited | Verified |
|---|---|
| B `lib/state.js:65` | `fulfilments[obligation.id] = value` — yes, exact. |
| B `lib/state.js:72` | `stored[path] = value` for indexed groups — yes, exact. |
| B `obligations/obligations.js:412-417` | `commodityCode = { id: '21f60718-…-17e8f9a0b1c3', name: 'commodityCode', within, status }` — yes, id is a UUID. |
| B `obligations.md:2068-2073` | *"`id` is the persistence key — an opaque UUID… `name` … **May be renamed** between deployments."* — yes. The identity design is deliberate and documented, exactly as claimed. |
| B `dump.js:40-52` | `ALL_OBLIGATIONS_BY_NAME` → `resolveFulfilments`, `throw` at :47 — yes, 11 lines, name→id, unidirectional. |
| A `engine/write.js:16,26,45,59,76` | `saveJourneyAnswers(request, journey.journeyId, answers)` — yes, five write-through sites. |
| A `notification-mapper.js` | maps `answers.countryOfOrigin → notification.origin.countryCode` (:173) — yes. |

So the claim is not fabricated. It is *reasoned wrongly from true premises*.

---

## 2. Fatal finding #1 — A's durable store is keyed by **backend** paths, not obligation ids

I followed `saveJourneyAnswers` all the way down.

`engine/journey.js:76` → `records.saveAnswers(journeyId, answers, { known })`
`services/persistence/records/index.js:5` → `isRealMode() ? realRecords : stubRecords`

**Real mode** — `services/persistence/records/real.js:121-131`:

```js
const notification = toNotification({ ...answers, referenceNumber: journeyId })
const response = await fetch(notificationsUrl, { method: 'POST', body: JSON.stringify(notification) })
```

and on the way back, `:52`: `answers: toAnswers(stripNulls(notification))`.

**The thing that lands in Mongo is the notification.** A's own doc confirms it —
`docs/persistence.md:161-162`: *"drives both journeys in a browser and compares the two **persisted
notifications** field-by-field."*

**Stub mode** — `services/persistence/records/stub.js:15`: `const journeys = new Map()`. An
in-process Map. Not durable at all.

**Session store** — `services/persistence/session/real.js:3-5`: yar/Redis holds exactly
`liveAnimalsActiveJourney`, `liveAnimalsKnownJourneys`, `liveAnimalsOpeningRun`. **No answers.**

`grep -rln "mongo\|Mongo"` across A's prototype returns **no source file** — only `docs/`, `TODO.md`,
`spec/conflicts.json` and one integration test.

> **There is no store anywhere in A — durable or otherwise — that holds a document keyed by
> `answers.countryOfOrigin`.** The answers map is an in-process representation, reconstructed on load
> by `toAnswers(notification)`.

The claim's stated consequences — *"you cannot read it in Mongo, cannot write a backend query against
it, cannot debug production data"* — are therefore benefits A **does not have from its id vocabulary**.
A's Mongo document is readable because the *backend's schema* is readable. That is a property of the
Java backend, not of the obligation model.

---

## 3. Fatal finding #2 — A's obligation ids are **not** the backend's names. A needs the translation table too

`notification-mapper.js` is **507 lines**. It exists because A's semantic ids do not match the backend
at all — neither in name nor in shape:

| A obligation id | backend path (`answersToNotification`) |
|---|---|
| `countryOfOrigin` | `origin.countryCode` (:173) |
| `regionOfOriginCodeRequirement` | `origin.requiresRegionCode` (:174) |
| `internalReferenceNumber` | `origin.internalReference` (:175) |
| `animalsCertifiedFor` | `additionalDetails.certifiedFor` (:182) |
| `containsUnweanedAnimals` | `additionalDetails.unweanedAnimals` (:183) |
| `placeOfDestination` | `destination` (:203) |
| `contactAddress` | `consignment` (:206) |
| `countyParishHoldingCph` | `cphNumber` (:209) |
| `arrivalDateAtPort` | `transport.arrivalDate` (+ISO reshape, :215) |

Renamed **and** restructured. So the sentence *"The moment B talks to anything outside the process, it
needs a translation table. **A does not**"* is the exact inverse of the source. A talks outside the
process on **every page POST**, and it does so through a 44-entry hand-authored bidirectional table,
selected at runtime by an env var (`mapper.js:14`).

And to answer *"what obligation does `origin.countryCode` come from?"* — the question a support
engineer actually asks of A's Mongo document — you must **ship A's mapper**. Which is precisely the
"you must ship the registry" cost the claim pins on B, only larger (507 LOC vs a 14-line generator,
see §4.2) and, per `L2 §6`, **ungated by any coverage test**.

---

## 4. "B cannot escape" — three escapes found in B's own tree

### 4.1 The seam is one file, and B already owns the codec

The id-keying decision is made in **two lines** (`state.js:65`, `:72`). Everything upstream of the
serialisation boundary keys by id; nothing forces the *wire* format to.

`dump.js:40-52` is a working, total, throwing name→id codec — **11 lines**. The inverse
(`new Map(obligations.map(o => [o.id, o.name]))`) is the same 11 lines. Persisting name-keyed
documents and decoding on load is a ~20-line change confined to `state.js`.

The claim cites `dump.js` as *"the shadow of the mapper B doesn't have."* Read straight, it is the
opposite: it is **proof that the codec is trivial and already written**. A capability nobody wired up
into the persistence path is *not* a structural limitation (method step 3).

### 4.2 B already generates the registry the claim says it can't ship

`data-dictionary-sketch.js:65-78` — **in B's tree, exported, today**:

```js
export function buildDictionary() {
  for (const obligation of obligations) {
    rows.push({ id: obligation.id, name: obligation.name, within: obligation.within?.name ?? null, scope, domain })
  }
}
```

That **is** the id→name→nesting registry. `obligations.md:2626-2630` explicitly proposes shipping it:
*"A generated `data-dictionary.json` served at a well-known endpoint or shipped as a static asset. The
`data-dictionary-sketch.js` helper in the spike walks the obligations + domain modules and emits a
machine-readable dictionary today."* (It is honest that this is in-memory only — but the generator is
14 lines and already runs.)

"Cannot debug production data without shipping the code registry" → B ships a generated JSON
dictionary. A ships a 507-line mapper. Neither document is self-interpreting.

### 4.3 The decisive inversion — B's identity model is a **superset** of A's

The claim's hidden premise is that **A has both** (self-describing durable docs *and* rename freedom).
It does not. A has **one** identifier: the semantic id is simultaneously the code identifier, the
answers key and the mapper's left-hand column. A rename in A is a durable-data migration **with no
stable join key to migrate on**.

B has **two**. That means B can choose *any* of:

| option | self-describing durable doc | rename-free |
|---|---|---|
| key by `id` (today) | no | **yes** |
| key by `name` (A's trade) | **yes** | no |
| store `{ id, name, value }` triples | **yes** | **yes** — `id` stays the join key, `name` is a decoration refreshed on write |

The third row is **structurally unavailable to A**, because A has no second identifier to join on.

So the claim's "direct tension… B cannot have both" is exactly backwards: the tension is **universal**
to semantic keys, A resolved it by giving up rename freedom entirely, and **B is the only side whose
model can have both.** B's `obligations.md:2088-2091` even prices the alternative: *"Adding UUIDs later
would require generating them for all obligations and migrating all persisted fulfilments to key by
`id`. Up-front cost is trivial; **retrofit cost is a data migration**."* — i.e. A has an unpaid bill
here, not an advantage.

### 4.4 Auditability

The claim credits A with *"a mapping table can be audited against the id set."* **A does not do this** —
`L2 §6` establishes A's mapper has no coverage test at all, and `docs/add-a-field.md:16` doesn't list
the mapper. The audit gate exists only on **B**'s side (`obligations/coverage.test.js:80-104`, keyed on
`obligation.id`, and it works fine with UUIDs). The claimed advantage is present in the side the claim
says lacks it.

---

## 5. What actually survives (the true, much smaller, claim)

- **B's fulfilments wire-format, as written today, is UUID-keyed and unreadable without a registry.**
  True (`state.js:65`). It is a real ergonomics cost at the serialisation boundary.
- **A's *in-process* answers map is human-readable and greppable**, which makes the *left-hand column*
  of its mapper readable in source. True, and a modest but real authoring-ergonomics win.
- **B has never persisted anything durably**, so none of this has been tested against a real store.
  True, and already the L2 headline.

What does **not** survive: that this is asymmetric *capability*; that A avoids a translation table;
that A's Mongo document is answers-keyed; that B cannot escape; that B cannot have both halves.

---

## 6. Searches run

- Read: B `lib/state.js` (all 232), `dump.js` (all), `data-dictionary-sketch.js` (all),
  `obligations/obligations.js:400-434`, `obligations.md:2035-2134`, `:2600-2660`.
- Read: A `services/persistence/records/{real.js,stub.js,mapper.js}` (all),
  `services/persistence/session/real.js` (all), `engine/write.js` (all),
  `notification-mapper.js:1-120,160-220`.
- `grep -rn "renameable|rename|opaque|uuid|UUID" obligations.md` → :77-88, :238-239, :2068-2091.
- `grep -rn "readable|greppable|debug" obligations.md` → :2626-2637 (data-dictionary shipping).
- `grep -rln "mongo|Mongo"` across A's prototype → **no source file** (docs + 1 test only).
- `grep -n "saveJourneyAnswers|records\.(save|load|create)" engine/journey.js` → :53,:65,:73-76,:92,:99.
- `wc -l notification-mapper.js` → 507.
