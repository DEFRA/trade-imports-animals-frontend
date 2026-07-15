# L2 — Mandate model (required / optional / not-applicable; proceed vs submit)

A = `clone-live-animals` @ b6ac2ed, root `prototypes/standalone/live-animals/`
B = `clone-flow-layer` @ d59b432, root `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
All paths relative to those roots. Everything cited below was re-read at source, not taken on trust from Layer 1.

---

## Verdict: **MIXED** — and the split is almost comically clean

This dimension has two halves, and **each side has built exactly one of them and hand-waved the other**.

| | A (live-animals) | B (flow-layer) |
|---|---|---|
| **Completion / submit mandate** | data (`required`, `requiredAtLeastOne`, `requiredOneOf`), 5 reader lines, one roll-up, **server-enforced at submit** (`engine/write.js:92`) | modelled (`status: 'mandatory'\|'optional'`), drives task list + CYA prompts, **enforced nowhere — there is no submit** (no POST on `/check-your-answers`, `routes.js:73-79`) |
| **Proceed mandate** | declared (`enforcedAt: 'continue'`, 2 carriers) but **only derives flow sequencing**; the actual save-block is 4 hand-coded controller sites | `mandatoryToProceed` (13 flow declarations), **enforced in exactly one place** (`contract.js:266-283`) with an automatic stand-down when the obligation is currently optional (`contract.js:315-322`) |
| **Conditional mandate at depth (per line / per unit)** | **works at every depth**, cross-frame (`reconcile.js:13-30` is path-keyed; `complete.js:23-42` honours it per entry) | **structurally impossible** — record status is the *static* `obligation.status` (`evaluator.js:477,490,505`) |
| **Collection floor ("≥ 1 line")** | `requiredAtLeastOne`, 2 carriers (`complete.js:65`) | **no verb exists**; `requires` supports only `anyOf` and iterates *existing* records (`engine/index.js:513,517`) |
| **Mandate carries a message / reason** | **no** — obligation is deliberately copy-free; failed submit is a bare redirect (`features/declaration/controller.js:66`) | **yes** — `errors.required` i18n key per flow entry (enforced, tested) + 16 `reasons` constants (modelled, never rendered) |
| **optional ≠ not-applicable** | yes, 5 statuses, distinct GDS output (`engine/status.js:5-9`, `features/hub/controller.js:121-133`) | yes, 5 derived statuses; NA is `inScope:false`, a separate axis (`engine/index.js:386-410`) |
| **Relaxed by context (draft vs submit)** | no vocabulary — and it doesn't need one (required never blocks a save) | no vocabulary — `applyTo` takes no ctx arg (`evaluator.js:288`) |

**On the model, not the finish:** the prior ("B's obligations model is better, possibly in every respect") is **half-refuted**.

- **B wins the proceed half, decisively, on the strength of one idea**: mandate lives in two layers (obligation = completion, flow entry = proceed) and `isSufficientForProceed` composes them so a flow can declare `mandatoryToProceed: true` *flat* and the model decides whether the gate fires. That is why B gets 13 enforced proceed-mandates with zero restated conditions, and A gets 4 hand-written blocks whose overlap with its own declared proceed-level is **1 field out of 4**. A's `enforcedAt` is, on the save-blocking question, decorative.
- **A wins the completion half, decisively, on expressiveness**: A's conditional mandate is evaluated per *path* — per collection entry, with `enclosing` and `anyItem` frames — so "required on horse lines, not on cattle lines" is a data literal (`features/commodities/obligations.js:80-85`). B cannot express it at all: for anything `within` a group, the `applyTo`-returned status is **silently discarded** and every record gets the same static status. In a domain whose requirement set is *made of* per-commodity-line rules (V4), that is the more dangerous hole of the two. A also has a collection floor; B has none, so a B journey with **zero commodity lines** contributes zero mandatory concerns and can classify `fulfilled`.
- **A's mandate is statically introspectable; B's (for 30 of 44 obligations) is a closure return.** One grep tells you A's entire mandate surface. B's requires executing `applyTo`, mitigated only by a `.metadata` sidecar on 4 helper factories. And B declares mandate in *two different slots depending on cardinality* (`applyTo` return for singles, static `status:` for group members), a convention guarded by neither type nor test — get it wrong and you either TypeError (`evaluator.js:470-471`) or silently become mandatory (`engine/index.js:294`).

A is further along overall, but **that plays no part in this verdict**: A's win here is on the *vocabulary* (per-path conditionality, collection floor, 5 reader lines) and its loss is on the *wiring* (proceed level unenforced). Neither is a build-loop artefact. Symmetrically, B's win is a design idea (the layer split + composition rule), not a feature count.

**The third option is obvious and cheap:** A's completion vocabulary (data keys, per-path scope, floor, facet-aware group) + B's proceed layer (`mandatoryToProceed` on the flow entry + `isSufficientForProceed`) + B's `groupErrorCount`-style *error list* so the model can say **what** is missing, not just **that** something is. That combination has no internal contradiction — the only thing it needs that neither side has is a value domain (B has one, `domain/index.js`; A refuses one by axiom).

---

## Claims (falsifiable)

**C1 — A's completion mandate is genuinely centralised; its proceed mandate is genuinely not.**
`required || requiredAtLeastOne` is read at `engine/status.js:23-24`; `required` per item at `engine/evaluate/complete.js:54`; the floor at `:65`; the `requiredOneOf` group at `:15-21`. `enforcedAt` is read at exactly one line, `flow/prerequisites.js:11` (grep over the whole prototype returns 2 carriers — `features/origin/obligations.js:4`, `features/commodities/obligations.js:6` — plus that one reader, plus 2 test/comment mentions). Save-blocking is hand-coded at 4 sites: Joi `requiredOneOf` in `features/origin/controller.js:28`, `features/import-type-filter/controller.js:26`, `features/declaration/controller.js:17`, and a hand-rolled `if` in `features/commodities/search.controller.js:122-128`. **The two sets overlap in `countryOfOrigin` only.** `importType` hard-blocks while its obligation is `{ id: 'importType' }` with no mandate key at all.

**C2 — B structurally cannot express a conditional mandate below notification level.**
`buildImplication`'s three record-producing branches all stamp the *static* property: `evaluator.js:477` (`field`), `:490` (`derived-leaf`), `:505` (`user-leaf`) — each `status: obligation.status`. The `applyTo` decision (`own`) is consulted only for `.records` and `.reasons`. The record-producing helpers never emit a status at all: `helpers.js:198-209`, `filterAndProject` returns `{ inScope, records: passingKeys }` where `passingKeys` is `string[]`. Consequence: "present and optional on cattle lines, present and mandatory on horse lines" has no expression, and the only per-record mandate-off available (record leaves the allowlist) **purges the stored value** unconditionally (`evaluator.js:350-366`).

**C3 — Each side enforces one of the two levels and only one.**
A: submit is real and server-side — `flow/section-status.js:11-15` (`FULFILLED || NA || OPTIONAL`) consumed by the one authored gate (`flow/flow.js:72`) and re-checked in `engine/write.js:89-95` before `records.finalise`. Proceed is not derived from the model. B: proceed is real — `contract.js:266-283` rejects the POST with `flow.required`. Submit **does not exist**: `routes.js:73-79` registers `GET /check-your-answers` and no POST; `journeyState(flow, state, submitted = false)` (`engine/index.js:583`) is never called with `true`; `obligations.md:1810-1812` claims submission is blocked, and it is not.

**C4 — B has no minimum-instance mandate; A does.**
`groupInvariantErrors` bails unless `group.requires.anyOf` exists (`engine/index.js:513`) and then iterates `groupImpl.records` (`:517`) — zero records means zero errors. `classifyEntries` returns NA/FULFILLED off `inScope.length` + `groupErrorCount` (`:386-410`), and a `presentsForEach` over an empty record set contributes no entries (`:258-270`). So "at least one commodity line" cannot be stated, and nothing else in the spike states it (grep for `commodityLine` across `features/` finds only display/CRUD uses). A states it as data: `requiredAtLeastOne` on `commodityLines` and on the nested `animalIdentifiers` (`features/commodities/obligations.js:108,123`), enforced at `complete.js:65`.

**C5 — A's conditional mandate is per-collection-entry and cross-frame, and that is the thing B lacks.**
`reconcile.js:13-30` builds the in-scope set keyed by *path* (`pathKey(path)` includes the collection index), and `complete.js:23-42` skips an item's `required` when its `activatedBy` predicate fails *for that entry*. Frames: same-frame, `enclosing`, `anyItem` (`predicate.js:38-62`). Live: `permanentAddress` required per identifier record only when the **enclosing** line's `commoditySelection` qualifies (`features/commodities/obligations.js:80-85`); `countyParishHoldingCph` required when **any** line qualifies (`features/cph-number/obligations.js:4-13`). 15 obligations carry `activatedBy`; wipe-on-mandate-off is **opt-in** (`reconcile.js:32-38` filters on `obligation.wipeOnExit`), so A can also retain a value while its mandate is off — B cannot.

**C6 — `isSufficientForProceed` is the only place either of B's flags consults the other, and it is what makes flat proceed-declarations safe.**
`contract.js:315-322`: `if (effectiveStatus(obligation, path, state) === 'optional') return true`. That short-circuit lets `regionCode` carry `mandatoryToProceed: true` unconditionally at `flow/flow.js:124` and still allow a blank save on the `regionCodeRequirement = no` branch (both directions tested, `routes.test.js:270-321`). **Count correction to L1-B:** grep of `flow/flow.js` returns **13** `mandatoryToProceed: true` declarations (lines 124, 149, 197, 202, 220, 338, 384, 392, 399, 442, 451, 460, 469), not 14 — 9 on `presents`, 4 on `presentsForEach`.

---

## A-only (structural for B)

**1. State-dependent mandate at record granularity, with optional value retention.**
A: scope is path-keyed (`reconcile.js:13-30`) and `entryComplete` evaluates each item's `activatedBy` against *that entry's* frame (`complete.js:23-42`), so owed-ness varies per commodity line / per identifier record, including via the enclosing line's data. `wipeOnExit` is per-obligation, so "stop owing it but keep what they typed" is a one-key choice.
B cannot: `record.status = obligation.status`, statically, at `evaluator.js:477/490/505`; the helper library has no way to produce a per-record status (`helpers.js:198-209`). B's only per-record conditionality is record *presence*, and a record leaving the allowlist is purged (`purgeStorage`, `evaluator.js:350-366`) with no opt-out. Fixing it changes the evaluator's return contract plus 3 helper factories plus the 5 hand-rolled status readers — B's core, not its edges.

*(Deliberately NOT listed here: the collection floor and the derived prerequisite graph. B lacks both, but `requires` is an extensible slot — `requires: { min: 1 }` folded into `groupErrorCount` is ~10 LOC — and B has flow order + a page→obligation index, so prerequisite derivation is available to it. Those are unbuilt, not impossible. See the rationale.)*

## B-only (structural for A)

**1. A proceed-mandate that varies by flow rather than by obligation.**
B's proceed-mandate is a property of a *flow presents-entry* (`flow/flow.js:15-26`), so one obligations model can serve several flows that disagree about where a user may leave a page blank, with no change to the obligations.
A cannot: `enforcedAt` is a key on the obligation (`features/origin/obligations.js:4`), read against the single global `allFlowPages` list (`flow/prerequisites.js:2,11`), and the actual blocks live in per-page controllers that any flow would share. A second flow with a different proceed-set means forking obligation data or forking controllers. Moving the key onto a flow entry *is* adopting B's split.

**2. A mandate that can generate its own enforcement, and say why, without a controller.**
B's obligation has a value domain (`domain.get(obligation.id)` → `type`, `isComplete`), which is what lets `isSufficientForProceed` decide "blank enough to block?" generically — including partial composite addresses (`contract.js:317-321`) — and lets each flagged entry carry an `errors.required` i18n key gated by `i18n-coverage.test.js:11-13`.
A structurally cannot, *given its stated axiom*: an obligation carries "no type, no copy, no widget choice and no validation" by design (`docs/obligation-model.md:34-42`). With no value domain, a mandate flag has nothing to test against, so enforcement must be hand-written per controller — which is exactly what happened (C1) — and a failed submit can say nothing at all (`features/declaration/controller.js:66` redirects with no message). This is only escapable by adding a domain layer, i.e. by importing B's model, not by building a feature.

---

## retrofitBintoA — dropping B's mandate model into A

**Take (cheap, high value):**
- **`mandatoryToProceed` on A's page objects + an `isSufficientForProceed` equivalent.** A already has the page→obligation index (`flow/dispatch.js`) that the flag needs. This directly kills A's worst defect: 4 hand-coded blocks, 2 declared carriers, 1 in both.
  - *Blocker:* A has no value domain, so "is this blank?" has no model-side answer. Two options: **(a)** introduce `domain/` (obligation id → type + `isComplete`) — a new layer, touches all 44 obligations and duplicates knowledge that currently lives in each controller's Joi schema; or **(b)** keep Joi and make the flag a **boot assertion** ("every obligation flagged proceed-mandatory must have a save-blocking validator on its owning page"), which gets the *consistency* win for ~30 LOC without the layer. (b) is the honest first move; (a) is the real fix.
- **The `errors.required` key per flagged entry**, or at least an error *code* on the obligation. This is the only way A ever tells the user what's missing. Note it dents A's no-copy axiom — a code, not copy, keeps the axiom intact.
- **`groupErrorCount`-style error lists.** B's group invariant returns `[{ code, groupId, instanceId }]` and folds the *count* into one classifier (`engine/index.js:512-539`, `:398-400`). A's equivalent (`complete.js:15-21`) returns a bare boolean, which is why A can compute "not ready" but never "these 3 rows and this identifier record". ~20 LOC to make `complete.js` return reasons instead of `false`.

**Do NOT take:**
- **B's mandate *storage*** (`status` as an `applyTo` return). A's `partRequired` (`status.js:28-34`) reads `obligation.required` synchronously off the registry with no state at all; a closure-based mandate needs the answers, so `statusOf`, the facet machinery (`facetMembers`, `partSatisfied`) and the whole hub roll-up would need state threaded through them. You'd pay a rewrite of `engine/status.js` to *lose* static introspectability.
- **B's record-level static `status`** — it is strictly weaker than what A already has (C2/C5).

**What is load-bearing in A that B has no answer for:** `requiredAtLeastOne` (collection floor), path-keyed scope + `wipeOnExit`, the facet-aware group check (`groupOwned`, `complete.js:13-18` — one stored collection split across two hub rows without false group failures), `enforcedAt`→derived prerequisites (0 authored edges, `flow/prerequisites.js`, 31 LOC), the server-side submit gate (`engine/write.js:92`) and its identical re-application on amend-and-resubmit, and the boot dispatch-coverage assertion that makes any of it safe. A wholesale swap to B's mandate model loses every one of them.

## retrofitAintoB — dropping A's mandate model into B

**Take (cheap, high value):**
- **Collection floor.** `commodityLine.requires = { min: 1, errorCode: … }` plus ~10 LOC in `groupInvariantErrors` (count-based, not per-instance) and it folds straight into `classifyEntries` via the existing `groupErrorCount` parameter (`engine/index.js:398-400`). B's `requires` slot was built for exactly this. Closes C4.
- **A submit.** `journeyState` already computes readiness (`engine/index.js:583-599`); what's missing is a POST on `/check-your-answers`, a `submitted` flag in `lib/state.js` (232 LOC, none today) and a persistence story. Small in B's terms — but B has no records layer, so A's freeze/amend/re-gate story has nowhere to live.
- **Route the 4 hand-rolled mandate resolvers through `effectiveStatus`** (`engine/index.js:157,191`; `features/check-your-answers/controller.js:110,272`; `features/units/controller.js:198`; `dump.js:77`). Behaviourally a no-op *today* precisely because record status is static — i.e. the duplication is masked by the very bug you want to fix. Do this **before** the per-record fix or the CYA sites (which check `obligation.status` *first*) will silently ignore per-record status.

**Take (expensive, but it is the fix that matters):**
- **Per-record conditional mandate.** Change `buildImplication`'s 3 record branches to prefer `own.records[i].status ?? obligation.status`, which forces `allowListed` / `allowListedByPredicate` to return per-record *decisions* rather than a bare id list (`helpers.js:198-209`), and requires per-record retain-vs-purge in `purgeStorage`. This is the evaluator's return contract + the helper library + the 5 readers. It is the prerequisite for *anything* else B wants at depth (including a draft-vs-submit ctx, which cannot reach indexed obligations while status is static).

**Do NOT take:**
- **A's 4-operator `activatedBy` predicate language** as a replacement for `applyTo`. It would rip out B's central bet ("scope is a function"), which is also what derives record sets (`allowListed` with `projectionGroup`). B's closure form is *less* introspectable but *strictly more* expressive on the condition itself — A explicitly pushes arithmetic/multi-condition/external-state rules into controllers (`docs/obligation-model.md:139-143`, live proof at `features/commodities/consignment-details.controller.js:161-175`, the hand-coded "count ≥ existing identifier records" rule). B can express that in a closure; A cannot express it at all.
- **A's `enforcedAt` as-is.** If B wants page-locking, derive it from `mandatoryToProceed` + flow order (B has both) — do not import a second, obligation-owned proceed key that would collide with the flow-owned one. Note B today has **no gating concept at all** (grep for `prerequisite` / "cannot start" / `blocked` across the spike: zero hits), so this is a new page status, new hub rendering and route guards — medium, not cheap.

**What is load-bearing in B that A has no answer for:** the `domain` layer's `isComplete` (the only reason a proceed-gate can be generic), the flow-owned mandate (multi-flow), the i18n error key per mandate, and the `reasons` registry (16 constants, `obligations.js:54-139` — modelled, threaded, tested, and rendered nowhere: all 4 CYA prompt sites pass `because: []`).
