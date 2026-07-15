# L1 — Session and state management — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root:  `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

## Headline

**This dimension barely exists on Side B, and that is a deliberate, documented choice.**
The entire persistence story is `lib/state.js` — 232 LOC of thin `@hapi/yar` session wrappers
over **three** session keys. There is no backend call, no Mongo, no notification mapper, no
submit, no user scoping, no journeyId, no concurrency control, no write-back of the evaluator's
amended state, and no request-scoped memoisation. `obligations.md` says so plainly:

> "The spike itself uses in-memory state via the frontend session; the persistence contract
> above is the intended shape for a real deployment." — `obligations.md:2017-2019`

What IS interesting on Side B is not the plumbing but the **state SHAPE** and the **derivation
posture**: a single flat map keyed by obligation UUID, composite `/`-delimited keys for depth,
zero derived state persisted, and collection-instance existence *inferred* from key prefixes
rather than stored as a list. That shape is the transferable asset. The plumbing is not.

There is also one **real code/doc divergence with user-visible teeth** (§6): the doc promises
scope-exit purges are persisted ("the orchestrator persists the amended set — it becomes the
new source of truth", `obligations.md:2039-2040`); the code never writes the amended set back,
so purged answers survive in the session **and continue to feed `applyTo` gate predicates**.

---

## 1. Where answers live in flight

`@hapi/yar` server-side session, provided by the **host frontend**, not the spike:

- `src/server/common/helpers/session-cache/session-cache.js:10-27` — the yar plugin registration.
- `src/config/config.js:121-146` — `session.cache.engine` = `redis` in production, `memory`
  otherwise (`default: isProduction ? 'redis' : 'memory'`); `ttl` = 4 h; cookie ttl = 4 h.
- The spike itself registers nothing. It just uses `request.yar`.

Three keys, all constants, all fixed strings — no journey namespacing:

```js
export const SESSION_KEY = 'prototype:eudpa-249:fulfilments'
export const NEXT_LINE_ID_KEY = 'prototype:eudpa-249:next-line-id'
export const NEXT_UNIT_ID_BY_LINE_KEY = 'prototype:eudpa-249:next-unit-id-by-line'
```
— `lib/state.js:13-16`

Consequence: **exactly one in-flight journey per browser session.** No journey list, no
journeyId, no "your draft notifications" page. The doc's persisted-document sketch
(`obligations.md:1988-2002`) *does* have `journeyId` / `status` / `createdAt` / `submittedAt` —
none of it is implemented.

## 2. Read/write path — 13 functions, one seam

`lib/state.js` exports 9 functions (+4 private id-counter helpers). Discipline is enforced by
convention and holds: **no controller touches `request.yar` directly** (grep across the spike
returns `request.yar` only inside `lib/state.js` and its test).

| fn | line | what it does |
|---|---|---|
| `readFulfilments` | :26-28 | `request.yar?.get(SESSION_KEY) ?? {}` — raw storage |
| `writeFulfilments` | :30-32 | `request.yar?.set(SESSION_KEY, fulfilments)` |
| `readState` | :42-44 | `evaluateState(readFulfilments(request))` — **the only read controllers use** |
| `writeAnswer` | :50-78 | applies one page's coerced `values` into the map |
| `addCommodityLine` | :97-118 | mints `lineN`, seeds a `''` placeholder on `commodityCode` |
| `deleteCommodityLine` | :120-162 | drops line leaves + cascades every `lineN/...` key |
| `addUnitRecord` | :186-204 | mints `unitN`, seeds `''` at composite key `lineN/unitN` |
| `deleteUnitRecord` | :206-222 | drops every leaf at `lineN/unitN` |
| `resetState` | :228-232 | clears all three keys |

Call sites: **15 `readState`**, **3 `writeAnswer`** (page-controller:90, line-page-controller:126,
unit-page-controller:162), 1 `resetState`. Write-through is immediate and synchronous — every
POST writes the session before redirecting (`page-controller.js:90-93`).

**Read path is: session → evaluator → view.** `readState` returns the evaluator's output
`{ fulfilments, obligations }` (`evaluator.js:123-126`), where `fulfilments` is the *amended*
(purged) map and `obligations` is the per-obligation implication map. Every engine primitive and
every controller renders from that amended map (`engine/index.js:158,192,327,421,526` all read
`state.fulfilments`), so **the UI is always consistent with the model**. The divergence is purely
in what is persisted (§6).

## 3. State SHAPE — flat map, composite keys, zero derived state

Declaratively modelled. This is Side B's strongest contribution on this dimension.

```jsonc
fulfilments = {
  commodityCode:    { line1: '0101', line2: '010410' },
  unitRecord:       { 'line1/unit1': {} },
  permanentAddress: { 'line1/unit1': { name: 'Fido', ... } },
  passport:         { 'line1/unit1': 'GB123456' }
}
```
— `obligations.md:1160-1171` (outer keys shown as `name`; real storage keys by UUID `id`)

Four properties, each load-bearing:

1. **Keyed by opaque UUID `id`, not by `name`** (`obligations.md:2056-2073`). Renaming a field is
   a code-only change; storage is untouched. `id` is the persistence key, `name` is the
   developer/i18n/template surface.
2. **Depth is a flat composite string key**, `/`-delimited — "the evaluator never nests storage
   under composite paths" (`obligations.md:1152-1154`). Delimiter is duplicated as a private const
   in two places (`evaluator.js:40`, `state.js:20`) with a comment tying them together.
3. **Groups have no storage of their own.** A commodity line "exists" iff some descendant leaf has
   a key prefixed `lineN`. Enumeration is by prefix scan
   (`evaluator.js:390-421 enumerateGroupFulfilmentIds`). This is why `addCommodityLine` must *seed
   a placeholder empty string* to make a line exist at all (`state.js:110-114`).
4. **Nothing derived is persisted.** Status, applicability, next-page, task-list state are all
   recomputed per request from `fulfilments` + the current model — "Recomputing is cheap (the
   evaluator + primitives are pure sync) and it avoids the schema-migration overhead of storing
   derived state that can go stale" (`obligations.md:1980-1986`). There are **no `visited` flags**
   anywhere; engagement is measured as "≥1 non-blank value" (`obligations.md:2198`).

