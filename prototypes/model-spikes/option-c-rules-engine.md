# Option C — Requirement-graph rules engine

> Agent-ready backlog. Read [`README.md`](./README.md) first — it owns the
> **shared acceptance bar** and the **common contract** every spike implements.
> This file only adds what's specific to Option C. Slug: `spike-c`.

## Goal & paradigm

Separate two things that the other paradigms blend:

1. a **typed answer-data model** — flat fields, each with a type + constraints;
2. a declarative **rules layer** that, from the current answers, _derives_ which
   fields/steps are **required**, **satisfied**, or **unlocked** — and records
   **why** as provenance edges.

This is the best fit for the brief's headline example — _"part X.3 needs
completing **because** of the answer given in X.1"_ — because "because" is a
first-class output. Navigation is a thin consequence: `next` = the first
incomplete required step. The three variants are three **presentations of the
same requirement graph**.

## Model shape (concrete)

```js
// model/fields.js — the typed answer-data model (no flow, no rendering)
export const fields = {
  hadClaims:    { step: 'driving-history', type: 'boolean',  required: 'always' },
  claimType:    { step: 'claims',          type: 'radio',    options: [...] },
  claimAmount:  { step: 'claims',          type: 'currency' },
  coverType:    { step: 'cover-type',      type: 'radio',    required: 'always', options: [...] },
  // ...one entry per answer...
}

// model/rules.js — declarative requirement rules; each rule has a reason
export const rules = [
  {
    id: 'claims-required-when-had-claims',
    when: { field: 'hadClaims', eq: 'yes' },
    require: ['claimType'],                 // (and the claims loop applies)
    reason: 'You said you have had a claim in the last 5 years'
  },
  {
    id: 'excess-amount-when-voluntary',
    when: { field: 'voluntaryExcess', eq: 'yes' },
    require: ['excessAmount'],
    reason: 'You chose to pay a voluntary excess'
  }
  // unconditional requirements come from field.required === 'always'
]

// steps are presentation groupings of fields; order is data
export const stepOrder = ['about-you', 'your-vehicle', 'driving-history',
  'claims', 'cover-type', 'optional-extras', 'addons']
```

The **requirement graph** is computed from `fields` + `rules` + `answers`: nodes
are fields/steps, edges are "required-by" with the rule's `reason` attached.

## Contract implementation notes

Engine core: `evaluate(answers)` → a derived snapshot
`{ requiredFields: Map<fieldId, reasons[]>, satisfied: Set, unlocked: Set }`.
All contract functions are thin reads over this snapshot — keep `evaluate` pure
and memoised per `answers`.

- `applicableSteps(answers)` — a step is applicable if any of its fields are
  required or already answered (the conditional `claims` step appears once
  `hadClaims === 'yes'` triggers its rule).
- `status(answers, stepId, shape)` — over a step's **required** fields:
  all satisfied ⇒ `complete`; some ⇒ `partial`; none ⇒ `not-started`;
  no required fields and not applicable ⇒ `not-applicable`. The terminal step is
  `cannot-start` while any required field is unsatisfied.
- `next(answers, currentStepId, shape)` — `linear`: the first incomplete
  required step at/after current in `stepOrder`. `hub`: `{ terminal: 'hub' }`.
  `grouped`: the first incomplete required step within the current group, else
  `{ terminal: 'hub' }`.
- `prev` — the previous applicable step in `stepOrder` (group-bounded for
  `grouped`).
- `missingRequired(answers)` — straight from the snapshot: each unsatisfied
  required field with its `because` = the `reason`(s) of the rule(s) that
  required it. **This is the paradigm's showcase output.**
- `applyAnswer(answers, stepId, payload)` — merge, re-`evaluate`; any field that
  was required and is no longer required gets cleared (drops the claims loop +
  data when `hadClaims` flips to `no`) — generic, rule-driven, no bespoke code.
- `fieldsFor` / `validate` — `fieldsFor(stepId)` = fields whose `step === stepId`
  (with their type + constraints); `validate` checks constraints **and** that
  currently-required fields are present.

## Three-variant wiring

All three variants consume the **same snapshot**; they differ only in how they
present it:

- **linear** — walk `next` through incomplete required steps.
- **hub** — the hub task list is `status` per applicable step; every save
  returns to the hub.
- **grouped** — steps bucketed into groups (data), group status aggregates its
  members' `status`; within a group, navigate via `next`/`prev`.

Render via existing `njk` + `shared/fields.js`. A nice demo affordance (optional
but cheap here): surface the `because` reason on the hub next to a required-but-
incomplete task, since the engine already produces it.

## Validation & portability

See [`validation.md`](./validation.md) for the shared design. Option C is the
natural fit for the **business-rule** half of validation — the rules engine
_is_ the cross-field/conditional validation layer.

- **Author `fields.yml` + `rules.yml` as data**, no closures. `when` is a
  condition object; `reason` is a string. The engine (adapter) interprets them.
- **Two rule kinds, one engine:** _required-when_ rules (already the paradigm)
  drive `missingRequired`; add _assertion_ rules (`driverAge >= 17`,
  `excessAmount <= estimatedValue`) that the engine evaluates at `assembleQuote`
  with provenance reasons. This is where C shines vs the others — the holistic
  business rules are declarative data with built-in "because".
- **Intrinsic field constraints** (type/format/pattern) are separate from rules —
  declared on `fields`, compiled to **Joi** for the page-slice (same
  derive-from-data rule). Don't fold format-checks into the rules engine; keep
  "is this a valid postcode string" (intrinsic) apart from "is this required /
  consistent" (rules).
- **Try both shape strategies** (two-shape vs one-shape) and record the trade-off.

## TODO checklist (ordered)

1. Scaffold `prototypes/model-spikes/spike-c/`; register `/prototype/spike-c/...`
   and add to the chooser.
2. Write `model/fields.js` (typed answer-data) and `model/rules.js` (declarative
   requirement rules with reasons) for the full car-insurance journey.
3. Write `model/engine.js` — `evaluate(answers)` producing the requirement-graph
   snapshot; pure + memoised. Define `condition` evaluation (`when`).
4. Implement the common contract in `model/contract.js` over the snapshot.
5. Wire `variants/{linear,hub,grouped}.js`; reuse existing `njk`,
   `shared/fields.js`, `shared/store.js`; keep loop/subtask routes in the spike.
6. Write `dump.js` — and make the JSON prominently include `missingRequired`
   with reasons, since that's this spike's signature.
7. Unit tests — README examples plus: a rule firing/retracting, multi-reason
   provenance (a field required by two rules), cascade clear on retraction.
8. Point the Playwright demo suite at the three `spike-c` variants; make it pass.
9. Fill in `spike-c/README.md` with self-scoring notes against the rubric.

## Risks / watch-outs

- **Determinism & ordering.** With many rules, make `evaluate` order-independent
  (compute the fixpoint, don't depend on rule array order). Test that adding a
  rule in a different position doesn't change outputs.
- **No cycles.** Keep rules acyclic (a required field shouldn't, via its own
  presence, change whether it's required). Add a guard/test if you allow rules
  to depend on derived state.
- **Navigation is derived, not declared.** "First incomplete required step" must
  not strand the user on an always-optional step; make sure the terminal becomes
  reachable exactly when `missingRequired` is empty.
- **Don't smuggle flow into rules.** Rules express _requirement_, `stepOrder`
  expresses _sequence_. Keep them separate or you've reinvented Option B.
