# L3 adversarial verification — FN-6 (flow-navigation)

**Verdict: AMENDED.** The central mechanism survives contact with the source. One
of the three supporting legs is false, and the claim omits the fact that decides
whether this belongs in the "asymmetric capability" bucket at all — it does not.

---

## 1. The core mechanism — CONFIRMED

Every cited line is real and means what the claim says.

| Cite | Verified |
|---|---|
| `obligations/evaluator.js:94-99` | `const amendedFulfilments = purgeStorage(recognisedFulfilments, {...})` |
| `obligations/evaluator.js:123-126` | `return { fulfilments: amendedFulfilments, obligations: implicationsByObligation }` |
| `lib/state.js:26-28` | `readFulfilments = request.yar?.get(SESSION_KEY) ?? {}` — raw |
| `lib/state.js:42-44` | `readState = evaluateState(readFulfilments(request))` — **no write-back** |
| `lib/state.js:51` | `const fulfilments = { ...readFulfilments(request) }` — writeAnswer merges into RAW |

I grepped every `yar.set` in the whole spike. There are exactly **three**
(`state.js:31`, `:94`, `:183`), and none of them ever persists the evaluator's
`amendedFulfilments`. All five `writeFulfilments` call sites (`state.js:76`,
`:115`, `:161`, `:201`, `:221`) build their map from `readFulfilments` — i.e.
from raw storage.

The one place it could plausibly have been wired up isn't:

```js
// lib/page-controller.js:90-93
writeAnswer(request, result.values)
const stateAfter = readState(request)      // amended map computed here…
const target = nextAfter(page, stateAfter) // …used ONLY for routing
return h.redirect(urlForNext(target))      // …then discarded
```

`line-page-controller.js:126-127` and `unit-page-controller.js:162-163` do the
identical thing. The purged map is computed on every POST and thrown away.

**Consequence, traced end to end** (purge-on-flip pattern,
`obligations.js:210-212`): user sets `reasonForImport='internal-market'`,
`purposeInInternalMarket='slaughter'`. Raw yar holds both. User flips
`reasonForImport` to `'transit'` — `writeAnswer` only touches the fields on
*that* page, so raw still holds `purpose='slaughter'`; the projection correctly
hides it. User flips back to `'internal-market'` → `purpose` re-enters scope →
`purgeStorage` keeps it → **`'slaughter'` rehydrates**.

That directly contradicts the doc:

> `obligations.md:1127-1130` — "**FulfilmentId removed** → that fulfilment drops
> out of scope; its data is wiped, consistent with the existing scope-exit rule.
> **FulfilmentId re-added** after a previous remove → fresh blank again (no
> rehydration)."

