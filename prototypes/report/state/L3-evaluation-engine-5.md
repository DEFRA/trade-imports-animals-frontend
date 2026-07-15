# L3 adversarial verification — EE-5 (evaluation-engine)

**Verdict: AMENDED.** The central architectural contrast survives. Four of the
supporting sub-claims do not, and the strongest counter-example runs the other
way: B's scope-cleanliness is a read-time projection that is never persisted,
so B cannot actually delete anything — values resurrect.

---

## 1. What the cited lines actually say

| Citation | Real? | Means what the claim says? |
|---|---|---|
| `obligations/evaluator.js:123-126` | Yes — `return { fulfilments: amendedFulfilments, obligations: implicationsByObligation }` | Yes |
| `lib/state.js:42-44` — `readState = evaluateState(readFulfilments(request))` | Yes | Yes, and every controller does go through it (verified below) |
| `evaluator.js:227-235` — `dropUnknownFulfilments`, 9 LOC | Yes | Yes |
| `engine/read.js:28` — `makeScope` destructures only `inScope` | Yes (`read.js:27-35`) | Yes, but the inference drawn from it is a non-sequitur (§2) |
| `engine/write.js:14, :57, :74` — reconcile+wipe on 3 of 5 ops | Yes. `commit` (:14), `removeEntryAt` (:57), `reconcileEntriesAt` (:74). `appendEntryAt` (:20-28) and `updateEntryAt` (:30-46) do not reconcile | Yes on the fact; no on the consequence (§3) |
| `features/consignment-details/controller.js:178` | Path is wrong — actual file is `features/commodities/consignment-details.controller.js`. Line 178 is right: `state.updateEntryAt(request, h, ['commodityLines'], index, {...})` | Live, yes |
| `engine/persistence/records.js` — zero scope references | True but misleading: that file is a **port shim** (8 stub methods, `configureRecords`), not a mapper. The real mapper is `services/persistence/records/notification-mapper.js` | §5 |

`readState` consumers verified — `grep -rn "readFulfilments\|readState"` over B: every
controller (`hub`, `start`, `check-your-answers`, `commodity-lines`, `units`,
`page-controller`, `line-page-controller`, `unit-page-controller`) imports `readState`.
No controller touches `readFulfilments`. That part of the claim is solid.

---

## 2. The `makeScope`/write-ops link is a non-sequitur, and the offered retrofit does not fix the bug

The claim says A's `makeScope` discarding `wiped` **is why** the wipe lands on only
3 of 5 write ops ("so the wipe is applied on..."). These are unrelated code paths.
`engine/write.js` calls `reconcile(answers)` **directly** (`:14`, `:57`, `:74`) and
destructures `wiped` itself; it never asks `makeScope` for it. Whether `read.js`
returns `wiped` has zero bearing on write-op behaviour.

Consequently the proposed cheap fix — *"return `wiped` from makeScope"* — **would not
fix the alleged defect**. `makeScope` is a pure read; it does not mutate storage.
The actual fixes are (a) call `reconcile` + `destroyWiped` inside `appendEntryAt` and
`updateEntryAt`, or (b) project `answers` through `destroyWiped` in `readViewOf`
(`read.js:37-41`) to get B's read-through model. The claim's remedy is aimed at the
wrong file.

---

## 3. The leak is LATENT, not live — no out-of-scope value can reach A's mapper today

I enumerated **every** `activatedBy` referent in A's whole manifest
(`features/{commodities,origin,transport,cph-number,additional-details,import-purpose}/obligations.js`;
`features/documents/obligations.js` has none):

- `commoditySelection` (incl. `frame: 'anyItem'` and `enclosingCommodity` /
  `enclosingCommodityNotInUnionOf` forms)
- `regionOfOriginCodeRequirement`
- `meansOfTransport`
- `transporterType`
- `reasonForImport`

`engine/evaluate/predicate.js:31-68` confirms a predicate always reads *another
obligation's stored value* — nothing else.

