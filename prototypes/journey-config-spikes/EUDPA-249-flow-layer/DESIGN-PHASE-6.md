# Phase 6 design gate — persistence + submit + parity layer

**Status:** draft, awaiting Paul's scope decision.
**Scope:** Phase 6 of the EUDPA-288 blend plan (see [PLAN.md §10](./PLAN.md)).
**Baseline:** SHA `f9187fd` (post Phase 5 defer).

---

## 1. What Phase 6 was meant to accomplish

BRIEF §Migration #6:

> Build the persistence + submit + parity layer, reusing A's mappers and both harnesses against a UUID→path table declared once on the obligation (L, ~3–4wk).

BRIEF §Keep from A:

> Both notification mappers + the **two model-agnostic parity harnesses** (`skeleton-equivalence.test.js` is an executable oracle).

REPORT §5.2:

> Save-and-return (draft-resume) is a model gap on both sides, build-state only on A. Neither obligations model expresses a draft or a return point; A _has_ drafts, multi-draft dashboard and resume-by-reference, but as build-state (a persistence layer), and B has no journey identity, no draft record and no submit route at all. So "take A's save-and-return" means taking A's persistence layer wholesale — there is no model-level save-and-return to port because there is none to port.

REPORT §5.1 warns:

> `skeleton-equivalence.test.js` is an executable oracle that would work against B's mapper the day one exists.

## 2. What currently exists (baseline)

- **Records port abstraction** landed in Phase 4.1 (SHA `c94c00c`) — `services/persistence/records/{index.js, stub.js, records-port.test.js}`. In-memory stub only; contract test pins delete-by-omission.
- **Persistence lifecycle** — grep confirms: 0 mentions of `journeyId` in production code, 0 submit route, 0 `submitted` flag. B is GET-only today.
- **Yar session storage** (`lib/state.js`) — flat fulfilments map, no journey identity, no envelope.

## 3. What A has that Phase 6 would port

Survey of `origin/spike/EUDPA-249-prototype-layouts` under `services/persistence/`:

| File                                                | LOC                                | Purpose                                                       |
| --------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| `records/notification-mapper.js`                    | **507**                            | V4-shaped output mapper (fulfilments → skeleton notification) |
| `records/notification-mapper.test.js`               | ~                                  | Unit tests                                                    |
| `records/skeleton-equivalence.test.js`              | **238**                            | Parity harness (executable oracle)                            |
| `records/real.js`                                   | ~                                  | Real Mongo backing                                            |
| `records/real.integration.test.js`                  | ~                                  | Live-Mongo integration                                        |
| `records/real.amend-list.test.js`                   | ~                                  | Amend flow lifecycle                                          |
| `records/real.no-resume-by-user.test.js`            | ~                                  | Resume behaviour                                              |
| `records/real.null-echo.test.js`                    | ~                                  | Edge cases                                                    |
| `records/mapper.js`                                 | ~                                  | Record shape adaptation                                       |
| `records/stub.js`                                   | (already ported to B in Phase 4.1) | In-memory backing                                             |
| `records/index.js`                                  | (already ported to B in Phase 4.1) | Facade                                                        |
| `session/index.js`                                  | ~                                  | Session facade                                                |
| `session/real.js`                                   | ~                                  | Real Redis session                                            |
| `session/real.redis.integration.test.js`            | ~                                  | Redis integration                                             |
| `session/real.test.js`                              | ~                                  | Session unit tests                                            |
| `session/session.test.js`                           | ~                                  | Session contract                                              |
| `session/stub.js`                                   | ~                                  | In-memory session                                             |
| `engine/persistence/records.js`                     | 48                                 | Engine-side consumer of records port                          |
| `engine/persistence/session.js`                     | ~                                  | Engine-side session consumer                                  |
| `engine/store.js` + `engine/store-contract.test.js` | ~                                  | Store contract                                                |

Substantial surface. The two load-bearing artefacts BRIEF names are: **`notification-mapper.js` (507 LOC)** and **`skeleton-equivalence.test.js` (238 LOC)**.

