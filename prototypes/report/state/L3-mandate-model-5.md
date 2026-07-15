# L3 — Adversarial verification — mandate-model — C5

**Claim (C5):** *A's conditional mandate is per-collection-entry and cross-frame (same-frame, `enclosing`, `anyItem`), and value-retention on mandate-off is an opt-in one-key choice (`wipeOnExit`) — B has neither: B's only depth-level conditionality is scope, and scope-exit always purges.*

**Verdict: REFUTED.**

A = `clone-live-animals`, root `prototypes/standalone/live-animals/`.
B = `clone-flow-layer`, root `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.
All lines below were opened at source in this pass, not taken from L1/L2.

---

## 1. The cited lines are real. I am not disputing any of them.

- `engine/evaluate/reconcile.js:9-30` — in-scope set keyed by `pathKey(path)`; a collection index is part of the key. Real.
- `engine/evaluate/complete.js:23-42` — `entryComplete` returns `true` (i.e. skips the `required` check at :54) for a sub-obligation whose `activatedBy` fails *for that entry*: same-frame via `applyPredicate(…, entry[refId])` at :28-31, cross-frame via `evalPredicate(…, ctx.answers, ctx.frames)` at :35-40. Real.
- `engine/evaluate/predicate.js:38-62` — three frames: default (frames[0]), `enclosing` (:38-48), `anyItem` (:50-62). Real.
- `features/commodities/obligations.js:80-85` — `permanentAddress` = `required: true` + `enclosingCommodity(...)`. Real.
- `features/cph-number/obligations.js:4-13` — `countyParishHoldingCph` = `required: true` + `frame: 'anyItem'`. Real.
- `engine/evaluate/reconcile.js:32-38` — the wipe list filters on `obligation.wipeOnExit`, so the **engine default is retain**. Real.

The quotes hold. The claim still fails — on what they *mean*, and on what B actually contains.

---

## 2. Refutation 1 — A has no "conditional mandate". It has conditional **scope**, exactly like B.

`required` in A is a static literal everywhere. `grep -rn "requiredWhen\|requiredIf\|required:"` across A's `features/`, `engine/` and `docs/`: **44 hits, every one a bare `required: true` literal**; zero predicate-valued mandates, zero `requiredWhen`, in source, tests or docs. It is read with no state: `engine/status.js:23-24` (`Boolean(obligation?.required || obligation?.requiredAtLeastOne)`) and `engine/evaluate/complete.js:54` (`!subObligation.required || isAnswered(...)`).

A's own model doc says so (`docs/obligation-model.md:19,26-27`):

| key | kind (A's doc) | meaning (A's doc) |
|---|---|---|
| `required` | **mandate** | "This answer is owed before the obligation counts as complete." |
| `activatedBy` | **relationship** | "When it holds, this obligation is **in scope**." |
| `wipeOnExit` | **relationship** | "When this obligation **leaves scope**, destroy its stored answer." |

And out-of-scope in A is not "shown but optional" — it is **gone**: `flow/gates.js:17-27` gates a page out unless one of its collected obligations is in scope; `engine/status.js:59-61` returns `NA` when no part is in scope.

So the only per-entry variation A can express is **present-and-required ⟷ absent**. A cannot say "rendered and optional on cattle lines, rendered and mandatory on horse lines" at *any* depth — including notification level. `required` is static; there is no second lever.

That is the very thing L2/C2 named as B's structural hole. **A has the identical hole.** The claim's phrase "conditional mandate" is a category error: A's `activatedBy` is `inScope`, and B's `applyTo → {inScope}` is the same axis.

---

## 3. Refutation 2 — B has per-entry cross-frame conditionality, on the *same two live rules* the claim cites as A-only.

`obligations/helpers.js` (read in full):

- **same-frame:** `allowListed(gate, values, null, reasons)` → `filterAndProject` returns `records: passingKeys`, i.e. the gate obligation's own per-instance storage keys that pass (`helpers.js:189-201`). Live: `numberOfPackages` — `within: commodityLine`, `applyTo: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES, null, …)` (`obligations.js:469-474`). Exactly A's `numberOfPackages` (`features/commodities/obligations.js:11-18`).
- **`enclosing` equivalent:** `allowListed(gate, values, projectionGroup, …)` → records are the **gated group's instance paths whose ancestor prefix is a passing gate key** (`helpers.js:204-215`, `pathPrefix`). Live: `permanentAddress` — `within: unitRecord` (depth-2), `status: 'mandatory'`, `applyTo: allowListed(commodityCode, PERMANENT_ADDRESS_COMMODITIES, unitRecord, [permanentAddressReason])` (`obligations.js:706-717`). `commodityCode` is `within: commodityLine` (depth-1). **That is A's cited `permanentAddress` rule verbatim: per-unit-record, gated by the enclosing commodity line.** Same shape for `passport`/`tattoo`/`earTag`/`horseName` (`:631-669`), and the two inverse gates via `allowListedByPredicate` (`:680-704`) — B's answer to A's `notInUnionOf`.
- **`anyItem` equivalent:** `anyAllowListed` (`helpers.js:101-120`, docstring: *"Handles per-line-gate → notification-level-gated shape (e.g. CPH: 'any commodity line has a CPH-required code')"*). Live: `cph` (`obligations.js:510-519`) and `containsUnweanedAnimals` (`:546-555`). **That is A's cited `countyParishHoldingCph` rule, on the same field, with the same semantics.**

It is tested per-record, not just declared: `obligations/evaluator.test.js:582` *"keeps matching-line values, purges non-matching-line values (mixed)"*, `:797` same for `passport` across mixed lines, `:1002` for `permanentAddress` on a non-cats/dogs line.

"cross-frame (same-frame, `enclosing`, `anyItem`) … **B has neither**" is therefore **false on all three frames**, and false on **both** of the claim's own live exhibits.

---

## 4. Refutation 3 — the retention half is not merely wrong, it is inverted.

Two separate errors here.

**(a) A's `wipeOnExit` opt-in is unexercised.** `grep -rn "activatedBy\|wipeOnExit"` over A's `features/`: **15 obligations carry `activatedBy` and all 15 carry `wipeOnExit: true`** (import-purpose ×1, transport ×3, additional-details ×1, commodities ×8, origin ×1, cph ×1). Zero retain. The key exists in the engine; the manifest never uses it. So the "one-key choice" is real in `reconcile.js` and **dead in the model** — the claim credits a capability nobody wired up.

**(b) On mandate-off with retention, B does it and A structurally cannot.** Because A's mandate is static (§2), the *only* way to stop owing a field in A is to leave scope — which gates the page out and (given 15/15 `wipeOnExit`) destroys the value. B's `branchedGate` returns **both branches in scope** with a status swap, so the field stays visible, becomes optional, and the value survives `purgeStorage` (which only drops out-of-scope entries, `evaluator.js:346`).

Head-to-head on the **same field**:

| | A | B |
|---|---|---|
| region code, requirement flipped `yes → no` | `regionOfOriginCode` = `required + activatedBy + wipeOnExit: true` (`features/origin/obligations.js:12-17`) → leaves scope, page gates out, **value destroyed** | `regionCode` = `branchedGate(… , {inScope:true,status:'mandatory'}, {inScope:true,status:'optional'})` (`obligations.js:190-198`) → **stays in scope, downgrades, value retained**. Comment at :186-189 cites V4: *"the field itself is not purged on `no`"*. Tested: `evaluator.test.js:244`. |
| accompanying documents | 4 fields, flat `required: true`, **no gate at all** (`features/documents/obligations.js:1-19`) | one shared `branchedGate` → optional until a document type is picked, then all four mandatory, values retained either way (`obligations.js:754-786`); tested `evaluator.test.js:1140-1148` |

B has 5+ live mandate-off-with-retention obligations (`regionCode` + the 4-field document block) and, separately, purge-on-flip where the spec wants it (`purposeInInternalMarket`, `obligations.js:213-225`). It chooses per obligation, declaratively, in the same key. A has one behaviour and one only.

---

## 5. What actually survives

Exactly one narrow fragment, and it is not what the claim says:

**B has no per-obligation opt-out from scope-exit purge.** `purgeStorage` (`evaluator.js:333-379`) is unconditional: out-of-scope obligation → entry dropped (:346); derived-leaf record not in the `applyTo` record set → record dropped (:350-366). `grep -rn "wipeOnExit\|retain\|keepValue"` over B's `obligations/` + `engine/` returns no such flag. A's engine does have one (`reconcile.js:32-38`, default = retain), including per-collection-path. So "retain a *hidden, out-of-scope* value" is expressible in A's engine and not in B's — but A uses it **0 times out of 15**, and it is a strictly worse instrument than B's `branchedGate` for the real requirement (V4 wants the value kept **and still shown**, which A cannot do at all).

Retrofit cost, both directions, is trivial: one flag + one `if` in `purgeStorage` gives B the opt-out; nothing gives A the status swap short of making `required`/`status` state-dependent — which is a change to `engine/status.js`, `complete.js` and the hub roll-up, i.e. A's core.

**Net for the shopping list:** the third option needs a *per-record* status (neither side has it — A's `required` and B's record `status` are both static: `evaluator.js:477/490/505`) plus B's in-scope status-swap plus a per-obligation retain/purge flag. On this dimension the claimed A-only asymmetry does not exist; the real asymmetry runs the other way.

---

## 6. What I searched (counter-example hunt)

- A: read `engine/evaluate/{reconcile,complete,predicate}.js`, `engine/status.js`, `flow/gates.js`, `features/{commodities,origin,cph-number,documents}/obligations.js`, `docs/obligation-model.md:1-60`.
- A: `grep -rn "requiredWhen\|requiredIf\|required:"` over `features/ engine/ docs/` → 44 hits, all static literals. Hunted specifically for a state-dependent mandate in A. **Not found.**
- A: `grep -rn "activatedBy\|wipeOnExit"` over `features/` → 15 / 15, 1:1. Hunted for a single retaining conditional obligation. **Not found.**
- B: read `obligations/helpers.js` (all 216 lines), `obligations/evaluator.js:250-519` (`runApplicabilityDecisions`, `makeInScopeCheck`, `purgeStorage`, `buildImplication`), `obligations/obligations.js:186-235`, `:405-560`, `:600-790`; grepped its test file for purge/retain assertions.
- B: hunted for (i) a cross-frame depth gate — **found**, `allowListed(..., projectionGroup)` + `pathPrefix`; (ii) an "any entry" gate — **found**, `anyAllowListed`; (iii) mandate-off with value retention — **found**, `branchedGate`, 5 live uses, tested; (iv) a per-obligation purge opt-out — **not found** (the one thing the claim gets right).
