# L3 adversarial verification — PM-5 (persistence-mapping)

**Claim:** Recompute-on-load / persist-answers-only is CONVERGENT, not B's unique asset.
**Verdict: AMENDED.** The central assertion survives — and is in fact *stronger* than stated,
because B's own "persists the amended set" turns out to be doc-only. But "A has the identical
property" is imprecise in two verifiable ways, one of which lands squarely on the claim's own
nominated destroyer ("show A persists ... navigation ... durably").

---

## 1. Did the cited evidence say what the claim says?

### A: `engine/resume-self-heal.test.js`

Verified, verbatim.

- `:38-45` — `expect(Object.keys(result.journey).sort()).toEqual(['answers','createdAt','journeyId','status','submittedAt','userId'])`.
  The test name is *"Should store only the canonical record fields — nothing derived is persisted"*.
  `status`/`submittedAt` are lifecycle, not derived-from-answers. Quote is real, means what the claim says.
- `:18-30` — writes `{countryOfOrigin, regionOfOriginCodeRequirement:'no', regionOfOriginCode:'FR-75'}`
  straight through `records.saveAnswers`, then asserts `scope.has('regionOfOriginCode') === false`
  and `scope.has('countryOfOrigin') === true`. Real. This is a genuine "stale stored answer +
  changed rules" simulation, and scope re-derives correctly.

Independently corroborated — every derived quantity is recomputed per request, none stored:

| Derived thing | Where it is computed | Stored? |
|---|---|---|
| scope | `engine/read.js:28` — `makeScope` runs `reconcile(answers)` on every read | no |
| section status | `engine/status.js:59` — `statusOf(parts, answers, inScope)`, a pure fn | no |
| completeness | `readyForCheckYourAnswers(answers, inScope)`, injected, called inside `makeScope` (`read.js:33`) | no |
| navigation gates | `flow/gates.js` / `flow/navigation.js`, from `inScope` (per `docs/scope-and-wipe.md:123-145`) | no |

And A writes the doctrine down — `docs/scope-and-wipe.md:147-156`, *"Nothing derived is ever
stored ... Every read rebuilds scope fresh"* — and, checked against the code, **honours it**.
This is not a doc credited over code.

### B: `contract.js:50`, `lib/state.js`, `evaluator.js`

- `contract.js:50-52` — `evaluateState(fulfilments) { return evaluator.evaluate(fulfilments ?? {}) }`. Real, fresh per request.
- `lib/state.js` — writes only `SESSION_KEY` (fulfilments) + `NEXT_LINE_ID_KEY` + `NEXT_UNIT_ID_BY_LINE_KEY` (`:13-16`). Real.
- `evaluator.js:24, 61-65` — step 1 "Drop unknown obligation ids (tolerate-and-amend)". Real.
- `evaluator.js:93-99` — step 5 `purgeStorage(...)` → `amendedFulfilments`. Real.

So the cited quotes are all real. The claim is not built on a misquote.

---

## 2. Counter-example hunt on A — "show A persists derived state (statuses, navigation, completeness) durably"

I searched A's entire persisted surface. There are exactly two durable stores: the **record**
(6 keys, pinned) and the **session** (3 keys).

- statuses — **NOT persisted.** `engine/status.js` is a pure function; no store, no cache.
- completeness — **NOT persisted.** Computed inside `makeScope` on every read.
- navigation — **PARTIALLY PERSISTED. This is the hit.**

`flow/run-state.js:9-24` persists an opening-run record `{ journeyId, phase: 'active'|'complete' }`
through the SESSION port:

```js
export const beginOpeningRun = async (request, h) => {
  const { journeyId } = await currentJourney(request, h)
  await session.setOpeningRun(h, { journeyId, phase: RUN_ACTIVE })
}
```

Durable in both modes — signed base64json cookie in stub (`services/persistence/session/stub.js:41-47`;
cookie registered `engine/journey.js:29-32`), `yar`/Redis in real (`services/persistence/session/real.js:39-45`).

A's own doc concedes exactly the point: `docs/flow-and-gates.md:106` —
*"COMPLETION is a session record `{ journeyId, phase: active|complete }` ... **It cannot be derived
from answers**: a zero-record identification pass leaves no footprint, and importType never
survives a real-mode round-trip."*

So A does **not** literally "recompute everything else on load". It stores one navigation fact
because it *cannot* recompute it.

**How much does this hurt?** Honestly: not much, but the claim must be narrowed.
`{journeyId, phase}` is *primary* state, not stale-able derived state — it names no obligation and
no page id, so no model change can invalidate it. And B is not clean either: B's session carries
two non-derivable id counters, kept deliberately outside the fulfilments map so a delete cannot
recycle an id (`lib/state.js:14-16, 84-95`). Both sides are therefore "answers + a small envelope
of non-derivable session state", not "answers alone". Near-symmetric — but the claim's absolutist
wording is false for A, and it is false at precisely the word ("navigation") the claim itself
nominated as its destroyer.

Also checked and cleared:
- Does A cache a derived label in `answers` (e.g. looked-up commodity name)? The mapper has a
  `commodityNameFor(code)` *reverse-recovery* path (`notification-mapper.js:391-393`), i.e. it
  re-derives the name on read rather than depending on a stored one. Not a counter-example.
- Does A's record carry a `status` that duplicates derived completeness? No —
  `services/persistence/records/stub.js:38,75,86` shows `status` only ever takes
  `IN_PROGRESS`/`SUBMITTED`, the lifecycle axis. Not derived.

---

## 3. The find that runs the *other* way: B's "amended set" is never persisted