## 4. Scope splits — what's essential vs useful vs optional

Phase 6 is not monolithic. Three natural sub-scopes:

### 4a. **Essential — proves the model can produce V4 output** (M, ~1wk, 3 commits)

- **UUID→path table** declared once on the obligation. Minimal wiring — where in an obligation is this? Best fit: a top-level `pathInNotification: 'header.regionCode'` (or similar) key on each obligation that surfaces in the notification. Boot-time assertion: every notification-surfacing obligation has a path.
- **Port A's `notification-mapper.js`** (507 LOC). Adapt to B's obligation ids. Consumes `pathInNotification` + evaluator output → produces V4-shaped notification.
- **Port `skeleton-equivalence.test.js`** (238 LOC). The executable oracle — run over fixture inputs; assert B's mapper produces byte-identical output to A's mapper for equivalent inputs.

**Value:** proves B's model can drive the same wire contract A does. Highest evidentiary value per line of Phase 6. If this passes, the model is validated for production shape.

**Doesn't include:** actual persistence backing (in-memory stub is fine); no submit route; no lifecycle.

### 4b. **Useful — real persistence + submit** (M–L, ~2wk, 3 commits)

- **Real backing for the records port** — port A's `real.js` (or a simpler Mongo adapter). Needs Mongo running; needs docker-compose stack. Or: extend the stub to persist to disk (simpler; no infrastructure dependency).
- **`journeyId` on every mutation** — introduce a per-journey scope key so multiple journeys can coexist. B's yar session currently assumes one journey per session.
- **Submit route + `submitted` flag** — POST /submit; transitions journey to submitted state; blocks further edits.

**Value:** makes B a real prototype rather than a session-scoped demo. Lets you demo persistence-across-sessions + a real submit action.

**Doesn't include:** amend-and-resubmit; multi-draft; resume-by-reference.

### 4c. **Optional — lifecycle nice-to-haves** (M, ~1wk, 3 commits)

- **Draft record** — journey enters `draft` state on start; only transitions to `submitted` on POST /submit.
- **Resume-by-reference** — user provides a journeyId, session recovers the draft. Requires stable identity + persistence.
- **Amend-and-resubmit** — submitted journey can be amended (transitions back to `draft`), then resubmitted. Non-trivial: needs status re-gating.
- **Multi-draft dashboard** — user sees a list of their in-progress + submitted journeys.

**Value:** matches A's shipped lifecycle. But none of it is needed to prove the model — A's `resume-self-heal.test.js` pinned resume behaviour on A's side; B could port that test if resume-by-reference is picked.

**YAGNI check:** are these needed to make the spike valuable? Probably not. They're A's business-logic features, not model-shape validation. Fair candidates for the same defer-and-document treatment we gave Phase 5.

## 5. Design decisions

### 5.1 Where does `pathInNotification` live?

Options:

- (a) **Top-level obligation key** — `pathInNotification: 'header.regionCode'`. Uniform across every notification-surfacing obligation.
- (b) **On a `notification: { path: '...' }` sub-object** — namespaced. Room to grow (e.g. `notification: { path, transform, omit }`).
- (c) **In a separate manifest** — `notification-paths.js` maps obligation.id → path. Decouples the obligation from its wire representation.

**Recommendation:** (b). Namespaced but on-obligation. Consistent with `requires`, `applyTo`, `dependsOn` pattern. Room to grow when a notification-transform helper is needed.

### 5.2 Mapper port strategy

Options:

- (a) **Copy verbatim, adapt at obligation-id lookups.** Preserves A's shape. Fastest port.
- (b) **Rewrite from scratch using `pathInNotification` metadata.** Cleaner; may miss edge cases A's mapper handles.
- (c) **Copy skeleton, delete A-specific paths, rebuild by iterating over B's obligations.** Middle ground.

**Recommendation:** (a). BRIEF says "reusing A's mappers". Preserve A's decision tree; only adapt the id lookups. `skeleton-equivalence.test.js` will catch any semantic drift.

