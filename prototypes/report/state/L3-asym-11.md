# L3-asym-11 — n-ary conditional-mandate flip

**Capability:** "these 4 sibling fields are optional until any one is answered, then ALL become mandatory" (the consequence half, over multiple sibling values).
**Claimed direction:** B-only (A partial / B modelled-declaratively).
**Claim:** A CAN express the disjunctive floor ("≥1 of X,Y,Z answered") via `requiredOneOf`, but CANNOT express the consequence ("then the OTHERS flip to mandatory") because `required` is static (`complete.js:54`). Cost to close = a model-shape change (a derived per-sibling status the completeness walk reads).

## VERDICT: AMENDED (near-REFUTED)

The claim is wrong in two load-bearing ways. It misdescribes B's own code, and it misattributes A's limit to the wrong half of the mechanism. A genuine but far narrower gap survives.

---

## 1. B does NOT implement the "any one is answered" (n-ary) trigger — it implements a SINGLE-field trigger

B's shared `branchedGate` over the four accompanying-document siblings (`obligations/obligations.js:754-786`) is triggered by `documentTypePresent`, which tests **exactly one** field:

```js
const documentTypePresent = (fulfilments) =>
  isFilled(fulfilments[accompanyingDocumentType.id])
```

The comment immediately above it (lines 748-752) is explicit and is the whole ballgame:

> "The trigger is documentType specifically — not any of the four fields. A user who fills only a reference (without picking a type) does NOT lock in the whole block. See audit finding #15."

So B's actual, shipped behaviour is: **one specific field answered (documentType) → the other three flip to `mandatory`.** The "any one of the four" (n-ary disjunction) framing in the capability statement is *not* what B does, and B's author deliberately rejected it as the wrong reading of V4. The n-ary form is a *theoretical* capability of B's closure trigger that B does not exercise and that the domain says would be a bug here.

## 2. A expresses B's ACTUAL behaviour natively, with zero model change — the claim's "cannot flip the others" is false

The single-trigger → N-siblings-flip pattern is A's single most-used idiom: `required: true` + `activatedBy: {obligation, <predicate>}`, carried by **15** obligations. Live proof, structurally identical to the accompanying-documents case:

- `features/import-purpose/obligations.js:3-8` — `purposeInInternalMarket` is `required: true` **only when** `reasonForImport === 'internalMarket'`. A field that flips optional→mandatory on another field's answer.
- `features/transport/obligations.js:35-51` — `commercialTransporter` / `privateTransporter` each `required: true` gated by `transporterType` equalling a value.

The mechanism (`engine/evaluate/complete.js:24-42`, then `:54`):

```js
const referencedObligation = subObligation.activatedBy?.obligation
if (referencedObligation) {
  if (siblings.includes(referencedObligation)) {
    if (!applyPredicate(subObligation.activatedBy, entry?.[referencedObligation.id]))
      return true            // trigger absent → field treated complete (optional)
  } ...
}
return !subObligation.required || isAnswered(entry?.[subObligation.id])  // trigger present → required fires
```

`required` at `:54` is static, yes — but `activatedBy` **gates whether that line is reached at all**. When the trigger is absent, line 30 returns `true` (optional); when present, the static `required: true` fires. The *effective* mandate is therefore conditional. The claim cites `:54` as proof that "the others cannot flip to mandatory" while ignoring the `activatedBy` gate three lines above — the exact machinery that does the flip.

Modelling the accompanying-documents block in A, no engine change, same shape as the 15 live carriers:

```js
export const accompanyingDocumentType = { id: 'accompanyingDocumentType' }         // optional trigger
export const accompanyingDocumentAttachment = {
  id: 'accompanyingDocumentAttachment', required: true,
  activatedBy: { obligation: accompanyingDocumentType, present: true }, wipeOnExit: true }
export const accompanyingDocumentReference = {
  id: 'accompanyingDocumentReference', required: true,
  activatedBy: { obligation: accompanyingDocumentType, present: true }, wipeOnExit: true }
export const accompanyingDocumentDateOfIssue = {
  id: 'accompanyingDocumentDateOfIssue', required: true,
  activatedBy: { obligation: accompanyingDocumentType, present: true }, wipeOnExit: true }
```