L1-B's strongest sentence — *"The orchestrator persists the amended set"* (`obligations.md:461-465`)
— is a **doc claim the code does not honour.** I traced every writer.

`evaluate()` does return the amended map:

```js
// 5. Purge storage.
const amendedFulfilments = purgeStorage(recognisedFulfilments, {...})
...
return { fulfilments: amendedFulfilments, obligations: implicationsByObligation }
```
(`obligations/evaluator.js:93-99, 123-126`)

But nothing writes it back:

- `lib/state.js:42-44` — `readState(request) { return evaluateState(readFulfilments(request)) }`.
  Hands the amended map to the controller. **Does not call `writeFulfilments`.**
- Every writer re-reads the **raw** stored map, not the amended one:
  `const fulfilments = { ...readFulfilments(request) }` at `lib/state.js:51` (`writeAnswer`),
  `:102` (`addCommodityLine`), `:121` (`deleteCommodityLine`), `:187` (`addUnitRecord`),
  `:208` (`deleteUnitRecord`) — then `writeFulfilments` at `:76, :115, :161, :201, :221`.
- `grep -rn "writeFulfilments"` across the whole Side-B spike returns **only** those call sites
  inside `lib/state.js`, plus one **commented-out** line in `controller-sketch.js:98`.

**Consequence:** an out-of-scope fulfilment stays in B's durable store *for ever*. It is purged
from the per-request projection and is therefore invisible — but it is never removed from storage,
and a subsequent write copies it forward. B's tolerate-and-amend is a **read-time filter, not a
storage amendment**.

This is the single most important thing I found, and it *strengthens* PM-5: the "B gets schema
migration free, A would need a migration script" framing rests on a sentence in `obligations.md`
that the code does not implement.

---

## 4. Where the two purges genuinely differ (so "identical property" is wrong)

| | Side A | Side B |
|---|---|---|
| Derived state persisted | none in record (pinned); one non-derivable navigation record in session | none in store; two non-derivable id counters in session |
| Unknown / deleted obligation ids | dropped **implicitly** — `registry.walk` visits only known obligations, so an orphan answer key is invisible to reconcile/scope/status (`engine/evaluate/reconcile.js:7`, `engine/read.js:19`). Never removed from storage. | dropped **explicitly** from the projection (`evaluator.js:24, 61-65`). Never removed from storage. |
| Out-of-scope values | purged from the **durable document**: `reconcile` names them, `destroyWiped` deletes them, then `saveAnswers` (`engine/write.js:14-16, 57-59, 74-76`) | purged from the **projection only**; storage keeps them (§3) |
| Purge trigger | **write** only. `engine/read.js` calls `reconcile` but takes `inScope` and discards `wiped` — a GET never purges. | **every read**. Total. |
| Purge coverage | **opt-in per obligation** — the wiped set is filtered on `obligation.wipeOnExit` (`engine/evaluate/reconcile.js:32-39`) | **unconditional** — any out-of-scope obligation's entry is dropped |

Two consequences worth carrying to the shopping list:

1. **A actually needs its store purge; B does not.** A's mapper reads raw `answers` and never
   consults scope — I grepped `services/` for `scope|makeScope|inScope` and the only hits are two
   *test* files (`real.amend-list.test.js`, `notification-mapper.test.js`); no production service
   references scope. So an out-of-scope value left in `answers` would be **mapped and transmitted
   to the backend**. `destroyWiped` is what prevents that. B has no backend, and every B consumer
   goes through `evaluateState`, so B is safe by projection alone.
2. **A's safety rests on an unenforced convention.** Today it holds exactly: 15 `activatedBy` sites
   across `features/*/obligations.js` and 15 `wipeOnExit: true` sites, 1:1. But **no test asserts
   `activatedBy ⇒ wipeOnExit`**. Add a gated obligation and forget the flag and you get a silent
   out-of-scope leak into the notification. B's model cannot make that mistake — there is no flag
   to forget.

---

## 5. "Not built" vs "cannot be built"

Neither side has a structural bar here. A *could* move `destroyWiped` to the load path and make it
unconditional (delete the `wipeOnExit` filter); B *could* call `writeFulfilments(request,
state.fulfilments)` after `readState` in one line. Both are unbuilt, not impossible. So this is a
convergence-plus-shopping-list finding, not an asymmetric-capability finding — which is exactly
what PM-5 asserts.

---

## What I searched

- Read: `engine/resume-self-heal.test.js`, `engine/write.js`, `engine/read.js`, `engine/journey.js`,
  `engine/status.js`, `engine/evaluate/reconcile.js`, `services/persistence/session/{stub,real}.js`,
  `services/persistence/records/stub.js` (status lines), `flow/run-state.js`,
  `docs/scope-and-wipe.md`, `features/origin/obligations.js`, `features/transport/obligations.js`.
- Read: B's `lib/state.js` (all 232 lines), `obligations/evaluator.js:1-139`, `contract.js:40-69`.
- `grep -rn "openingRun"` across A → the run-state / session / docs set above.
- `grep -rn "activatedBy"` vs `grep -rn "wipeOnExit"` across `A/features` → 15 vs 15, 1:1.
- `grep -rln "makeScope|inScope|scope"` across `A/services` → **test files only**; no production
  service consults scope (this is what makes A's write-time purge load-bearing).
- `grep -rn "writeFulfilments|readFulfilments"` across the whole B spike → the decisive §3 result.
- `grep -rn "evaluateState|writeFulfilments|amended"` in B's `contract.js` → only the definition.
