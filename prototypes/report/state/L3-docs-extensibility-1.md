# L3 adversarial verification — DE-1 (docs-extensibility)

**VERDICT: AMENDED**

Claim under test: in A, a conditionally-required field forces the dev to hand-write the CYA
row three times (label, value formatter, visibility ternary restating an `activatedBy` the
model already knows); A's CYA never reads engine scope for row visibility; there are 4 such
restatements. In B the same field needs zero CYA edits.

---

## 1. The quotes are real

All verified at source, at the cited lines.

- `features/check-answers/controller.js:106-119` — exactly as quoted: `row('Region of origin
  code required', YES_NO_LABEL[answers.regionOfOriginCodeRequirement] ?? '', …)` followed by
  `...(answers.regionOfOriginCodeRequirement === 'yes' ? [row('Region of origin code', …)] : [])`.
- The rule *does* already exist as data: `features/origin/obligations.js:12-17` —
  `regionOfOriginCode = { id, required: true, activatedBy: { obligation:
  regionOfOriginCodeRequirement, equals: 'yes' }, wipeOnExit: true }`.
- `scope` appears in the whole `features/check-answers/` directory exactly twice, both at
  `:491-492` (the POST redirect). **"Never reads engine scope for row visibility" is literally
  true.**
- B's generic loop is real: `features/check-your-answers/controller.js:207-209`.

So the claim is not fabricated. But two of its load-bearing words do not survive.

---

## 2. REFUTED SUB-CLAIM: "forces". The visibility third is UNBUILT, not UNBUILDABLE.

This is the not-built-vs-cannot-be-built trap, and the claim falls into it.

`engine/read.js:27-35`:

```js
export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)
  return {
    inScope,
    has: (id) => inScope.has(id),
    answered: (id) => anyInstanceAnswered(answers, id),
    readyForCheckYourAnswers: readyForCheckYourAnswersFn(answers, inScope)
  }
}
```

`readViewOf` (`:37-41`) returns `{ journey, answers, scope }` — **the CYA GET already receives
`scope`**; it destructures only `{ journey }` (`controller.js:485-488`) and passes
`journey.answers` into `buildSections`. The scope object is sitting in the same return value,
unused.

And `inScope` is a `Set` of **pathKeys**, not ids (`engine/evaluate/reconcile.js:9-30`), so it
carries per-*instance* scope — it can answer "is `numberOfPackages` in scope on line 2?", not
just the top-level question.

**The pattern is already live in A, on exactly the conditionally-required-field case.**
`features/additional-details/controller.js:61` and `:67`:

```js
scope.has('containsUnweanedAnimals')          // :61 — GET, drives visibility
const showUnweaned = scope.has('containsUnweanedAnimals')  // :67 — POST, drives validation too
```

So A's page controllers consume engine scope generically for visibility; only the CYA
controller declines to. Replacing `...(answers.regionOfOriginCodeRequirement === 'yes' ? … )`
with `...(scope.has('regionOfOriginCode') ? … )` requires **no model change, no engine change,
no new API** — just threading the already-returned `scope` into `buildSections`. That is a
wiring miss, not a structural cost. The claim's "forces" is wrong.

---

## 3. AMENDED SUB-CLAIM: the count is 8+, not 4.

The claim cites `:111, :150, :301, :304` and counts 4. It only counted the *inline literal
ternaries* and missed the restatements that hide behind helper functions and service lookups.
Every one of these gates exists as `activatedBy` data in the model (all verified):

| CYA site | Restates | Model fact |
|---|---|---|
| `:111` | `regionOfOriginCodeRequirement === 'yes'` | `origin/obligations.js:15` |
| `:136` | `unweanedApplies(answers)` | `additional-details/obligations.js:9-13` |
| `:150` | `reasonForImport === 'internalMarket'` | `import-purpose/obligations.js:6` |
| `:253` | `packagesApply(entry.commoditySelection)` | per-line gate |
| `:275` | `transportReference.overlandMeans().includes(…)` | `transport/obligations.js:20-21` |
| `:301` | `transporterType === 'Commercial'` | `transport/obligations.js:32-33` |
| `:304` | `transporterType === 'Private'` | `transport/obligations.js:42-43` |
| `:376` | `cphApplies(answers)` | `cph-number/obligations.js:7-11` |