`present: true` is a live operator (`engine/evaluate/predicate.js:24`: `if ('present' in activatedBy) return isAnswered(value) === activatedBy.present`). This is the whole of B's shipped behaviour, expressed declaratively in A. **The consequence half — flipping N siblings to mandatory on a condition — is not walled in A at all.** The only cosmetic difference is DRY: B shares one `branchedGate` reference; A repeats the same 3-line `activatedBy` on each field. That is a code-repetition difference, not an expressiveness one.

## 3. The claim also mis-credits A's floor

`requiredOneOf` (`complete.js:15-21`) is the **wrong** primitive for this capability and is a red herring. It makes "≥1 of the group **always** mandatory" (`groupSatisfied` fails when none answered). The capability wants the *opposite* base state — all-optional when none answered, all-mandatory once one is. So `requiredOneOf` gives you neither the floor this capability needs nor the flip. A's correct tool is `activatedBy` + `present` (§2), which the claim overlooks entirely while wrongly declaring the flip impossible.

## 4. The one real, narrow gap that survives — and it is on the TRIGGER, not the consequence

A's `activatedBy` references **exactly one** obligation (`subObligation.activatedBy?.obligation`), and the predicate vocabulary (`equals`, `includes`, `notInUnionOf`, `present`) has no OR **across several obligations' answeredness**. So the genuinely n-ary form — "field required when **ANY of siblings X, Y, Z** is answered" — cannot be stated in one declarative `activatedBy`. B's trigger is an arbitrary closure, so B *could* write `anyFilled = f => isFilled(a)||isFilled(b)||isFilled(c)` and drop it into `branchedGate`. That disjunctive-trigger power is real and B-only in the declarative layer.

But note what this gap is and is not:
- It is on the **condition (trigger)** — a disjunction over multiple fields' presence — **not** on the **consequence** (flipping siblings), which A does fine (§2). The claim attributes the wall to the consequence; the wall is actually on the trigger.
- **B does not use it** (§1), and V4/audit-#15 says the n-ary reading would be wrong for this block.
- A has two escape routes and neither is a model-shape change: (a) a new predicate operator that takes an obligation array — a direct sibling to the existing `notInUnionOf`, which **already** takes `activatedBy.notInUnionOf` as a list of obligations (`predicate.js:16-21`); ~a few lines in `applyPredicate`/`evalPredicate` plus the single-vs-list dispatch in `complete.js:24`. Or (b) A's documented pressure valve — `docs/obligation-model.md:139-143` explicitly routes "multi-condition logic" to a controller. Not "a derived per-sibling status the completeness walk reads"; A already reads per-sibling mandate conditionally via `activatedBy`.

## Amended claim + true cost

**Amended:** A fully expresses the *actual* accompanying-documents requirement — a single field (documentType) answered → the other three siblings flip to mandatory — declaratively and with no model change, via its standard `required: true` + `activatedBy: {obligation: documentType, present: true}` idiom (15 live carriers; `present` operator at `predicate.js:24`). B does the same via a shared `branchedGate` whose trigger is likewise a single field (`documentTypePresent`, `obligations.js:748-763`) — the "any one of four" n-ary framing is explicitly disclaimed in B's own comment and audit-#15. The only capability B has here that A lacks **declaratively** is a mandate *condition* that is a disjunction over several sibling fields' answeredness ("required when ANY of X,Y,Z is answered") — a **trigger-side** limit (A's `activatedBy` references one obligation and has no cross-obligation OR), **not** the consequence-side "flip the others to mandatory" the claim names. That narrow gap is closable by a bounded predicate-operator extension (a list-taking sibling of the existing `notInUnionOf`) or A's documented controller pressure valve — a small extension, not a model reshape — and it applies only to an n-ary form that B itself does not use and that the domain rules out for this block.

**True cost:** ~a handful of lines in `predicate.js` + the single-vs-list dispatch in `complete.js:24` for the disjunctive-trigger operator, IF ever needed. For the real requirement: zero — it is A's existing idiom.
