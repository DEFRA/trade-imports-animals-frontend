# L3 — mandate-model — C4 — adversarial verification

**Claim:** B has no minimum-instance / collection-floor mandate and *cannot* state "at least one commodity line"; A states it as data on two collections. In B a journey with zero commodity lines contributes zero mandatory concerns and can classify `fulfilled`.

**Verdict: AMENDED.**
The *behavioural* half is not only true, it is stronger than claimed — I found the reachable route to it and confirmed nothing anywhere stops it. The *structural* half ("cannot state") is the classic not-built/cannot-be-built conflation: B's `requires` slot, its `groupErrorCount` fold and its NA guard are already shaped to accept a floor. Cost is ~20-30 LOC across 3 sites with no change to any contract. (`L2-mandate-model.md:63` already drew this distinction and deliberately kept the floor out of its A-only-structural list; the claim as handed to me is stronger than the L2 it came from.)

---

## 1. Cited evidence — verified verbatim

| Citation | Verdict |
|---|---|
| B `engine/index.js:513` `if (!group?.requires?.anyOf) return []` | **Real.** |
| B `engine/index.js:517-520` iterates `groupImpl.records ?? []` | **Real** — `for (const record of groupImpl.records ?? [])`. Zero records ⇒ loop body never runs ⇒ `[]`. |
| B `classifyEntries` :386-410 derives NA/FULFILLED from `inScope.length` + `groupErrorCount` | **Real.** `if (inScope.length === 0 && groupErrorCount === 0) return NOT_APPLICABLE`; `totalMandatoryConcerns = mandatoryInScope.length + groupErrorCount`. |
| B `presentsForEach` over an empty record set contributes no entries (:258-270) | **Real.** `const records = impl?.records ?? []; for (const record of records) out.push(...)`. |
| B `anyOf` is the only invariant verb; only `unitRecord` carries it; `commodityLine` (`obligations.js:405-410`) has no `requires` | **Real.** `grep -rn "requires" --include="*.js"` over the whole spike returns exactly two declaration sites: `obligations.js:581` (`unitRecord`) and a test fixture. `commodityLine` is a bare `{ id, name }` — no `applyTo`, no `status`, no `requires`. |
| A `requiredAtLeastOne: true` at `features/commodities/obligations.js:108` (`animalIdentifiers`) and `:123` (`commodityLines`); enforced `engine/evaluate/complete.js:65` | **Real.** `if (obligation.requiredAtLeastOne && entries.length === 0) return false`. |

Every quoted line is real and means what the claim says it means.

---

## 2. Counter-example hunt on B — is there a floor anywhere?

Searched for any mechanism, anywhere in B's tree, that could put a floor under commodity lines:

- `grep -rni "at least one|atleastone|minimum|min:|minInstances|floor" --include="*.js"` over the whole spike. Only hits: `domain/index.js:88,767,808` (`integerMin` — a **value**-domain rule on scalar fields, e.g. `numberOfAnimals >= 1`; nothing to do with collection cardinality) and the `anyOf` invariant copy. **No collection floor.**
- Flow: `flow/flow.js:418-427` — the `commodity-lines-manage` subsection contains exactly one page, `commodity-lines-intro`, with **no `presents` at all** ("the Add / List / Delete actions live under bespoke `/lines` routes rather than in the flow itself"). Every commodity field is `presentsForEach ... forEachOf: commodityLine` (:439-481). With zero lines the entire commodity half of the flow presents nothing.
- Controllers: `features/commodity-lines/controller.js:223 → deleteCommodityLine(...)`; `lib/state.js:120-145` deletes the line's leaves with **no count guard** — the last line can be deleted. `features/start/controller.js` seeds no line. So **zero lines is reachable through the UI**, not a theoretical state.
- Line-derived singles do not save it: `cph`, `containsUnweanedAnimals`, `purposeInInternalMarket` use `anyAllowListed`/`branchedGate` returning `{ inScope: false }` when no line qualifies — with zero lines they leave scope entirely, contributing **zero** mandatory concerns rather than unfulfilled ones.
- Tests: `e2e-commodity-lines.test.js:228` ("deletes ALL line-scoped leaves — a fully-filled line disappears cleanly after Delete") deletes the only line and asserts nothing about journey or section status. No test anywhere covers zero-lines status.

**The behavioural half is CONFIRMED and understated.** With every notification-level mandatory filled and zero lines, the commodity section classifies `not-applicable` (`inScope.length === 0 && groupErrorCount === 0`, :386-388) and `journeyState` (:583-599) runs the same classifier over the remaining entries → `fulfilled`. B tells a user with no commodity lines that their notification is complete.

## 3. Counter-example hunt on B — is the floor *structurally* unstateable?