Not an event log. Not a nested object. A flat CRDT-ish key/value map whose keys encode structure.

## 4. Resume — declarative, and genuinely nice

There is no "resume" bookkeeping at all. Resume is a *derivation*:

```js
export function startPage(state) {
  for (const section of flow.sections) {
    const unfulfilled = firstUnfulfilledPage(section, state)
    if (unfulfilled) return unfulfilled
  }
  ...
}
```
— `contract.js:101-111`; `GET /start` → `features/start/controller.js:19` → redirect.

Same mechanism, line- and unit-scoped, for `nextAfterForLine` / `nextAfterForUnit`
(`contract.js:135-161`). Because no visited/step state exists, deep-linking to any URL is always
safe and there is nothing to keep in sync. Settled explicitly at `obligations.md:2793-2798` (P.3/P.4).

## 5. Self-heal — two mechanisms, both view-only

- **Model drift (tolerate-and-amend):** `dropUnknownFulfilments` (`evaluator.js:227-235`) silently
  drops fulfilments whose obligation id is no longer in the manifest. "There is no version stamping
  on the persisted Journey. The evaluators always run against the current model." (`obligations.md:2021-2028`).
- **Scope drift (purge):** `purgeStorage` (`evaluator.js:333-379`) drops out-of-scope obligations
  entirely and filters derived-leaf records to the `applyTo`-authorised id set.

Both produce an **amended** map that is returned but **never written back** — see next section.

## 6. THE FINDING — the purge is never persisted (code contradicts doc)

The doc is unambiguous in three places:

- `obligations.md:2039-2040` — "**The orchestrator persists the amended set — it becomes the new
  source of truth.**"
- `obligations.md:617-621` — appliesWhen: "any stored fulfilment is **purged** from the amended
  fulfilments"; `:659-661` — "`appliesWhen` fields disappear on scope exit; **their prior values
  vanish**".
- `obligations/obligations.js:210-212` — "// Purge-on-flip: when reasonForImport is not
  'internal-market', purposeInInternalMarket goes out of scope and **any stored value is dropped**."

