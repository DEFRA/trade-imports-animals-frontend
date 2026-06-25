# Spike C — Requirement-graph rules engine

> Read [`../README.md`](../README.md) + [`../validation.md`](../validation.md),
> then [`../option-c-rules-engine.md`](../option-c-rules-engine.md).

Two separate data files: a **typed answer-data model**
([`model/fields.json`](./model/fields.json) — flat fields, no flow) and a
**rules layer** ([`model/rules.json`](./model/rules.json)) that _derives_ which
fields/steps are required and records **why** as an **authored** reason.
[`runtime/engine.js`](./runtime/engine.js)'s `evaluate(answers)` produces the
requirement-graph snapshot; the contract is thin reads over it. Navigation,
status and validation reuse the shared harness / Joi / transform cores.

```bash
node prototypes/model-spikes/spike-c/dump.js voluntary-excess   # missingRequired first
npm test
SPIKE_BASE=/spike-c npm run test:prototype
```

## Findings

- **`because` is a first-class, _authored_ output** — the headline. `require`
  rules carry the exact sentence shown to the user
  (`"You chose to pay a voluntary excess"`); Options A/B/D _synthesise_ or
  _reconstruct_ the reason. Multi-reason provenance falls out naturally (a field
  required by two rules collects both reasons).
- **Data model vs rules cleanly split.** Intrinsic constraints (type/pattern)
  live on `fields`; required-ness/cross-field rules live on `rules`. Page-slice
  Joi is still derived from the intrinsic constraints (a `require` rule's `when`
  is surfaced as the field's `requiredWhen` for the shared validator), so
  format-checking and requirement-checking stay apart, as the backlog asks.
- **Same two engines, one rules layer:** `require` rules drive `missingRequired`;
  `assert` rules (`min-age`, `lte`) are the holistic business rules at
  `assembleQuote` — also declarative data with built-in reasons. Nothing in the
  model is a closure.
- **Navigation is a thin consequence**, not the paradigm's strength — `next`/
  `prev` are step-order + applicability (kept identical to A so the journeys
  match). "First incomplete required step" is the engine-native alternative.
- **Won't go declarative:** premium / external lookups — adapter code, same
  boundary as A/B. **Two-shape vs one-shape:** same conclusion as A (store
  form-shaped; transform at submit).

## Self-scoring against the rubric (1–5)

| Dimension                 | Score | Note                                                              |
| ------------------------- | :---: | ----------------------------------------------------------------- |
| Decoupling purity         |   5   | No rendering in fields or rules.                                  |
| Portability               |   4   | Pure JSON; loop/subtask completeness still adapter-side.          |
| Conditional + provenance  |   5   | **Best here** — `because` is authored, multi-reason, first-class. |
| Navigation rigour         |   3   | Derived from step order; not a graph (Option B wins this).        |
| Constraint/type modelling |   4   | Clean data-model/rules split; date special-cased in the compiler. |
| Validation ergonomics     |   5   | Rules engine _is_ the cross-field/business-rule layer.            |
| Add a new question        |   4   | Add a field; add a rule if it's conditionally required.           |
| Add a new conditional     |   5   | Add a `require` rule with a reason — provenance included free.    |
| Add a new journey shape   |   3   | Shapes in the shared harness; a 4th means new cases there.        |
| Testability               |   5   | `evaluate` is pure; snapshot asserts cleanly.                     |
| Glue size per variant     |   5   | `variants/*.js` ~3 lines.                                         |
| Headless usability        |   5   | `dump.js` leads with `missingRequired` + reasons.                 |
| Readability / onboarding  |   4   | "fields + rules + reasons" reads well; the fixpoint idea is new.  |

**Headline:** the provenance and business-rule champion — "X.3 because X.1" is
authored data, not reconstructed. Navigation is its softer edge (a consequence,
not first-class), which is exactly where Option B is strong.
