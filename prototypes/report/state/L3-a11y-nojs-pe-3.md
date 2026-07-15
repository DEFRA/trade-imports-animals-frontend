# L3 — Adversarial verification — C3 (a11y-nojs-pe)

**CLAIM:** Off-gate answer safety — A's headline model win — is matched and bettered by B:
A must opt in per obligation (`wipeOnExit` on 15 of 44) and its controllers hand-pick payload
keys, committing off-gate values and relying on the engine to undo the damage; B purges
out-of-scope fulfilments on EVERY evaluate with no opt-out AND accepts only payload keys
derived from the page's in-scope descriptors, making it mass-assignment-proof by construction.

**VERDICT: REFUTED.**

The claim has three limbs. Limb 1 (A's mechanism) is accurately quoted but mis-characterised.
Limb 2 (B purges, no opt-out) is **false in two independent ways**. Limb 3 (B's derived payload
whitelist) is **true and is a real B win**, but its A-side contrast is false.

---

## 1. The cited A evidence is real, and means what it says — with one correction

| Cite | Verified |
|---|---|
| `engine/write.js:11-18` | YES. `commit` = merge patch → `reconcile(answers)` → `destroyWiped(answers, wiped)` → `saveJourneyAnswers(...)`. The wipe happens **before** the save. |
| `features/origin/obligations.js:12-17` | YES. `regionOfOriginCode` carries `activatedBy` + `wipeOnExit: true`. |
| `features/origin/controller.js:79-91` | YES. The `values` map lists `regionOfOriginCode` unconditionally (`:82`), so an off-gate value does enter the patch. |
| "15 of 44 carry `activatedBy`, all 15 carry `wipeOnExit`" | YES — counted in `features/*/obligations.js`: import-purpose 1, transport 3, additional-details 1, commodities 8, origin 1, cph-number 1 = **15 `activatedBy`, 15 `wipeOnExit`**, and they pair 1:1. |

**Correction to limb 1.** "Relying on the engine to undo the damage" implies the bad value is
committed and then cleaned up. It is not. `state.commit` **is** the reconcile — the patch is
merged into an in-memory `answers` object, `destroyWiped` mutates that object, and only then is
it handed to `saveJourneyAnswers` (`write.js:13-16`). No off-gate value is ever written to
storage. A's store is clean at all times.

**The one A weakness the claim gestures at, and it is real:** `wipeOnExit` is a flag whose
default is *off*, nothing enforces `activatedBy ⇒ wipeOnExit` (grep found no lint, no contract
test, no purity guard on the pairing — only a spec convention at `spec/journey-spec.json:64`),
and **A's mapper reads raw `answers`, not scoped answers** (`services/persistence/records/notification-mapper.js:167-221`
— `answers.countryOfOrigin`, `answers.reasonForImport`, … with no scope filter). So an author
who forgets `wipeOnExit` on a new gated obligation ships the stale off-gate value into the
submitted notification. `destroyWiped` is A's *only* line of defence. That is a genuine soft
spot and belongs on the shopping list — as a **guard** (assert `activatedBy ⇒ wipeOnExit` at
boot, next to `assertObligationPurity`), not as an argument for B's model.

---

## 2. Limb 2 is false, count one: **B's purge never touches storage.**

`purgeStorage` is verified at `obligations/evaluator.js:93-99` (step 5 of every evaluate) and
`:346` (`if (!isInScope(obligation)) continue`). The quotes are real. But it returns a **new**
object, `amendedFulfilments` (`:341, :378`), which `evaluate` returns as `result.fulfilments`
(`:123-126`). **Nothing writes that object back to the session.**

Traced every state call in B (`grep -rn "writeFulfilments\|readFulfilments\|readState("`):

- `lib/state.js:42-44` — `readState(request) = evaluateState(readFulfilments(request))`. Purged view, computed per read.
- `lib/state.js:50-78` — `writeAnswer` starts from `const fulfilments = { ...readFulfilments(request) }` — the **raw** yar map, not the purged one — then `writeFulfilments`.
- Every other `writeFulfilments` caller (`state.js:102, 121, 187, 208`) likewise begins from `{ ...readFulfilments(request) }`.
- `routes.js` has **no** `yar` / `server.ext` / `onPostHandler` hook (grep: zero hits), so no lifecycle stage persists the amended map either.