Now the three non-reconciling call sites, and what they write:

| Call site | Op | Fields written |
|---|---|---|
| `features/commodities/consignment-details.controller.js:178` | `updateEntryAt` | `numberOfAnimalsQuantity`, `numberOfPackages` |
| `features/commodities/animal-identification.controller.js:511` | `appendEntryAt` | one `animalIdentifier*` unit |
| `features/documents/controller.js:269` | `appendEntry` | `accompanyingDocument*` fields |

**None of these fields is read by any predicate.** Every write that *can* move an
obligation out of scope goes through a reconciling op:

- `commoditySelection` is only ever written via `reconcileEntriesAt`
  (`search.controller.js:134`, `consignment-details.controller.js:195`) — which wipes
  (`write.js:74`).
- The five top-level triggers are all page fields written via `commit` — which wipes
  (`write.js:14`).

So the claim's headline — *"an out-of-scope value can reach the record mapper"* — is
**not demonstrated**. It is a real and worth-fixing **latent hazard** (add one
obligation gated on a count or an identifier value and it leaks silently, with no
test to catch it), but the claim asserts a live defect A does not have.

---

## 4. Model-version tolerance: REFUTED as stated

Claim: *"an answers key with no obligation ... survives forever and reaches records.js
unfiltered"*.

A's real mapper is an **explicit allow-list, key by key**:
`services/persistence/records/notification-mapper.js:164-225` (`answersToNotification`)
names every field it reads (`answers.referenceNumber`, `answers.countryOfOrigin`,
`answers.reasonForImport`, …). An unrecognised answers key is **never read**, so it
**cannot reach the notification**. `real.js:121-124` is the only write path
(`toNotification({...answers, referenceNumber})` → POST). On load, `real.js:52`
`toAnswers(stripNulls(notification))` reconstructs answers *from the notification*, so
a stale key cannot come back either.

It is also invisible to the UI: `reconcile`/`walk` enumerate the **registry**, so a key
with no obligation yields no node — no CYA row, no field, no status contribution.

An unknown key in A is therefore **inert**: dropped at the persistence boundary, absent
from the UI. It survives only in the in-memory dev stub (`records/stub.js:69`,
`structuredClone(answers)`) and in the session blob.

What *is* true, and is the defensible version: A has **no explicit tolerate-and-amend
step**. Its version tolerance is an *accident* of the mapper happening to be an
allow-list, not a modelled behaviour, and there is no drop at session-load time. B's
`dropUnknownFulfilments` (`evaluator.js:227-235`) is explicit, first-class, and applies
at the single chokepoint. That is a genuine (if modest) point for B — but it is a
design-clarity point, not the data-leak the claim describes.

---

## 5. COUNTER-EXAMPLE: B's purge is a read-time projection that is NEVER PERSISTED

This is the finding that most damages the claim's direction.

`lib/state.js:42-44` — `readState(request)` returns `evaluateState(readFulfilments(request))`.
It is **pure**. The amended (purged) map is returned to the caller and thrown away.

Every one of B's five write ops starts from the **raw, un-purged** stored map and writes
it straight back:

- `writeAnswer` — `state.js:51` `{ ...readFulfilments(request) }` → `:76` `writeFulfilments`
- `addCommodityLine` — `:102` → `:115`
- `deleteCommodityLine` — `:121` → `:161`
- `addUnitRecord` — `:187` → `:201`
- `deleteUnitRecord` — `:208` → `:221`

`grep -rn "writeFulfilments"` over the whole B tree: those five call sites plus the
definition and a comment in `controller-sketch.js`. **`evaluate`'s `amendedFulfilments`
is never written back to yar anywhere.**

Consequences:

1. **B's storage is not scope-clean.** Out-of-scope values persist in the session
   indefinitely. Only the *read projection* is clean.
