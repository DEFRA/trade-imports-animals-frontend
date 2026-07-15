# L2 — Session and state management — A (live-animals) vs B (flow-layer)

Clones (read-only):
- A: `workareas/model-comparison/clone-live-animals` @ b6ac2ed — root `prototypes/standalone/live-animals/`
- B: `workareas/model-comparison/clone-flow-layer` @ d59b432 — root `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

All paths below are relative to those roots. Everything load-bearing was re-read at source, not taken from the L1 reports.

---

## Verdict: MIXED — and the standing prior does NOT survive this dimension intact

Split it cleanly, because the two sides win different halves and neither half is a build-loop artefact:

**B wins the state SHAPE.** Flat map, keyed by an opaque UUID that is *not* the code identifier, `/`-delimited composite keys for depth-N, and a key set that is closed over the model (anything not a known obligation id is dropped on read: `evaluator.js:227-235`). That buys free renames, free depth, a document that can be validated against the manifest, and self-heal on model drift. All three are properties of the DATA SHAPE, not of the amount of code written. A has none of them and cannot get them without a data migration (see `retrofitBintoA`).

**A wins the write path, and — importantly — A wins the ONE thing both models claim about state.** Both models market scope-exit purge as a derived consequence of the model. A actually applies it to storage: `reconcile(answers)` returns `{inScope, wiped}` (`engine/evaluate/reconcile.js:32-47`), `destroyWiped` mutates the map, and the mutated map is what `records.saveAnswers` persists (`engine/write.js:11-18`). B does not: `purgeStorage` (`evaluator.js:333-379`) produces `amendedFulfilments`, the evaluator returns it (`evaluator.js:123-126`), `readState` renders it and throws it away (`lib/state.js:42-44`), and **every** mutator re-reads raw yar (`lib/state.js:51, 102, 121, 187, 208`). All 5 `writeFulfilments` call sites are inside `state.js` and all are fed from `readFulfilments`. Nothing, anywhere, writes the amended map back. The doc asserts the opposite in three places (`obligations.md:2039-2040` "the orchestrator persists the amended set — it becomes the new source of truth"; `:659-661` "their prior values vanish"; `obligations/obligations.js:210-212`). And the consequence is not cosmetic: `applyTo` runs pre-purge on raw storage (`evaluator.js:80-84`), so a value the model believes it purged keeps driving *other* obligations' scope decisions on every subsequent request, forever. There is no test that flips a gate back (`routes.test.js:325-360` flips one way only).

So on the single state behaviour B's model actually specifies, B's running system does the opposite of the spec, and nobody noticed because nothing tested it. That is a strike against the prior — not because A is more finished, but because **A's version of the same idea is enforced by construction and B's is not**: A's two ports expose **no per-key delete surface at all** (`engine/persistence/records.js` — `create/load/list/has/saveAnswers/finalise/amend/clear`; whole-map replace only), so `destroyWiped` (`lib/path.js:59-63`) is the only deletion path in the app and it is imported by exactly one production module (`engine/write.js`). A page *physically cannot* hand-roll a delete. That is architecture, not effort.

**What is NOT a win for A, and I want to be explicit:** the yar/Catbox-Redis session adapter, the HTTP `/notifications` records adapter, submit/freeze/amend, multi-draft dashboard, the testcontainers Redis IT — every one of those is build-loop breadth, and *none* of it is structurally blocked in B. B's evaluator takes a fulfilments map and returns a fulfilments map; where that map is stored is genuinely none of the model's business, which is exactly what the design intends (`obligations.md:2017-2019`). Do not score A up for them. Score A up for: (a) the no-per-key-delete port contract, (b) applying the derived wipe to storage, (c) entry-owned collection storage (below). Score A down for: an open, unmodelled-key-tolerant answers map, and storage keyed by the code identifier.

**On the hardest question in the dimension — concurrency — it is 0–0.** Neither model expresses it, neither app implements it. A: `records.saveAnswers(journeyId, answers)` takes no version (`engine/persistence/records.js:36-38`) and always writes the whole map (`engine/write.js:16`). B: `writeAnswer` is a whole-map read-modify-write (`lib/state.js:51,76`). Two tabs clobber each other on both sides, silently. Neither side's model is in the way of fixing it; neither side gets credit.

### The shape trade-off, stated honestly

A's collections are **arrays of entry objects**; an entry exists because the array has an element (`engine/write.js:20-28 appendEntryAt`). B's collection instances have **no storage of their own** — an instance exists iff some descendant leaf holds a composite key with the matching prefix (`evaluator.js:390-421`).

Consequences, both directions:

- B must **seed a placeholder** `''` on a chosen in-scope leaf to bring an instance into being (`lib/state.js:110-114`, `:196-200`), and if a gate flip purges that leaf the instance can silently vanish. The source already admits the milder form (`features/units/controller.js:124-127`).
- B must **mint monotonic, never-recycled ids** and **cascade a prefix sweep on delete** (`lib/state.js:84-95`, `:139-157`) precisely because storage is not entry-owned — a recycled id would rehydrate any leaf the delete sweep missed. That is genuinely careful engineering, and it is *work A never has to do*: A's delete is `list.toSpliced(index, 1)` (`engine/write.js:48-60`) and it takes the entry's whole storage with it, atomically, because the entry owns its keys.
- Against that, A pays for arrays with `lib/path.js` (63 LOC of bracket-path arithmetic, `pathKey`/`parsePath`/`setAt`/`deleteAt`/`wipeOrder`) and with two identity vocabularies that `docs/limits.md` concedes are "bridged, not unified".

Neither shape dominates. The third option probably wants **B's flat composite keys with an explicit group-instance entry** (`commodityLine: { line1: {} }` — which B's own doc example at `obligations.md:1164` shows, contradicting `:1173-1174`), which restores entry-owned existence without giving up flat keys or UUIDs.

### Where A's model is empty and B's is not

A's obligation vocabulary (11 keys) says exactly **one** thing about state: `wipeOnExit`, carried by 15 of 44 obligations (grep: `features/*/obligations.js` — import-purpose ×1, transport ×3, additional-details ×1, commodities ×8, origin ×1, cph-number ×1). Everything else — where a value lives, whether it is persisted, whether it is derived — is a hand-coded controller decision. B's model says more: category (group/leaf/derived-leaf) determines storage shape and purge behaviour, the id/name split determines the persistence key, and purge is *universal* rather than opt-in (`purgeStorage` drops every out-of-scope entry with no per-obligation opt-out, `evaluator.js:342-346`).

That universality cuts both ways, and it is worth naming because it is the one place A's flag is arguably richer: A can declare "this answer survives a scope exit" simply by omitting `wipeOnExit` (29 of 44 obligations do exactly that), which is what makes accidental-toggle rehydration a *choice*. B has no such key — and adding one is not quite free, because a retained out-of-scope leaf under a group would resurrect the group instance through the prefix scan (`evaluator.js:390-421`). It is a small model change with a non-local interaction. I have kept it out of `aOnly` because for non-group obligations it is a two-line change to `purgeStorage`, and the strict bar is "structurally cannot".

### Cheap, non-structural gaps (do not score these)

- B: no request-scoped memo — a successful POST evaluates all 44 obligations **twice** (`page-controller.js:67|51`, then `:91`). A memoises on `request.app` with a Symbol and writes through on save (`engine/journey.js:35-43, 59-82`), pinned at the **fetch boundary** (`engine/one-load-per-request.test.js:62-88`, 3 cases: 1 GET + 1 POST for read-then-write; fresh post-write read still 1 GET; 2 requests = 2 GETs). Trivially portable to B (`request.app`).
- A: the wipe pass runs on **3 of 5** write verbs — `commit` (`write.js:14-15`), `removeEntryAt` (`:57-58`), `reconcileEntriesAt` (`:74-75`) do it; `appendEntryAt` (`:20-28`) and `updateEntryAt` (`:30-46`) do not. Note the verb `documents` uses to persist an upload IS `appendEntry` (`features/documents/controller.js:269-274`). ~4 lines to close.
- A: the one-load memo lets the freeze check read a stale status (`services/persistence/records/real.js:106-119` trusts the in-request `known.status`) — a hole *opened by* the memo. Name it when merging.
- A: a GET can mint a durable Mongo DRAFT (`routes.js:26-29` → `flow/entry-guard.js:44-50` → `currentJourney` → `startJourney` → `records.create`). A read-only `currentJourneyOrNull` closes it.
- B: no journeyId (`lib/state.js:13` is a fixed constant → one journey per browser session), no submit (`STATUSES.SUBMITTED` unreachable — both `journeyState` call sites pass no flag), no auth (`routes.js:46 const PUBLIC = { auth: false }`). All unbuilt, none structural.

### Scores

| | A | B |
|---|---|---|
| State shape (keys, depth, model-closure) | poor | **strong** |
| Purge/wipe actually applied to storage | **yes** (3/5 verbs) | **no** (view-only; doc says otherwise) |
| Model-drift tolerance | none | **yes** (`dropUnknownFulfilments`) |
| Collection-instance robustness | **strong** (entry-owned) | weak (existence inferred; seed hack) |
| Enforcement (can a page hand-roll a delete?) | **no — port has no delete** | yes — `writeAnswer` deletes keys directly |
| Derived-not-stored | **yes** (record key set asserted exactly) | **yes** |
| Concurrency | none | none |
| Durable persistence / lifecycle | built (not a model win) | absent (not a model loss) |

---

## Retrofit: B's state into A

**What transfers as pure ideas (cheap):** `dropUnknownFulfilments`, resume-by-derivation (A already has the equivalent — nothing derived is persisted; `engine/read.js:27-41` rebuilds scope on every read and `engine/resume-self-heal.test.js:38-45` asserts the record key set is exactly `answers, createdAt, journeyId, status, submittedAt, userId`), and the monotonic-never-recycled id rule (which A does not need — see above).

**What does not transfer without a rewrite:**

1. **Re-key storage from names to UUIDs.** A's obligation `id` is one identifier doing four jobs: storage key, code/import name, template binding, and mapper key (`features/documents/obligations.js:2 id: 'accompanyingDocumentType'`). Re-keying breaks: the two notification mappers, the Mongo parity pin (`prototypes/e2e/skeleton-vs-prototype-mongo.spec.js` compares real documents field-by-field), every Nunjucks binding, and **every DRAFT already persisted in Mongo** — this is a live data migration, not a refactor.
2. **Flatten arrays to composite keys.** Deletes `lib/path.js` (63 LOC) and its `wipeOrder` descending-index splice logic, and replaces atomic entry deletion with B's cascade + counters (`lib/state.js:139-157`). You import B's seed-placeholder requirement and its instance-annihilation mode. Net: you pay B's collection tax to buy B's depth-N generality that A already has (A's path machinery is depth-agnostic today).
3. **`dropUnknownFulfilments` is BLOCKED in A until A models what it smuggles.** A's answers map is an open object and controllers write non-obligation keys into it: `features/documents/controller.js:269-274` appends `uploadId` and `filename` into a documents entry; `features/documents/obligations.js` declares only 4 item fields. A drop-unknown pass would delete the uploader handles the real mapper depends on. Model those keys first (a spec change), then the pass is safe.
4. **B has no answer for what A's records port does.** `saveAnswers` writes a whole map to a backend `/notifications` document whose schema is domain-shaped. A flat UUID→value map with `line1/unit1` keys is machine-opaque; converting it to a notification requires an un-flattener driven by the manifest's ancestor graph. B's model *can* derive that (ancestors and categories are known) — but nothing in B does it, so it is new code, not a lift.

## Retrofit: A's state into B

Mostly **additive and cheap**, because B's model is genuinely storage-agnostic. `evaluate(fulfilments) → { fulfilments, obligations }` is a pure function; swapping the store under `lib/state.js` touches nothing in `obligations/`, `flow/` or `contract.js`.

1. Replace `readFulfilments`/`writeFulfilments` (6 LOC of yar) with A's two ports — `engine/persistence/records.js` (48 LOC) + `session.js` (51 LOC), unconfigured-throws, injected at boot (`routes.js:23-24`). ~100 LOC lifted verbatim; no B module outside `lib/state.js` changes.
2. Add a journeyId envelope (B's own doc already sketches it: `obligations.md:1988-2002` journeyId/status/createdAt/submittedAt) + a session pointer + known-journeys list. B currently has one fixed key (`lib/state.js:13`).
3. Memoise `evaluate` on `request.app` (A's Symbol memo, 9 LOC) — otherwise a POST does two full 44-obligation passes plus, now, a backend GET each.
4. **Fix the write-back first, or real persistence makes the bug permanent.** Today the purge is view-only and dies with the session. Persist the raw map to a backend and you persist un-purged answers into a document the mappers will read. One line (`writeFulfilments(request, state.fulfilments)`), plus the flip-back test that does not exist.
5. Add a `status` field + the adapter-side freeze guard (`services/persistence/records/stub.js:18-31` `assertWritable`; mirrored in `real.js:117-119`) and the sanctioned `amend()` unfreeze. B's engine already has a `submitted` flag threaded through `journeyState` (`engine/index.js:583-584`) — it is just never set.
6. **Give up `writeAnswer`'s direct deletes**, or A's "no page can hand-roll a delete" invariant does not survive the merge: `lib/state.js:53-61` deletes keys straight out of the map on `value === undefined`, and the four bespoke collection fns delete keys too. If the RECORDS port is the only writer and the purge is the only deleter, those must be re-expressed as writes of the amended map.
7. **Load-bearing in B that A has no answer for:** nothing in the plumbing — but keep B's seed/counter/cascade machinery alive *only if* you also keep existence-by-inference. If the merge adopts explicit group-instance storage, all of `lib/state.js:84-95, 139-157, 172-184` (the counters and the cascade) becomes dead weight, which is itself an argument for explicit instances.
