# Spike D — Schema-first (JSON Schema)

> Read [`../README.md`](../README.md) + [`../validation.md`](../validation.md),
> then [`../option-d-schema-first.md`](../option-d-schema-first.md).

A **standard draft-07 JSON Schema**
([`model/quote.schema.json`](./model/quote.schema.json)) is the single source of
truth for the quote's constraints — the purest "constraints as portable data".
A separate [`model/annotations.json`](./model/annotations.json) carries flow
(steps/order/groups/type hints) that JSON Schema has no concept of. Validators
are **adapters over the schema**.

```bash
node prototypes/model-spikes/spike-d/dump.js with-claims   # missing vs invalid
npm test
SPIKE_BASE=/spike-d npm run test:prototype
```

## Findings

- **Page-slice and full-object share one declaration.** The page-slice validator
  is a `pick`+`partial` over the same schema used by `assembleQuote` — D's
  strongest card. Completeness is **partial validation** that separates
  **missing** (not answered) from **invalid** (answered wrongly); status falls
  out of that distinction.
- **No ajv — on purpose.** Throwaway prototypes shouldn't add a runtime
  dependency, so this ships a ~90-line self-contained adapter
  ([`validation/schema.js`](./validation/schema.js)) over the JSON-Schema subset
  the model uses. The schema file is plain draft-07, so it is **ajv-, Zod- and
  Pydantic-loadable** — swapping in ajv is a one-adapter change. (Cross-language
  portability line: this same file would validate in a Python consumer.)
- **Provenance is the weak spot** (as the backlog predicts). Validation says
  _what_ failed, not _why a field was required_; `because` is **reconstructed**
  from the `if/then` that fired (`{ field: hadClaims, eq: yes }`), not authored.
  Directly contrast with Option C's authored reasons — a key finding.
- **`dependentRequired` is value-blind.** `voluntaryExcess → excessAmount` had to
  be a value-based `if/then` (`const: "yes"`), not `dependentRequired` (which
  fires on mere presence and would require the excess even when the answer is
  "no"). Recorded as a JSON-Schema modelling sharp edge.
- **What spilled into adapter code:** the holistic business rules
  (`driverAge >= 17`, `excessAmount <= estimatedValue`) — JSON Schema can't
  express cross-field arithmetic cleanly, so they live in the annotations'
  `businessRules` and run in the adapter. Ordering/flow is also adapter-side (the
  sequencer over `annotations.steps`). Loosely-typed claim items (`claimAmount`)
  are owned by the loop, not the schema.
- **Two-shape vs one-shape:** the schema is modelled over the **form** shape, so
  the journey stays two-shape (store form-shaped; `assembleQuote` transforms to
  domain). A one-shape variant would model the schema over the domain object and
  validate post-transform, but then page-slice errors lose their `#field-day`
  anchors — same trade-off A hit.

## Self-scoring against the rubric (1–5)

| Dimension                 | Score | Note                                                              |
| ------------------------- | :---: | ----------------------------------------------------------------- |
| Decoupling purity         |   5   | Schema + annotations both pure data; no rendering.                |
| Portability               |   5   | **Best here** — standard JSON Schema; ajv/Zod/Pydantic-loadable.  |
| Conditional + provenance  |   2   | `because` reconstructed from the keyword that fired (weakest).    |
| Navigation rigour         |   3   | Sequencer over annotations; JSON Schema has no ordering.          |
| Constraint/type modelling |   5   | **Best here** — types/constraints are the model itself.           |
| Validation ergonomics     |   5   | One declaration → page-slice + full-object; missing-vs-invalid.   |
| Add a new question        |   4   | Add a property + an annotation row; if/then for conditionals.     |
| Add a new conditional     |   3   | `if/then` works but is verbose; value-based gotcha.               |
| Add a new journey shape   |   3   | Shapes in the shared harness; a 4th means new cases there.        |
| Testability               |   5   | Pure `check`; missing/invalid asserts cleanly.                    |
| Glue size per variant     |   5   | `variants/*.js` ~3 lines.                                         |
| Headless usability        |   5   | `dump.js` shows partial validation + status + nav.                |
| Readability / onboarding  |   3   | JSON Schema `if/then/allOf` + a separate annotations file is more |
|                           |       | to hold in your head than A's config.                             |

**Headline:** the portability and constraint-modelling champion — the model is
literally a standard, language-neutral schema, and page-slice/full-object reuse
is native. It pays for that with the weakest provenance story (reconstructed, not
authored) and flow/business-rules that live outside the schema.