2. **Values resurrect.** `reasonForImport = internal-market` → answer
   `purposeInInternalMarket` → change `reasonForImport` (purge: hidden from CYA, hidden
   from every controller) → change it **back** → `readState` re-evaluates the raw stored
   map, `purposeInInternalMarket` is in scope again and **reappears pre-filled and
   answered**, though the user never re-answered it. `page-controller.js:90-91` confirms
   the POST path: `writeAnswer(...)` then `readState(...)` purely for routing.
3. **A does not have this.** `write.js:14-16` — `commit` runs `destroyWiped(answers, wiped)`
   **before** `saveJourneyAnswers`, so the value is genuinely destroyed. A flip-back
   leaves the field blank and unanswered.

**Doc-vs-code gap in B, on exactly the doc the claim leans on.** `obligations.md:245`
("its data is **actively cleared**"), `:619` ("any stored fulfilment **is purged**"),
`:659-661` ("`appliesWhen` fields disappear on scope exit; **their prior values
vanish**"). The code makes them vanish from the *evaluate output* only. Every B purge
test asserts on `evaluate()`'s returned `fulfilments`, never on yar
(`evaluator.test.js:302, :346, :354, :402`).

This lands against A's own recorded design steer: `spec/journey-spec.json:64` — the IxD
canvas ruling *"Delete conditional data on change of determining condition, e.g. delete
crash records when saying you didn't have any claims."* **A honours it. B does not.**
Under that steer (and under data-minimisation), B's session retains revoked answers and
hands them back.

---

## 6. Unfair-comparison note

`grep -rn "await fetch\|axios\|BACKEND_URL\|notifications"` over B's entire tree → **zero
hits**. B has **no persistence layer, no submit, no record mapper**. "No consumer can see
an out-of-scope value" is partly true because the riskiest consumer *does not exist yet*.
When B grows one it must choose `readState` (clean) over `readFulfilments` (dirty) — and
because B's storage is dirty, that is a live footgun, not a structural guarantee. The
claim contrasts A's built persistence boundary against a boundary B has not had to face.

---

## 7. What survives, and it is the real point

- **"Nothing in A ties `activatedBy` to `wipeOnExit`" — CONFIRMED.** Neither
  `contract.test.js` nor `registry.js` contains either token. `reconcile.js:32-39` wipes
  only when `obligation.wipeOnExit` is truthy; it is opt-in per obligation and nothing
  lints that every `activatedBy` obligation carries it. (B needs no such tie: purge is
  unconditional on `inScope: false`, and retain-on-exit is expressed by *staying in
  scope* with a status swap — `obligations.md:595-615`, `branchedGate`. That is a
  cleaner encoding.)
- **The architectural contrast is real, and it is the shopping-list item.** B enforces
  scope at **one read chokepoint**, so no write op can leak to a consumer, and adding a
  sixth write op cannot introduce a leak. A enforces scope **per write op**, so
  correctness depends on every author of every future write op remembering to reconcile
  — and two of the five already don't. A's is the more fragile invariant *even though it
  currently has no live leak*, and the fragility is unguarded by any test.

---

## Recommended shopping list (both directions)

**For A, take from B:** move scope enforcement to the read chokepoint (project `answers`
through `destroyWiped` in `readViewOf`, `read.js:37-41`) so no write op can leak;
*keep* the write-side `destroyWiped` for actual destruction. Add an explicit
`dropUnknownFulfilments` equivalent at session load. Add a contract test that every
`activatedBy` obligation declares `wipeOnExit` (or explicitly opts out).

**For B, take from A:** persist the amended map. Either `writeFulfilments(request,
evaluate(raw).fulfilments)` on every write, or have the write ops start from
`readState().fulfilments` rather than `readFulfilments()`. Without it B cannot honour its
own documented "prior values vanish" semantics, and out-of-scope answers resurrect on
scope re-entry. Add a test that asserts on **yar**, not on `evaluate()`'s return value.