Two of these are **worse** than the claim alleges. `unweanedApplies`
(`additional-details/controller.js:13-18`) and `cphApplies` (`cph-number/controller.js:12-17`)
are hand-rolled JS reimplementations of `frame: 'anyItem'` predicates — they re-scan
`answers.commodityLines` and re-consult the commodity service list. That duplicates *business
data* (which commodities are unweaned / CPH-bearing), not merely a literal. And the same file
that exports `unweanedApplies` uses `scope.has('containsUnweanedAnimals')` two lines of code
later. So A carries a hand-rolled duplicate of a predicate whose correct implementation it
already calls.

The claim understates A's problem while overstating its structural-ness.

---

## 4. CONFIRMED SUB-CLAIM: the label + formatter thirds ARE structural in A.

I hunted for a per-obligation label/type registry in A and there is none. A's obligations carry
only `{ id, required, enforcedAt?, activatedBy?, wipeOnExit? }` — no copy, no type
(`origin/obligations.js` in full). `docs/obligation-model.md:36` says so deliberately: *"There
is deliberately no `type`, no copy, no widget choice and no validation…"* — and unlike several
of A's other docs, **the code honours this one**. `shared/kit.js` has no label map; its only
`label` is a parameter passed into `dateField`. Labels live in `.njk` templates and in
hand-written CYA row strings; value formatting is per-field (`YES_NO_LABEL`,
`countries.originLabel`, `certification.certificationLabel`, `dateText`, `partyLines`…).

So exporting the predicate — L1-A's suggested fix — collapses the *visibility* third and
nothing else. Label and formatter must still be hand-written per field, because there is no
type or copy on the obligation to derive them from. That half of the claim is sound, and it is
the half that actually matters.

---

## 5. B's "zero CYA edits" — mostly holds, with two limits the claim omits

I tried to break it and mostly failed.

- **Duplicate-label attack: FAILED.** B has multi-obligation pages (`flow/flow.js:121, 146,
  194, 217, 254, 335, 380`), and the CYA row key is `presentation.pageTitle`
  (`controller.js:139-151`), which smells like it would collide. It does not:
  `forObligation` (`lib/presentation.js:419-433`) keys `OBLIGATION_KEYS` **by `obligation.id`**,
  not by page. The field is merely *named* `pageTitle`. Worse for A, the fallback is
  `humaniseId(obligation.name)` (`:401-408`, `:421-427`) — so a brand-new obligation with **no
  presentation entry at all** still gets a serviceable CYA row. The genericity is real.
- **Limit 1 (real):** zero-edit holds for scalar / enum / array fields — i.e. the claim's own
  case. It does **not** hold for a new *composite* type. `formatSingle` special-cases
  `type === 'address'` (`:78-97`) and its own comment at `:98-104` concedes the gap: *"this only
  fires if a future composite obligation lands without a CYA-side formatter"* — falling back to
  `JSON.stringify`. A new composite type = a CYA edit in B.
- **Limit 2 (real, and material to a third option):** B's CYA is a **flat summary list**. A's
  has sections, cards, and per-species identifier tables (`buildSections:431-473`,
  `identifierTable:199-212`). Part of B's genericity is bought by having a simpler information
  architecture, not purely by a better model. Any third option that adopts B's generic loop must
  re-earn that grouping, and grouping would have to become model/flow data to stay derivable.

---

## 6. What is actually true

A's per-field CYA tax is **two-thirds structural, one-third self-inflicted**. The label and the
value formatter genuinely cannot be derived — A's obligation carries no type and no copy, by
design and in fact. The visibility gate, however, is already computed by the engine, already
exposed as `scope.has(id)` / a per-instance `inScope` pathKey Set, already returned to the CYA
GET, and already consumed for exactly this purpose by A's own additional-details controller.
A's CYA restates it 8+ times anyway, twice by re-implementing a `frame:'anyItem'` predicate in
longhand.

This changes the shopping list. "Thread `scope` into `buildSections`" is a cheap, same-day fix
that removes 8 restatements from A without touching the model — it should be listed as such,
not carried as evidence of a structural defect. The structural defect worth citing against A is
narrower and sharper: **no `type`, no copy on the obligation ⇒ label and formatter can never be
derived**, which is precisely what B's `domain` + `presentation` chain buys.