### 5.3 Real persistence backing choice (if 4b happens)

Options:

- (a) **Port A's `real.js` (Mongo)** — full parity. Needs Mongo in docker-compose stack; more setup.
- (b) **File-based stub** — persists to `.workareas/<journeyId>.json`. No infrastructure dependency. Not production-shape but validates journey lifecycle.
- (c) **In-memory keyed by journeyId** — journeys persist within a running process, lost on restart. Simplest.

**Recommendation:** (b). File-based hits the goldilocks zone — real persistence semantics without Mongo dependency. Can swap to Mongo later without changing the port.

### 5.4 `journeyId` allocation

Options:

- (a) **UUID minted on `/start`** — same as A.
- (b) **User-provided reference number** (like A's `GBN-AG-YY-XXXXXX`) — human-friendly.
- (c) **Session-derived** — hash of user + timestamp.

**Recommendation:** (a) for now. Reference-number generation is a separate concern that A also does; can port A's minter if needed.

### 5.5 Backwards-compat expectations

Phase 6 is largely additive — B has nothing today, so there's little to break. Two exceptions:

- The `lib/state.js` `readState` / `writeFulfilments` shape adds a `journeyId` scope. Currently a single-journey session-keyed blob; needs to become journey-keyed within a session that carries a `journeyId`.
- `dump.js` / `contract.js` may read state without a `journeyId` today; needs a fallback (use a "default" journey id, or reject).

## 6. Sequencing options

**Option A — Scope 4a only** (M, ~1wk, 3 commits). Land mapper + parity. Stop. Bank the "model produces V4 output" proof.

**Option B — Scope 4a + 4b** (L, ~3wk, 6 commits). Add real persistence + journeyId + submit. Skip lifecycle nice-to-haves. Solid prototype.

**Option C — Full Phase 6** (~4wk, 9 commits). All three sub-scopes. Matches BRIEF's ~3–4wk estimate.

**Option D — Scope 4a + Sam-driven 4b/4c**. Do 4a now; consult Sam on 4b/4c before committing.

## 7. Open questions for Paul

1. Which sub-scope split (§4a / +4b / +4c / defer entirely)?
2. Is Mongo dependency acceptable, or file-based backing preferred?
3. Should `journeyId` be UUID or a human-friendly reference?
4. Is `skeleton-equivalence.test.js`'s value load-bearing (i.e. do we want to prove B's mapper matches A's byte-for-byte), or just "close enough" (mapper works, structural equivalence not asserted)?
5. If 4c is deferred: same defer-and-document treatment as Phase 5? (Update DESIGN-PHASE-6.md with a §10, add a link from PLAN.md.)

## 8. Estimated commit list (Option B — 4a + 4b)

★ **feat(EUDPA-288): notification: sub-object on obligations + boot-time path assert** (Phase 6.1)
★ **feat(EUDPA-288): port A's notification-mapper.js, adapted to B's obligation ids** (Phase 6.2)
★ **test(EUDPA-288): port skeleton-equivalence.test.js parity harness** (Phase 6.3) — this is the load-bearing pin
★ **feat(EUDPA-288): journeyId + records-port scope key** (Phase 6.4)
★ **feat(EUDPA-288): file-based records-port backing (real.js)** (Phase 6.5)
★ **feat(EUDPA-288): POST /submit + submitted flag** (Phase 6.6)

**HALT 6** — walkthrough with Paul. Decision point on 4c (lifecycle nice-to-haves) or fold branch back to main.

## 9. What is NOT in this brief

- The exact UUID→path mapping for each of the 44 obligations. That's a per-obligation exercise done during Phase 6.1; will need V4 spec lookup for many.
- The Mongo schema (if 4b picks Mongo). Deferred to whichever backing is chosen.
- The UI copy for the submit + submission-received screens. Copy work, not model work.
- Error handling for network / persistence failures. Standard cross-cutting concern; not phase-specific.
