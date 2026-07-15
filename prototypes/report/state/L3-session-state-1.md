# L3 adversarial verification — SS-1 (session-state)

**Claim:** B's derived purge is view-only and never reaches storage, so a value the
model believes it purged keeps driving other obligations' scope decisions forever —
directly contradicting B's own documented spec.

**Verdict: AMENDED.** The mechanical half is exactly right and survives every attempt
to break it. The *consequence* asserted ("keeps driving other obligations' scope
decisions") is not instantiated anywhere in B's manifest, and the doc contradiction is
narrower and in a different place than the claim says.

All paths below are relative to
`clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.

---

## 1. What I verified (the claim's mechanical half — TRUE)

Read `obligations/evaluator.js` in full and `lib/state.js` in full.

- `purgeStorage` (evaluator.js:333-379) builds `amendedFulfilments`; writes at
  :366 (derived-leaf filtered), :368 (single), :372 (keyed field/user-leaf),
  :375 (fallback). Out-of-scope obligations are skipped wholesale at :346
  (`if (!isInScope(obligation)) continue`). Real, and means what the claim says.
- The evaluator returns it: `fulfilments: amendedFulfilments` (evaluator.js:124),
  produced at :94.
- `lib/state.js:42-44` — `readState(request)` = `evaluateState(readFulfilments(request))`.
  It returns the amended map to the caller and **never writes it back**.
- Every `writeFulfilments` call site (state.js:76, 115, 161, 201, 221) is fed from a
  fresh **raw** `readFulfilments` (:51, 102, 121, 187, 208).

Counter-example hunt (grep across the whole spike tree for
`writeFulfilments|readFulfilments|evaluateState|readState`): the ONLY `writeFulfilments`
callers in the entire tree are inside `lib/state.js` itself. Controllers
(`lib/page-controller.js`, `lib/line-page-controller.js`, `lib/unit-page-controller.js`,
`features/{start,hub,commodity-lines,units,check-your-answers}/controller.js`) call
`readState`/`writeAnswer` only. `contract.js:50` is a pure pass-through to the evaluator.
**No path anywhere writes the amended map back to yar.** Confirmed.

Ordering also confirmed: `dropUnknownFulfilments` :62 → pre-purge enumeration :71 →
`runApplicabilityDecisions` :80 (which passes `recognisedFulfilments`, i.e. RAW storage,
into every `applyTo` — see :288) → purge only at :94. So `applyTo` does read un-purged
storage. Confirmed.

## 2. Where the claim breaks (the consequence — NOT TRUE as stated)

"a value the model believes it purged keeps driving other obligations' scope decisions
forever" requires at least one `applyTo` whose gate obligation is itself purgeable.
I enumerated every gate in the v4 manifest (`obligations/obligations.js`, grep for
`applyTo` + read of every gate helper in `obligations/helpers.js`). The complete gate
set is six obligations, and **every one of them is structurally never purgeable**:

| Gate obligation | Why it can never be purged |
|---|---|
| `regionCodeRequirement` (obligations.js:180-184) | `applyTo: () => ({ inScope: true, … })` |
| `reasonForImport` (:204-208) | `applyTo: () => ({ inScope: true, … })` |
| `transporterType` (:271-275) | `applyTo: () => ({ inScope: true, … })` |
| `meansOfTransport` (:311-315) | `applyTo: () => ({ inScope: true, … })` |
| `commodityCode` (:412-417) | category `'field'` (status, no applyTo, no indexedBy — evaluator.js:176); its only ancestor `commodityLine` (:405-410) has **no** `applyTo` → always in scope. `purgeStorage` :369-373 keeps it. |
| `accompanyingDocumentType` (:764-768) | `accompanyingDocumentBlockApplyTo` (:754-762) — `whenFalse` is `{ inScope: true, status: 'optional' }`, i.e. never out of scope. |

The purgeable obligations — `purposeInInternalMarket` (:213), `cph` (:510),
`containsUnweanedAnimals` (:546), `commercialTransporter` (:279),
`privateTransporter` (:293), `transitedCountries` (:334), and the per-record
derived leaves `numberOfPackages`/`passport`/`tattoo`/`earTag`/`horseName`/
`identificationDetails`/`description`/`permanentAddress` — are **read by nothing**.
Not one of them appears as a gate argument to `allowListed`/`allowListedByPredicate`/
`anyAllowListed`/`branchedGate`/`matches`.

So there is **no live scope corruption in B today**. The scope graph is one level deep
from always-in-scope roots. The claim asserts a cascade that the manifest does not contain.

## 3. What IS true, and is worse than "latent"

The leak has three real consequences, and one of them is user-visible:

1. **Purged answers resurrect on gate flip-back.** `lib/build-field-descriptors.js:35`
   prefills from `state.fulfilments` (the amended map). Set
   `reasonForImport = 'internal-market'`, answer purpose-details, flip
   `reasonForImport` to `'transit'` (the field disappears — evaluator.js:346 drops it
   from the amended view), then flip back: `purposeInInternalMarket` is in scope again,
   so the purge no longer fires, the raw yar value was never deleted, and the user's old
   answer is prefilled verbatim. Same for `commercialTransporter`/`privateTransporter`,
   `transitedCountries`, `cph`, `containsUnweanedAnimals`, and every commodity-gated leaf.
2. **Session storage accumulates out-of-scope values indefinitely.** Nothing ever removes
   them; only `deleteCommodityLine`/`deleteUnitRecord`/`resetState` delete keys, and none
   of them targets scope-exited values.
3. **Latent structural hazard.** The moment anyone gates an obligation on a purgeable
   obligation, `runApplicabilityDecisions` (evaluator.js:80) reads un-purged storage and
   the fixpoint never converges — even one extra request would not fix it, because the
   raw map never changes. This is the claim's asserted failure mode; it is one manifest
   edit away, not present today.

## 4. What the doc actually says (the claim credits the wrong lines)

The claim cites `obligations.md:2039-2040` — "the orchestrator persists the amended set —
it becomes the new source of truth". Read in context (:2021-2054), that paragraph is in
**§Model versioning**, about `dropUnknownFulfilments` (tolerate-and-amend), and it assigns
the persist to the **orchestrator**, not the evaluator. The evaluator's stated duty is
":2037 — Returns the amended set as part of its output", which it does (evaluator.js:124).
And `obligations.md:2017` says explicitly: *"The spike itself uses in-memory state via the
frontend session; the persistence contract above is the intended shape for a real
deployment."* So the doc does not promise that **this spike** persists it.

The genuine doc contradiction is elsewhere and the claim under-uses it:

- `obligations.md:659-661` — *"`appliesWhen` fields disappear on scope exit; **their prior
  values vanish**. `mandatoryWhen` fields stay visible and the user's answer is preserved."*
- `obligations.md:668` — *"Same purge semantics as any `appliesWhen`: **scope-exit still
  drops the stored value**."*
- `obligations/obligations.js:210-212` — *"Purge-on-flip: when reasonForImport is not
  'internal-market', purposeInInternalMarket goes out of scope and **any stored value is
  dropped**."*

Those three are flatly false of the running spike: the value is hidden, not dropped, and
it comes back. That is the contradiction that survives.

## 5. Tests

Every "purges …" test is an evaluator-level unit test asserting on the returned map
(`obligations/evaluator.test.js:302, 346, 354, 402, 574, 582, 666, 789, 797, 930, 1002`) —
i.e. they all assert exactly the view-only behaviour and none of them asserts storage.
`routes.test.js:325-360` (the only HTTP-level gate test) flips one way only —
internal-market → options shown; transit → page skipped. There is no flip-back test at
any level, which is why the resurrection has never been caught. Claim's test point: correct.

## 6. Not-built vs cannot-be-built

This is a **wiring gap, not a structural limitation**, and it must not be scored as an
asymmetric capability. The evaluator already returns the amended set; the fix is
essentially one line in the orchestrator (`lib/state.js`) — persist `state.fulfilments`
after evaluation (or after each `writeAnswer`). The obligations model would happily accept
it; nobody wired it up in a spike whose own doc says it is session-only. Retrofit cost:
trivial in B. The *interesting* comparison point for the shopping list is not "B leaks"
but "B's purge is a pure function of storage that the orchestrator is free to persist or
not" — which is arguably the better factoring, provided the orchestrator actually does it
and the ordering bug in §3.3 (applyTo reads pre-purge storage within a single call, so a
gate-on-purgeable chain needs a fixpoint loop, not a single pass) is addressed.