**Consequence:** an out-of-scope fulfilment is filtered out of every derived view but **stays in
the session store for the life of the session, and is resurrected verbatim the moment the gate
re-opens** (purge is recomputed from raw storage each evaluate). B *hides*; A *destroys*.

The Layer-1 A read asked precisely this question — *"Any model with activation + wipe gets this;
check whether B wipes or merely hides"* (`L1-a11y-nojs-pe-A.md:266`). The source answer is:
**B merely hides.** The Layer-2 comparison did not check, and inverted the finding.

**Doc↔code disagreement:** `obligations.md:245` — *"When the obligation is fully out of scope,
its data is **actively cleared**."* The code clears it from a derived projection, not from
storage. (The evaluator's own JSDoc is scrupulous — it says `amendedFulfilments` throughout, and
`obligations.md:619` says "purged **from the amended fulfilments**". The `:245` summary is the
line that over-claims, and it is the line the claim leans on.)

**Not-built vs cannot-be-built:** persisting the purge in B is one line
(`writeFulfilments(request, readState(request).fulfilments)` after each write). This is a wiring
gap, **not** a structural limit — and it must be reported as such. But the claim asserts a
behaviour the code does not have today, and on a real service with a persisted draft the
difference is material (stale answers in the store, resurrectable, present in any raw
session/Redis/cookie dump; B's own `dump.js:58` is clean only because it reads through
`evaluateState`).

---

## 3. Limb 2 is false, count two: **B has an opt-out, uses it, and uses it on the claim's own exemplar.**

The claim's exemplar obligation is A's `regionOfOriginCode`. B models the same field —
`regionCode` — and **deliberately retains the off-gate value**:

```js
// Retain-value pattern: always in scope; mandatory when
// regionCodeRequirement === 'yes', optional otherwise. Stored values
// are kept across gate flips (V4 spec: the field itself is not purged
// on `no`).
export const regionCode = {
  applyTo: branchedGate(
    (fulfilments) => fulfilments[regionCodeRequirement.id] === 'yes',
    { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
    { inScope: true, status: 'optional' }          // ← never out of scope ⇒ never purged
  )
}
```
(`obligations/obligations.js:186-198`)

And B tests it as a feature:

- `obligations/evaluator.test.js:242-252` — *"Matches the V4 spec: regionCode is always in scope;
  flipping the requirement off downgrades status but **does not purge the stored value**"*;
  `expect(result.fulfilments[regionCode.id]).toBe('FR-75')` after the requirement flips to `no`.
- `obligations/evaluator.test.js:1140-1158` — a whole describe block named
  **"retain-value semantic"**: *"does not purge a stored value when the gate is off (extended
  form `whenFalse` keeps `inScope: true`)"*.
- `obligations.md:519` lists "Purge-on-flip scalar" as **one pattern among several** —
  `branchedGate(pred, whenInScope, { inScope: false })` — i.e. purging is exactly as opt-in in B
  as wiping is in A. The knob is just spelled differently: A's is `wipeOnExit: true/absent`;
  B's is `whenFalse: { inScope: false }` vs `{ inScope: true, status: 'optional' }`.

So on the single field the claim compares:
- **A destroys the off-gate answer before it reaches storage.**
- **B keeps it, on purpose, and asserts that it keeps it.**

That is not "matched and bettered". It is inverted. Note also the second-order consequence: because
B's `regionCode` is *always in scope*, it is always in the page's descriptor set — so B's derived
payload whitelist (limb 3) **accepts and stores** a `regionCode` submitted while the requirement is
`no`. The whitelist provides no off-gate protection here at all.

**The honest reading:** wipe-vs-retain on scope exit is a **product ruling**, not a model
capability, and the two sides ruled it differently from the same source. A's own
`spec/conflicts.json:155` (c-017) records the identical tension — *"the skeleton carries
previously saved values over when species are reselected (retain), while the IxD canvas steer is
'delete conditional data on change of determining condition'"* — and A defaulted to delete.
B read V4 as retain. **Both models can express both.** Neither has an asymmetric capability here.
The only true asymmetry is *where the default sits* (A: retain unless flagged; B: purge unless
the author writes an extended `whenFalse`) and *how deep the purge goes* (A: storage; B: view only).

