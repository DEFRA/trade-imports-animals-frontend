# L3 adversarial verification — conditionality-gating C4

**Claim:** B's wipe is a read-time projection never persisted; orphans rot in yar; a
gate flipped false→true resurrects the old answer; B's docs promise the opposite in
three places. A persists the post-wipe answers and exports no delete primitive, so a
page physically cannot hand-roll a wipe or fake scope.

**Verdict: AMENDED.** The mechanical core survives. Three of the claim's supporting
struts do not: the doc-contradiction framing, the build-field-descriptors evidence
line, and the "A physically cannot" assertion.

---

## 1. What the source actually shows (the part that holds)

`lib/state.js:42-44`

```js
export function readState(request) {
  return evaluateState(readFulfilments(request))
}
```

`contract.js:50-52` → `evaluator.evaluate()` → `evaluator.js:123-126` returns
`{ fulfilments: amendedFulfilments, obligations }`. So `state.fulfilments` IS the
post-purge map. `readState` hands it to the controller and **never writes it back**.

I grepped the whole spike for any other session writer:

```
grep -rn --include="*.js" "writeFulfilments|state\.fulfilments|readState\(|yar\." <spike>
```

Result: **`request.yar.set` appears in exactly one non-test file — `lib/state.js`.**
No hapi `ext`/`onPreResponse` hook, no middleware, nothing else touches the session.
All five `writeFulfilments` calls (`:76, :115, :161, :201, :221`) rebuild from
`{ ...readFulfilments(request) }` (`:51, :102, :121, :187, :208`) — the raw map.

**Resurrection confirmed.** While the gate is false, `purgeStorage` (`evaluator.js:346`
`if (!isInScope(obligation)) continue`) drops the entry from the *amended* map only;
the raw value stays in yar. Flip the gate true and `purgeStorage:367-368` keeps it →
`readValue` (`build-field-descriptors.js:34-42`) reads it out of `state.fulfilments`
→ the field renders **pre-filled with the pre-flip answer**. The claim's central
mechanic is real.

**A does persist its wipe.** `engine/write.js:11-18`:

```js
const answers = { ...journey.answers, ...patch }
const { wiped } = reconcile(answers)
destroyWiped(answers, wiped)          // mutates `answers` in place
await saveJourneyAnswers(request, journey.journeyId, answers)
```

Same pattern in `removeEntryAt` (`:57-59`) and `reconcileEntriesAt` (`:74-76`).
Confirmed.

## 2. Counter-example 1 — the doc framing is wrong (not-built vs cannot-be-built)

The claim says B's docs "promise the opposite in three places". Two of the three cites
are about the **orchestrator**, and `obligations.md` explicitly says the spike doesn't
have one:

- `obligations.md:465` / `:2039` — "**The orchestrator persists the amended set** — it
  becomes the new source of truth."
- `obligations.md:306-311` — "**Orchestrator** — side-effecting (**not implemented in
  this spike**)… In this spike the browser layer takes the orchestrator's role."
- `obligations.md:733-738` — "**The spike doesn't ship an orchestrator.** User-facing
  pages POST directly, the page controller writes fulfilments straight into the Journey
  state and calls `evaluateState(fulfilments)` on the next GET."
- `obligations.md:2017` — "The spike itself uses in-memory state via the frontend
  session; the persistence contract above is the intended shape for a real deployment."

So B *documents the exact behaviour the claim calls a hidden contradiction*. Only
`:658-661` ("their prior values vanish") reads as an unqualified promise, and even that
is true of the amended set the evaluator returns.

Decisively: the evaluator **returns `amendedFulfilments` precisely so a caller can
persist it**. The write-back is a wiring gap in the demo harness, not something the
model cannot express. Retrofit is ~one line in `writeAnswer`:

```js
writeFulfilments(request, evaluateState(fulfilments).fulfilments)
```

This is the classic "conflates not-built with cannot-be-built" failure. It is not a
structural defect in B's obligations model.

## 3. Counter-example 2 — the build-field-descriptors evidence line is wrong

