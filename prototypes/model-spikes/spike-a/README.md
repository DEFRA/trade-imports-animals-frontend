# Spike A — Declarative config + selectors

> Read [`../README.md`](../README.md) (acceptance bar + common contract) and
> [`../validation.md`](../validation.md) first, then
> [`../option-a-declarative-selectors.md`](../option-a-declarative-selectors.md).

The journey is **portable data** ([`model/journey.json`](./model/journey.json));
everything that executes is a runtime adapter that _reads_ it. `isComplete` is
gone — completeness is derived from each field's `required` constraint — and
`appliesWhen` is a condition object, so "X applies because of Y" falls straight
out as provenance.

## Layout

```
model/journey.json     the model — DATA, no code (the spike's IP)
runtime/               the adapter implementing the common contract
  model.js             reads journey.json via fs (proves data/adapter split)
  conditions.js        evalCondition + provenance over condition objects
  util.js              presence / humanize / age helpers
  selectors.js         the contract: applicableSteps/status/next/prev/…
validation/            the decoupled validation adapter
  compile.js           page-slice Joi *derived from* the model constraints
  assemble.js          assembleQuote: assemble→transform→validate (domain)
variants/              three thin wirings (linear / hub / grouped)
routes.js              registers /prototype/spike-a/...
dump.js                headless JSON proof (surface the model without its UI)
fixtures/              sample answer sets for dump.js + by-hand exploration
*.test.js              unit tests for runtime + validation
```

The three variants reuse the existing njk, `shared/fields.js`, `shared/store.js`,
and the model-agnostic harness in [`../shared`](../shared) (controller,
navigation, endings). Only the **contract** differs between spikes, so the four
are compared apples-to-apples.

## Run it

```bash
# headless state for a fixture, all three shapes + the assembled quote
node prototypes/model-spikes/spike-a/dump.js with-claims
node prototypes/model-spikes/spike-a/dump.js no-claims-partial

# unit tests (runtime + validation), no server
npm test

# the demo suite, pointed at spike-a's three variants
SPIKE_BASE=/spike-a npm run test:prototype
```

## Findings

### Did anything have to be code (not data)?

No part of the **model** needed a closure. Applicability, required-ness,
within-page conditionals and the holistic business rules are all condition
objects / rule records in `journey.json`. The only code is the adapter that
_interprets_ them, which is the design.

Two honest caveats where "derive from `required`" doesn't tell the whole story —
both pushed into the adapter, not the model:

- **Loop / subtask completeness.** `claims` (a loop) is complete on its
  `claimsDone` flag and `addons` (subtasks) on every selected add-on being
  finished — neither is a plain "required field present" check, so the adapter
  special-cases `kind: 'loop'` / `kind: 'subtasks'`. The model still declares
  their shape (`done`, `arrayKey`, the item fields) so validation stays derived.
- **Answered-but-empty.** `optional-extras` is "complete once answered" even with
  zero extras selected. Modelled as `extras` `required` + treating an empty array
  as satisfied — a small adapter rule, noted so the next paradigm can do better.

### Two-shape vs one-shape (validation.md)

The live journey uses **two-shape**: the store keeps form-shaped answers
(`{day,month,year}`, `'yes'/'no'`, checkbox arrays) so the shared partials render
unchanged, and `assembleQuote` does assemble→**transform**→validate to the domain
object only at the CYA→submit boundary. `toDomain` is exported and unit-tested.

- _Two-shape_ (chosen): clean GDS field-anchored errors at page submit; one
  transform, in one place, at the end. Cost: the transform must know every
  field's domain type.
- _One-shape_ (tried via `toDomain` at collect): would normalise each page to
  domain immediately, so there is a single shape throughout — but then page-slice
  errors have to be mapped back to `#dateOfBirth-day` form ids, and the partials
  would need domain→form rehydration. For a forms-first GDS journey the two-shape
  split is the lower-friction fit; recorded as the trade-off.

### Business rules that would NOT go declarative

`driverAge >= 17` and `excessAmount <= estimatedValue` are declarative rule
records (`kind: 'min-age'` / `kind: 'lte'`) the adapter interprets, with reasons
for provenance. What would **not** be portable data: the premium calculation
(`shared/premium.js`) and anything needing an external lookup (reference-data
checks, a pricing service). Those stay adapter code by design.

## Self-scoring against the rubric (1–5)

| Dimension                 | Score | Note                                                                                |
| ------------------------- | :---: | ----------------------------------------------------------------------------------- |
| Decoupling purity         |   5   | No njk/macros/tags in the model; rendering hints (`itemsFrom`) are field ids only.  |
| Portability               |   4   | Pure JSON read via `fs`; loop/subtask completeness lives in the adapter, not data.  |
| Conditional + provenance  |   4   | `appliesWhen`/`requiredWhen` are data, so `because` is free — but reasons are       |
|                           |       | synthesised by the adapter, not authored (Option C authors them).                   |
| Navigation rigour         |   4   | Index-into-applicable-list; correct + dead-end-free, but order is implicit in the   |
|                           |       | step array rather than a first-class graph (Option B).                              |
| Constraint/type modelling |   4   | Full type taxonomy + constraints as data; date stays a special case in `compile`.   |
| Validation ergonomics     |   4   | One Joi schema derived per step; page-slice and full-object share the declarations. |
| Add a new question        |   5   | Add one field object; status/validation/CYA all follow automatically.               |
| Add a new conditional     |   5   | Add an `appliesWhen` / `requiredWhen` object — provenance included.                 |
| Add a new journey shape   |   3   | Shapes live in the shared harness; a 4th means new `next`/`prev` cases there.       |
| Testability               |   5   | Pure functions, plain in/out; no server needed (see `*.test.js`).                   |
| Glue size per variant     |   5   | Each `variants/*.js` is ~3 lines; all flow is the contract.                         |
| Headless usability        |   5   | `dump.js` prints applicable/status/next/prev/missingRequired + the domain quote.    |
| Readability / onboarding  |   5   | Closest to today's `sections.js`; a new dev reads it as "config + selectors".       |

**Headline:** lowest-risk, closest-to-today, and the natural showcase for "model
is portable data". Its weak spots are exactly the brief's harder asks —
first-class navigation (Option B), authored provenance/holistic rules (Option C),
and constraints-as-portable-schema (Option D) — which the other spikes probe.