The code does no such thing. `readState` (`state.js:42-44`) discards the amended map after
rendering, and every mutator re-reads **raw** storage:

```js
export function writeAnswer(request, values) {
  const fulfilments = { ...readFulfilments(request) }   // ← RAW yar, not state.fulfilments
```
— `state.js:50-51` (same at `:102`, `:121`, `:187`, `:208`)

`writeFulfilments` has exactly 5 call sites, all inside `state.js`, all fed from `readFulfilments`.
**Nothing anywhere writes `state.fulfilments` back to the session.**

Two consequences, both real:

1. **Rehydration on flip-back.** Answer `purposeInInternalMarket`, change `reasonForImport` to
   `transit` (value disappears from the UI), change it back to `internal-market` → the old value
   returns. The doc says it must not (`obligations.md:1129-1130` "re-added after a previous remove
   → fresh blank again (no rehydration)"). Untested: `routes.test.js:325-360` covers the flip in
   one direction only; there is no flip-back test anywhere in the 649 test declarations.
2. **Worse — purged values still drive gates.** `applyTo` closures are evaluated at step 3 against
   `recognisedFulfilments`, i.e. **pre-purge raw storage** (`evaluator.js:80-84`:
   `o.applyTo(recognisedFulfilments, preEnumeratedGroupPaths)`). In a design where the amended set
   is persisted, raw == amended at the start of the next request and the distinction is invisible.
   Here raw never converges on amended, so a value the model believes it purged keeps feeding
   scope decisions for *other* obligations (e.g. the `anyDocumentFieldPresent` all-or-nothing gate
   at `obligations.js:754`, or any `anyAllowListed` quantifier over commodity codes) on every
   subsequent request, forever.

Fix cost: one line (`writeFulfilments(request, state.fulfilments)` after evaluate, or make
`readState` write-through). It is *cheap*, but it is currently **wrong**, and the doc's confidence
about purge semantics is not backed by the running system. That matters because purge semantics
are one of the model's headline claims.

## 7. Per-user scoping, concurrency, staleness — absent

- **Per-user scoping: none.** All prototype routes are `auth: false` (`routes.js:46`
  `const PUBLIC = { auth: false }`). State is scoped to the *session cookie*, not to a user. No
  `userId` on the state; the doc parks it as a "forward extension" (`obligations.md:2009-2010`).
- **Concurrency: none.** No version stamp, no ETag, no optimistic lock. `writeAnswer` is a
  read-modify-write over the whole map; two tabs racing = last-write-wins with silent clobber of
  the loser's whole map. Not mentioned in the docs at all.
- **Staleness: explicitly deferred.** `obligations.md:2159-2176` sets out the requirement (must be
  uniform across user-entered and system-handled answers) and `§K` (`:2759-2774`) records two
  candidate shapes (per-obligation TTL vs freshness-activation predicate) and defers: "Deferred
  pending a concrete staleness case." **Not implemented.**
- **Submit: absent.** `journeyState(flow, state, submitted = false)` (`engine/index.js:583-584`)
  takes a `submitted` flag; both call sites (`features/hub/controller.js:121`,
  `features/check-your-answers/controller.js:342`) call `statusOfJourney(state)` with no flag. The
  `SUBMITTED` status is unreachable in the running app.

## 8. One-load-per-request memoisation — absent (and slightly worse than that)

There is **no** request-scoped cache. No `request.app`, no `server.ext`, no memo — grep for
`request.app|server.ext|onPreHandler|memo|cache` across the spike returns only the *intra-call*
`inScopeCache` inside a single `evaluate()` (`evaluator.js:295-325`) and two doc lines.

Every `readState` re-runs the full 7-step pipeline over all 44 obligations. A successful POST runs
it **twice**:

```js
writeAnswer(request, result.values)
const stateAfter = readState(request)     // ← second full evaluation
const target = nextAfter(page, stateAfter)
```
— `page-controller.js:90-92` (identical at `line-page-controller.js:126-127`,
`unit-page-controller.js:162-163`; the POST-error branch also evaluates once at `:67`)

Session I/O itself *is* one-load-per-request, but that comes free from yar (which loads the session
once and flushes at response end), not from anything the spike does. Cheap to fix (memoise on
`request.app`), structurally trivial. At 44 obligations it is not a real perf problem yet — it is
a *design absence*, not a design flaw.

## 9. Add-another id minting — the one bit of genuine care

Session-monotonic counters in their own yar keys, never decremented on delete:

- `readNextLineId` / `writeNextLineId` (`state.js:89-95`); `NEXT_UNIT_ID_BY_LINE_KEY` is a
  per-line map (`state.js:172-184`).
- Rationale quoted in the source: "Kept in its own yar key rather than derived from current
  fulfilments so a Delete cannot recycle the id — silent rehydration of any per-line state whose
  obligation is missing from `LINE_LEAF_OBLIGATIONS` would otherwise be possible." (`state.js:84-88`;
  echoed at `RECOMMENDATION.md:454-460`).