The claim cites `build-field-descriptors.js:80-82` as "reads the stale value straight
back". It doesn't. `readValue` (`:35`) reads `state.fulfilments` — the **amended**
map — and `entryInScope` (`:20-26`, applied at `:67`) skips out-of-scope entries
entirely. While the gate is false the orphan is invisible in every render path. The
staleness is a **session-rot + re-scoping** effect, not a descriptor bypassing the purge.

## 4. Counter-example 3 — "A physically cannot hand-roll a wipe or fake scope"

Overstated on three counts:

- **A's write surface does export deletes.** `engine/index.js:2-12` exports
  `removeEntry` / `removeEntryAt`.
- **A exports a general delete primitive.** `lib/path.js:33-41` `deleteAt(answers, path)`.
  Nothing enforces the boundary — no lint rule, no arch test; features simply don't
  import it today (verified: `grep -rn "lib/path.js"` hits only `registry.js`, `dump.js`,
  `analysis/reachability.js` and `engine/*`). Convention, not physics.
- **`commit`'s patch merge lets a page null anything.** `write.js:13`
  `{ ...journey.answers, ...patch }` — a controller can commit `{ field: null }` and
  hand-roll a blank.

What *is* true and worth keeping: **scope itself is engine-owned and unfakeable** — a
page cannot inject an `inScope` decision; `reconcile` derives it from `activatedBy`
predicates over the registry (`reconcile.js:9-30`, incl. a genuine fixpoint loop).

## 5. Counter-example 4 — A is not uniformly reconciled either

Two of A's five write primitives **never call `reconcile`/`destroyWiped`**:
`appendEntryAt` (`write.js:20-28`) and `updateEntryAt` (`write.js:30-46`).

`features/commodities/consignment-details.controller.js:177-185` saves the per-line
quantity fields through `updateEntryAt` — so **that page's write path performs no wipe
at all**. Instead of letting the engine wipe now-orphaned identifier entries when the
animal count drops, the controller hand-rolls a `countDropIssues` block (`:161-175`) and
blocks the user. Defensible UX, but it is exactly the "page hand-rolls the conditionality"
the claim says A prevents.

## 6. Counter-example 5 — A also orphans answers

`reconcile.js:32-38`: the wipe set is filtered by **`obligation.wipeOnExit`**. An
out-of-scope obligation *without* that flag keeps its answer in A's session forever —
the same rot, just declared per-obligation. A's real advantage is that **when the wipe
does fire it is persisted**, not that A never orphans.

## 7. A finding that strengthens the B-side critique (different from the claim's)

Because the derived purge is never persisted, B's harness has to hand-roll **physical**
deletes: `deleteCommodityLine` (`state.js:120-162`) and `deleteUnitRecord` (`:206-222`),
both taking a **caller-supplied leaf-obligation list**. That list
(`features/commodity-lines/controller.js:45-54`, `LINE_LEAF_OBLIGATIONS`) is derived
from the **flow**, not the obligations model, and its own comment admits it "missed
depth-2 leaves whose `within` is `unitRecord`… when per-unit pages get wired we'll need
to also purge composite-key fulfilments".

This is partly inherent to B's storage shape: instance identity is *implied* by
composite-key presence across per-obligation maps, so removing an instance means
touching every leaf obligation. A stores collections as arrays (`setAt` + `toSpliced`),
so one splice removes the instance and `reconcile` cleans up. That is a real asymmetry —
but it is a **storage-shape** asymmetry, not the "no delete primitive" one the claim
asserts.

## Retrofit cost

- **B → persist the wipe:** ~1 line + a test. The evaluator already returns the amended
  set. Cheap.
- **A → cover the unreconciled write paths:** add `reconcile`/`destroyWiped` to
  `appendEntryAt` / `updateEntryAt` (or route those pages through `commit`). Small, but
  it changes `consignment-details`'s deliberate block-don't-destroy behaviour, so it's a
  design decision, not a mechanical fix.
- **Third option:** take B's evaluator-derived purge, persist the amended set at the
  write boundary (A's discipline), and take A's array-shaped collection storage so
  instance deletion doesn't need a hand-maintained leaf list.