and the manifest comment at `obligations.js:210-212` ("any stored value is
**dropped**") — true of the projection, false of storage.

**And it is untested.** Every purge test (`evaluator.test.js:302-308`, `:346`,
`:354`, `:402`, `:574`, `:666`, `:789`, `:930`, `:1002`) calls `evaluate()`
*once* on a hand-built raw map and asserts on the returned map. Not one
round-trips `writeAnswer → yar → readState` across a flip and back. So the tests
pin the projection and are structurally incapable of catching the durability gap.

## 2. The "internally undecided" leg — REFUTED

The claim cites `flow/flow.js:116-118` (regionCode, "stored value is retained
across gate flips") as evidence that B is *undecided* about retention. **It is
not.** This conflates a **status gate** with a **scope gate**.

```js
// obligations/obligations.js:186-197
// Retain-value pattern: always in scope; mandatory when
// regionCodeRequirement === 'yes', optional otherwise. Stored values
// are kept across gate flips (V4 spec: the field itself is not purged on `no`).
export const regionCode = {
  applyTo: branchedGate(
    (f) => f[regionCodeRequirement.id] === 'yes',
    { inScope: true, status: 'mandatory', reasons: [...] },
    { inScope: true, status: 'optional' }          // <-- inScope stays TRUE
  )
}
```

`purgeStorage` only drops entries where `!isInScope(obligation)`
(`evaluator.js:345`). `regionCode` is **never** out of scope, so purge never
touches it. Retention here is correct-by-construction and matches the V4 spec.

B knows this and tests the contrast explicitly:

> `evaluator.test.js:1141-1144` — `it('does not purge a stored value when the
> gate is off (extended form whenFalse keeps inScope: true)')` … *"Contrast with
> purge-on-flip patterns (purposeInInternalMarket …) — never out of scope — so
> purgeStorage keeps the value."*

So B has **two deliberate, named, documented, tested patterns** —
"Retain-value" (`inScope: true`, status flips) vs "Purge-on-flip"
(`inScope: false`). That is a decided model, not an undecided one. **This leg of
the claim must be struck.**

## 3. What the claim omits — B *does* have a durable write-path wipe

The claim implies B has no durable wipe anywhere. False. For **group instances**,
B wipes raw storage in the write path and was demonstrably alive to exactly this
hazard:

- `state.js:120-162` `deleteCommodityLine` — deletes from raw, cascades a
  `${lineId}/` prefix purge across every obligation, `writeFulfilments`.
- `state.js:206-222` `deleteUnitRecord` — same shape.
- `state.js:84-88` — *"Kept in its own yar key rather than derived from current
  fulfilments so a Delete cannot recycle the id — **silent rehydration** of any
  per-line state … would otherwise be possible."* A monotonic, non-recycling id
  counter, added specifically to defend against rehydration.
- `state.test.js:143-145` tests that cascade.

So the accurate scope of the defect is narrower than the claim states: **the
scope-exit purge for gated scalar and derived-leaf obligations** is
projection-only. Group deletion is durable.

## 4. The decisive check — "not built" vs "cannot be built"

This is the trap, and the claim walks into it rhetorically ("A's wipe is
unambiguous and lives in the write path") even though it never quite asserts a
structural limit.

**B's model can express the durable wipe perfectly. Nobody wired it up.**

- `state.js:6-8` (its own header): *"All reads/writes go through this module; the
  controller never touches `request.yar` directly."* One choke point.
- `evaluate()` **already returns** the amended map. It was built to support this.
- The fix is ~2 lines in **one file**: have `writeAnswer` persist
  `evaluateState(fulfilments).fulfilments` rather than the raw merge.

Retrofit cost ≈ zero. This is a **wiring bug**, not a model asymmetry. It must
**not** be scored as asymmetric capability in A's favour.

## 5. Side A — CONFIRMED, and slightly understated

```js
// engine/write.js:11-18
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)   // re-derive scope
  destroyWiped(answers, wiped)           // mutate in place
  await saveJourneyAnswers(request, journey.journeyId, answers)  // persist
  ...
}
```

Durable, and re-derived on every mutation. The claim actually **understates** it:
`destroyWiped` also runs in `removeEntryAt` (`write.js:57-59`) and
`reconcileEntriesAt` (`write.js:74-76`), not just `commit`.

`wipeOnExit: true` appears **exactly 15 times** across `features/*/obligations.js`
— the claim's count is precise.

Worth noting for the shopping list: `wipeOnExit` is **opt-in**
(`reconcile.js:35`: `obligation.wipeOnExit && !inScope.has(...) && isAnswered(...)`),
so A can express retention too (omit the flag). A is not locked into wiping.

## 6. Searches performed

- `grep -rn` for `writeFulfilments|readFulfilments|amendedFulfilments|evaluateState|readState|writeAnswer` across all of B's `prototypes/` (source + tests).
- `grep -rn` for `yar.set|yar?.set|yar.clear` across the whole flow-layer spike — 3 hits, all in `state.js`, none writing the amended map.
- Read all three of B's POST paths (`page-controller.js`, `line-page-controller.js`, `unit-page-controller.js`) looking for a write-back. None.
- `grep -rni` for `rehydrat|purge|flip` in `evaluator.test.js`, `state.test.js`, `integration.test.js` to find any flip-flop durability test. None exists.
- Read `obligations.md:1100-1154`, `obligations.js:184-212`, `flow/flow.js:95-139` to test the "internally undecided" leg — which is what broke it.
- Read A's `engine/write.js` in full and `engine/evaluate/reconcile.js` in full; counted `wipeOnExit` across A's feature manifests.

---

## Amended claim

> B's scope-exit purge is a **read-time projection, not a durable wipe**. The
> evaluator returns an amended fulfilment map (`evaluator.js:94-99,123-126`) but
> nothing ever persists it: all five `writeFulfilments` call sites build from the
> raw yar map (`state.js:51` etc.), and the three POST controllers compute
> `readState` after `writeAnswer` only to pick the next page, then discard it
> (`page-controller.js:90-93`). So a gate flip-flop rehydrates the stale answer —
> which B's own derived-lifecycle rule says cannot happen (`obligations.md:1127-1130`,
> "re-added → fresh blank again (no rehydration)"), and which none of B's purge
> tests can catch, since every one calls `evaluate()` once on a hand-built map.
>
> Two qualifications matter. **(a) This is a wiring bug, not a model limitation.**
> B's evaluator already returns the amended map, and `state.js` is the single
> choke point for all session access by design; persisting the purged map is a
> ~2-line change in one file. B *also* already wipes durably for group deletes
> (`state.js:120-162`, `:206-222`) with an explicit anti-rehydration id counter
> (`state.js:84-88`), so Paul solved this hazard where he met it. Retrofit cost is
> near zero and this must **not** be scored as asymmetric capability.
> **(b) `flow/flow.js:116-118` is not a contradiction.** `regionCode` is B's
> deliberately-named "Retain-value pattern" (`obligations.js:186-197`) — a *status*
> gate returning `inScope: true` in both branches, so purge correctly never touches
> it, per the V4 spec. B tests the contrast against purge-on-flip explicitly
> (`evaluator.test.js:1141-1144`). B is decided, not undecided.
>
> A's wipe is the better-shaped mechanism and the one to take forward: durable,
> re-derived on **every** mutation (`write.js:11-18` commit, `:57-59` removeEntryAt,
> `:74-76` reconcileEntriesAt), and opt-in per obligation (`reconcile.js:35`;
> 15 obligations carry `wipeOnExit`), so it expresses retention as well as wipe.
> The shopping-list item is **A's write-path discipline applied to B's evaluator** —
> not a reason to prefer A's model.