No. This is where the claim overreaches. Everything a floor needs already exists:

- **A declaration slot.** `requires` is an obligation-level extension slot on a group; `commodityLine` is free to carry `requires: { min: 1, errorCode }`. Nothing about the slot is `anyOf`-specific.
- **State to evaluate it against.** With zero lines the group implication is **not absent** — `buildImplication`'s `group` branch (`evaluator.js:457-467`) returns `{ inScope: true, records: [] }`, and `isInScope` (`evaluator.js:306-320`) defaults to *true* for an obligation with no `applyTo`. So `groupInvariantErrors`'s `if (!groupImpl?.inScope) return []` guard (:518) **passes** at zero records. The check has somewhere to stand.
- **A fold that already works at zero records.** `groupInvariantErrorsForContainer` (:561-570) collects groups via a **static walk of the flow's `presentsForEach.forEachOf` nodes** (`collectGroupsPresentedIn`, :548-556) — not from records — so `commodityLine` is still found when it has none. And `classifyEntries`' NA guard is `inScope.length === 0 && groupErrorCount === 0`: one group error at zero in-scope entries flips the section NA → `not-started` and the journey out of `fulfilled`, **with no change to the classifier**. The count-based encoding was built for exactly this.
- **The authors say so themselves.** `obligations.md` §H.2 (open questions): *"user-driven with min/max constraints — Deferred until a concrete journey makes a hybrid case real."* Named as deferred, not as out of model.

Honest retrofit cost (each site checked, not hand-waved):
1. `engine/index.js:513` — the early return `if (!group?.requires?.anyOf) return []` must branch on verb rather than assume `anyOf`; add a `min` arm emitting one instance-less error when `records.length < min`.
2. `contract.js:185` — `v4Obligations.filter((o) => o?.requires?.anyOf)` is a **second** copy of the same assumption and would silently skip a `min`-only group.
3. `features/check-your-answers/controller.js:318-320` — the prompt loop does `const [lineId, unitId] = err.instanceId.split('/'); if (!lineId || !unitId) continue`, so an instance-less error would be **silently dropped from CYA**; needs a branch.

~20-30 LOC, three sites, no contract or return-shape change. Compare with C2/C5 (per-record conditional mandate), which changes the evaluator's return contract *and* the helper library. **The floor is a missing verb, not a missing capability** — lumping it in with B's genuinely structural holes devalues those.

## 4. Counter-hunt on A — is A's floor as good as claimed?

Yes, and marginally better than the claim states. Beyond `complete.js:65`, `requiredAtLeastOne` is also read by `partRequired` (`engine/status.js:24`: `Boolean(obligation?.required || obligation?.requiredAtLeastOne)`), which is what makes an empty collection count as an *unsatisfied required part* in the hub/section roll-up rather than merely failing `collectionComplete`. A also carries the matching **ceiling** — `maxEntriesFrom` (`features/commodities/obligations.js:110`, read at `engine/evaluate/cardinality.js:22`), a *dynamic* cap keyed off a sibling count answer. B has neither bound. No A path ignores the floor.

---

## 5. Amended claim

> **B has no collection-floor verb and today cannot state "at least one commodity line" in data; A states it as data on two collections (`requiredAtLeastOne` on `commodityLines` and the nested `animalIdentifiers`, `features/commodities/obligations.js:108,123`), read both by `complete.js:65` and by `status.js:24`, and additionally carries a dynamic ceiling (`maxEntriesFrom`, `cardinality.js:22`). The consequence in B is live, not theoretical: the last commodity line can be deleted (`lib/state.js:120`, no count guard; no seed line at `/start`), the `commodity-lines-manage` subsection presents nothing (`flow/flow.js:420-427`), every commodity field is a `presentsForEach` over an empty record set, and the line-derived singles go `inScope: false` — so a zero-line journey contributes zero mandatory concerns and `journeyState` returns `fulfilled` (`engine/index.js:386-410`, `:583-599`). No test covers it. But this is an unbuilt verb, not a structural limit: `requires` is an existing extension slot, the group implication is `{ inScope: true, records: [] }` at zero lines (`evaluator.js:457-467`, `:306-320`), `collectGroupsPresentedIn` finds the group from a static flow walk rather than from records, and `classifyEntries`' `groupErrorCount` fold already turns a group-level error at zero records into NA → not-started. B's own doc lists min/max on user-driven groups as deferred (`obligations.md` §H.2). Cost to close: a `min` arm in `groupInvariantErrors` (`engine/index.js:513`), the mirror filter in `contract.js:185`, and an instance-less prompt branch in `features/check-your-answers/controller.js:318` — ~20-30 LOC, no contract change.**