- Belt-and-braces prefix cascade on line delete (`state.js:139-157`) purges every `lineN/...`
  composite key across **every** obligation, not just the ones the caller listed.
- Display labels use ordinal position, not internal id, so non-recycled ids never leak
  (`features/units/controller.js:121-130`).

Tested: `lib/state.test.js` — 8 cases (4 add-unit, 3 delete-unit, 1 delete-line-cascade), using a
hand-rolled in-memory yar double (`state.test.js:26-38`).

## 10. Structural risk in the shape: instance existence is inferred, so a gate flip can delete a collection instance

Because a group instance exists only if a descendant leaf has a matching key prefix, and because
`purgeStorage` drops leaves whose obligation goes out of scope, **changing a commodity code can
silently annihilate unit records seeded on a now-out-of-scope obligation.** `addUnitRecord` seeds
on "the first WIRED unit-scoped obligation the line's commodity code opens"
(`features/units/controller.js:186-222`); if the user then changes the code so that obligation
closes, the seed leaf is purged and — if no other unit leaf holds a value — the unit vanishes from
`state.obligations[unitRecord].records`. The source acknowledges the milder version of this: "after
a delete **or a commodity-code change that purges an earlier seed**, the surviving units can have
internal ids like unit2 + unit3" (`features/units/controller.js:124-127`).

This is a direct consequence of "groups have no storage of their own". The fix is to give groups a
real storage entry (`commodityLine: { line1: {} }`, which the doc's own example at
`obligations.md:1164` actually shows, contradicting `:1173-1174`) — but that is a change to the
evaluator's enumeration contract, not a controller tweak.

---

## Retrofit shopping list (what a third option should take, and what it costs)

**Take:**
1. **Flat, UUID-keyed, composite-key fulfilments map with zero derived state persisted**
   (`obligations.md:1141-1186`). Cost: near-zero if adopted at the start; it is a data-shape
   decision, not code. Buys: free renames, free depth-N, no migration of derived state, and a
   persisted document that is trivially diffable.
2. **Resume-by-derivation** (`contract.js:101-111`) — no visited flags, ever. Cost: requires the
   engine to be able to answer "first unfulfilled" cheaply, which it can because evaluation is pure.
3. **Session-monotonic, never-recycled instance ids + prefix cascade on delete**
   (`state.js:84-88,139-157`). Cost: two extra keys. Buys: immunity to a whole class of
   rehydration bug.

**Do not take (or take with eyes open):**
4. **Group-instance-existence-by-inference.** Elegant, but it makes collection instances a
   side-effect of leaf storage and lets a scope flip delete a user's record (§10). If persistence
   is real (records in a backend), pay for an explicit instance entry.
5. **The purge-without-write-back** (§6). If the amended set is the source of truth, *write it*.
   One line, and a test that flips a gate back.

**Everything else on this dimension has to be built from scratch on Side B**: backend persistence,
mappers, submit, amend/resubmit, per-user scoping, journey list, concurrency, staleness, audit of
silent drops ("Purges are silent by design… the **orchestrator** is the intended log point" —
`obligations.md:674-679`). None of it is *structurally* blocked — the model is agnostic to where the
fulfilments map is stored, and that is precisely the point of the design. But none of it exists, so
none of it is *evidence* for the model either.