---

## 4. Limb 3 — B's derived payload whitelist — is TRUE, and is the one part worth keeping

Verified `contract.js:224-251`: `validatePagePayload` calls `fieldsForPage(page, state, {}, options)`
→ `buildFieldDescriptors`, which drops out-of-scope entries (`lib/build-field-descriptors.js:67`
`if (!entryInScope(entry, state)) continue`), then reads `payload?.[id]` **per descriptor**.
Unknown keys are never looked at.

And it is genuinely universal: `grep -rn "request.payload\|payload\["` over the whole B tree
returns exactly **three** hits — `lib/page-controller.js:68`, `lib/line-page-controller.js:103`,
`lib/unit-page-controller.js:135` — and all three pass through `validatePagePayload`. Even the
bespoke `features/commodity-lines/` and `features/units/` controllers do not read raw payload
keys. One mechanism, derived from the model, no escape hatches. **This is a real B win and it
should go on the shopping list.**

**But the A-side contrast is false.** The claim implies A is exposed to mass assignment. It is
not: `grep -rn "\.\.\.payload\|\.\.\.request.payload\|Object.assign(.*payload"` over the whole A
prototype returns **zero** hits, and `grep -rn "payload\["` also returns **zero**. Every A
controller hand-picks named keys (`origin/controller.js:79-84` is representative). A is a
hand-written allowlist; B is a derived allowlist. Both reject unknown keys.

The defensible difference is therefore **derived vs hand-written**, and the failure modes differ:
- A's risk is *omission* — a controller forgets a key that its own template renders (silent data
  loss), or keeps committing a key the page no longer shows. 32 controllers, nothing enforces it.
- B's risk is *none of that* — the descriptor set is the payload contract.

"Mass-assignment-proof by construction" (implying A is mass-assignable) is not what the source
shows and should not be repeated.

---

## What I searched (so the next reader does not redo it)

- `grep -rn "wipeOnExit"` and `"activatedBy"` over A's prototype root → counted the 15/15 pairing;
  found **no** guard enforcing it (no boot assert, no contract test).
- `grep -rn "\.\.\.payload|payload\["` over A → zero. A has no mass-assignment surface.
- `grep -rn "request.payload|payload\["` over B → three hits, all via `validatePagePayload`.
- `grep -rn "writeFulfilments|readFulfilments|evaluateState|readState("` over B → every write
  path starts from raw storage; `amendedFulfilments` is never persisted.
- `grep -rn "yar|ext\(|onPreResponse|onPostHandler"` over B's `routes.js` → zero. No lifecycle
  write-back.
- `grep -rn "purge|out-of-scope"` over B's evaluator/integration/state tests → found the two
  **retain-value** tests (`evaluator.test.js:244, 1141`) that establish the opt-out.
- Read in full: A `engine/write.js`, `engine/evaluate/reconcile.js`, `features/origin/{obligations,controller}.js`,
  `services/persistence/records/notification-mapper.js` (heads); B `obligations/evaluator.js`,
  `lib/state.js`, `lib/page-controller.js`, `lib/build-field-descriptors.js`, `contract.js:180-290`,
  `obligations/obligations.js:180-212`, `obligations/helpers.js:128-154`.

## Corrections that should propagate to L2-a11y-nojs-pe.md

1. Delete "B does this *universally and without a flag*" and "A must opt in per obligation; B
   cannot opt out." B opts out via `branchedGate(..., { inScope: true, ... })`, and does so on
   `regionCode` — the exemplar.
2. Add: B's purge is a **read-time projection**; the out-of-scope value survives in the session
   store and resurrects on gate re-entry. A's `destroyWiped` mutates before save. If the third
   option wants destroy-on-exit it must add a write-back (one line) — and then it needs A's
   retain knob back, because V4/the skeleton wants retain in at least one place.
3. Reword the mass-assignment point to "derived allowlist vs hand-written allowlist". A is not
   mass-assignable.
4. New shopping-list item for A's side of the ledger: a boot guard asserting
   `activatedBy ⇒ wipeOnExit` (or an explicit `retainOnExit`), because A's mappers read raw
   answers and `destroyWiped` is the only thing standing between a forgotten flag and a stale
   value in the submitted notification.
