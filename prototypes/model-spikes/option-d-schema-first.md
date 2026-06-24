# Option D — Schema-first (Zod / JSON-Schema)

> Agent-ready backlog. Read [`README.md`](./README.md) first — it owns the
> **shared acceptance bar** and the **common contract** every spike implements.
> This file only adds what's specific to Option D. Slug: `spike-d`.

## Goal & paradigm

Make a **typed schema the single source of truth** for the whole quote.
Field types and answer constraints come straight from the schema; conditional
requirements are expressed with schema composition (**discriminated unions** /
`dependentRequired`); completeness is **partial-validation** of the answers
against the schema, reporting what's missing. This spike stresses the
"constraints" half of the brief hardest and gives **runtime validation + static
types** for free.

Default to **Zod** (already idiomatic in the Node ecosystem; check
`package.json` and prefer it if present, else add it as a dev-only spike dep, or
fall back to a JSON-Schema validator like `ajv`). Crucially: the schema carries
**no rendering**. Render/order hints live in a **separate annotation map** keyed
by field.

## Model shape (concrete)

```js
// model/schema.js — the single source of truth (types + constraints only)
import { z } from 'zod'

const Claim = z.object({
  claimType: z.enum(['accident', 'theft', 'windscreen']),
  claimAmount: z.coerce.number().optional()
})

export const QuoteSchema = z
  .object({
    fullName: z.string().min(1),
    email: z.string().email(),
    dateOfBirth: z.object({
      day: z.string(),
      month: z.string(),
      year: z.string()
    }),
    postcode: z.string().regex(POSTCODE),
    registration: z.string().regex(REGISTRATION),
    yearsNoClaims: z.coerce.number().min(0).max(20)
  })
  .and(
    // conditional requirement via discriminated union on hadClaims
    z.discriminatedUnion('hadClaims', [
      z.object({ hadClaims: z.literal('no') }),
      z.object({ hadClaims: z.literal('yes'), claims: z.array(Claim).min(1) })
    ])
  )

// model/annotations.js — separate, render-agnostic field metadata + ordering
export const annotations = {
  steps: [
    'about-you',
    'your-vehicle',
    'driving-history',
    'claims',
    'cover-type',
    'optional-extras',
    'addons'
  ],
  fieldStep: {
    fullName: 'about-you',
    hadClaims: 'driving-history',
    claims: 'claims' /* ... */
  },
  // type hints the contract's fieldsFor needs but the schema doesn't carry:
  fieldType: {
    dateOfBirth: 'date',
    hadClaims: 'boolean',
    extras: 'multi-select',
    postcode: 'formatted' /* ... */
  }
}
```

The schema owns **what is valid**; `annotations` owns **which step a field
belongs to and how it's grouped/ordered** — never colours or macros.

## Contract implementation notes

The engine wraps the schema with a **partial validator**: `check(answers)` runs
the schema but treats "missing" distinctly from "invalid", yielding
`{ missing: [{ path, reason }], invalid: [{ path, message }] }`.

- `applicableSteps(answers)` — derive from the active union branch: when
  `hadClaims === 'yes'`, the `claims` branch is active so its step is
  applicable; otherwise not. Use `annotations.fieldStep` to map fields → steps.
- `status(answers, stepId, shape)` — over the step's fields: all present & valid
  ⇒ `complete`; some present ⇒ `partial`; none ⇒ `not-started`;
  not in the active branch ⇒ `not-applicable`. Terminal ⇒ `cannot-start` until
  full `QuoteSchema.safeParse(answers).success`.
- `next` / `prev` — schemas have **no native ordering**, so add a thin sequencer
  over `annotations.steps`, filtered to applicable steps, shaped by the
  descriptor (`linear` whole-list / `hub` terminal / `grouped` within-group).
- `applyAnswer(answers, stepId, payload)` — merge, then **strip** any keys not
  permitted by the now-active union branch (flipping `hadClaims` to `no` makes
  `claims` not part of the valid shape ⇒ drop it). The schema _defines_ what's
  cleared — no bespoke cleanup.
- `missingRequired(answers)` — map the partial validator's `missing[]` to
  `{ stepId, fieldId, because }`. Provenance comes from the **union branch**:
  e.g. `because: 'required by the hadClaims = yes branch'`. (This is the
  paradigm's weak spot — see risks — derive the reason from which branch made the
  field required.)
- `fieldsFor(stepId)` — fields whose `annotations.fieldStep === stepId`; `type`
  from `annotations.fieldType` (fallback: infer from the Zod node);
  `constraints` introspected from the schema (`min`/`max`/`regex`/`enum`).
- `validate(stepId, payload)` — `safeParse` the step's sub-schema; map issues to
  `{ fieldId, message }`. Reuse the schema's own messages.

## Three-variant wiring

The schema + annotations are shared; variants differ only by sequencer shape:

- **linear** — walk the applicable `annotations.steps` in order.
- **hub** — hub task list = `status` per applicable step; saves return to hub.
- **grouped** — `annotations` also defines `groups`; group status aggregates
  member `status`; navigate within a group via the sequencer.

Render via existing `njk` + `shared/fields.js`. Errors from `validate` map onto
the existing error-summary/field-error njk shape.

## TODO checklist (ordered)

1. Confirm/choose the validator (prefer existing Zod; else add a spike-scoped
   dep). Scaffold `prototypes/model-spikes/spike-d/`; register
   `/prototype/spike-d/...` and add to the chooser.
2. Write `model/schema.js` — the full car-insurance `QuoteSchema`, with the
   `hadClaims` discriminated union and a `voluntaryExcess → excessAmount`
   dependent requirement.
3. Write `model/annotations.js` — step membership, ordering, groups, and type
   hints. Keep it strictly render-agnostic.
4. Write `model/partial.js` — the partial validator distinguishing missing from
   invalid; then `model/contract.js` implementing the common contract + the thin
   sequencer.
5. Wire `variants/{linear,hub,grouped}.js`; reuse existing `njk`,
   `shared/fields.js`, `shared/store.js`; keep loop/subtask routes in the spike.
6. Write `dump.js` (headless JSON proof) for all three shapes; include
   `missing` vs `invalid` separation.
7. Unit tests — README examples plus: union-branch switching strips disallowed
   keys, dependentRequired, `validate` message mapping, missing-vs-invalid.
8. Point the Playwright demo suite at the three `spike-d` variants; make it pass.
9. Fill in `spike-d/README.md` with self-scoring notes against the rubric.

## Risks / watch-outs

- **Provenance is the weak spot.** Validation errors say _what_ failed, not
  _why a field was required_. You must reconstruct `because` from the active
  union branch / dependentRequired rule. If this gets ugly, say so in the rubric
  — comparing it against Option C's native provenance is a key finding.
- **Ordering/navigation is not in the schema.** The sequencer over `annotations`
  is essential; don't try to encode order in the schema.
- **Keep rendering out.** It's tempting to hang labels/hints on the schema —
  don't. They go in `annotations` (and even there, no colours/macros).
- **Partial validation ergonomics.** Zod's `safeParse` is all-or-nothing for a
  whole object; use `.partial()` / `.deepPartial()` or per-step sub-schemas to
  tell "not answered yet" apart from "answered wrongly". Nail this early — the
  whole status model depends on it.
