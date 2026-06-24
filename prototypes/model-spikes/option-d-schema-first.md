# Option D — Schema-first (JSON Schema as portable constraints)

> Agent-ready backlog. Read [`README.md`](./README.md) and
> [`validation.md`](./validation.md) first — they own the **shared acceptance
> bar**, the **common contract**, and the **validation design**. This file only
> adds what's specific to Option D. Slug: `spike-d`.

## Goal & paradigm

Make a **declarative schema the single source of truth** for the whole quote's
constraints — and keep it **portable data**, not code. The constraint layer is
**JSON Schema** (a `.json`/`.yml` file): field types and answer constraints,
conditional requirements via `if/then` + `dependentRequired`, the whole-quote
shape. **Validators are adapters over it** — **ajv** in this JS runtime, but the
same JSON Schema could be enforced by Zod, or by Pydantic in a Python consumer.
This is the purest expression of the repo's "model is portable data, validation
is a decoupled adapter" principle, and it stresses the **constraints** half of
the brief hardest.

> This is the deliberate pivot from "Zod _is_ the model": Zod is JS code and a
> validator, so it can't _be_ the portable model. JSON Schema is language-neutral
> data; Zod (or ajv) is just one adapter that reads it. Completeness is
> **partial-validation** of the answers against the schema, reporting what's
> missing. The schema carries **no rendering**; render/order hints live in a
> **separate annotation file** keyed by field.

## Model shape (concrete)

```jsonc
// model/quote.schema.json — the single source of truth (types + constraints).
// Portable data: no JS, no Zod. An ajv (or Zod/Pydantic) adapter reads it.
{
  "type": "object",
  "properties": {
    "fullName": { "type": "string", "minLength": 1 },
    "email": { "type": "string", "format": "email" },
    "dateOfBirth": {
      "type": "object",
      "properties": {
        "day": { "type": "string" },
        "month": { "type": "string" },
        "year": { "type": "string" }
      }
    },
    "postcode": { "type": "string", "pattern": "<POSTCODE>" },
    "registration": { "type": "string", "pattern": "<REGISTRATION>" },
    "yearsNoClaims": { "type": "integer", "minimum": 0, "maximum": 20 },
    "hadClaims": { "enum": ["yes", "no"] },
    "claims": { "type": "array", "items": { "$ref": "#/$defs/claim" } }
  },
  "required": [
    "fullName",
    "email",
    "dateOfBirth",
    "postcode",
    "registration",
    "hadClaims"
  ],
  // conditional requirement, as data — no discriminated-union code:
  "if": { "properties": { "hadClaims": { "const": "yes" } } },
  "then": {
    "required": ["claims"],
    "properties": { "claims": { "minItems": 1 } }
  },
  // within-page dependent requirement, as data:
  "dependentRequired": { "voluntaryExcess": ["excessAmount"] },
  "$defs": {
    "claim": {
      "type": "object",
      "properties": {
        "claimType": { "enum": ["accident", "theft", "windscreen"] },
        "claimAmount": { "type": "number" }
      },
      "required": ["claimType"]
    }
  }
}
```

```yaml
# model/annotations.yml — separate, render-agnostic flow metadata (also data)
steps:
  [
    about-you,
    your-vehicle,
    driving-history,
    claims,
    cover-type,
    optional-extras,
    addons
  ]
fieldStep: { fullName: about-you, hadClaims: driving-history, claims: claims } # ...
# type hints fieldsFor needs that JSON Schema doesn't carry 1:1:
fieldType: {
    dateOfBirth: date,
    hadClaims: boolean,
    extras: multi-select,
    postcode: formatted
  } # ...
groups: # for the grouped variant
  - { title: About you and your vehicle, stepIds: [about-you, your-vehicle] }
```

The JSON Schema owns **what is valid**; `annotations` owns **which step a field
belongs to and how it's grouped/ordered**. Both are data; neither carries
colours or macros.

## Contract implementation notes

The adapter wraps the JSON Schema with a **partial validator** (ajv compiled
once): `check(answers)` distinguishes "missing" from "invalid", yielding
`{ missing: [{ path, reason }], invalid: [{ path, message }] }`.

- `applicableSteps(answers)` — derive from the active `if/then`: when
  `hadClaims === 'yes'`, the `then` makes `claims` required, so its step is
  applicable; otherwise not. Use `annotations.fieldStep` to map fields → steps.
- `status(answers, stepId, shape)` — over the step's fields: all present & valid
  ⇒ `complete`; some present ⇒ `partial`; none ⇒ `not-started`;
  not made applicable by the active `if/then` ⇒ `not-applicable`. Terminal ⇒
  `cannot-start` until the full schema validates `answers`.
- `next` / `prev` — JSON Schema has **no native ordering**, so add a thin
  sequencer over `annotations.steps`, filtered to applicable steps, shaped by the
  descriptor (`linear` whole-list / `hub` terminal / `grouped` within-group).
- `applyAnswer(answers, stepId, payload)` — merge, then **strip** any keys the
  active `if/then` no longer permits/requires (flipping `hadClaims` to `no` drops
  `claims`). The schema _defines_ what's cleared — no bespoke cleanup.
- `missingRequired(answers)` — map the partial validator's `missing[]` to
  `{ stepId, fieldId, because }`. Provenance comes from **which `if/then` (or
  `dependentRequired`) made the field required** — e.g.
  `because: 'required when hadClaims = yes'`. (This is the paradigm's weak spot —
  see risks — you reconstruct the reason from the schema keyword that fired.)
- `fieldsFor(stepId)` — fields whose `annotations.fieldStep === stepId`; `type`
  from `annotations.fieldType` (fallback: infer from the schema node's
  `type`/`format`); `constraints` read straight from the schema node
  (`minimum`/`maximum`/`pattern`/`enum`/`minLength`).
- `validate(stepId, payload)` — compile a **sub-schema** for the step's fields
  (`pick` those `properties`, intersect `required` with the step) and validate
  the raw payload; map ajv errors to `{ fieldId, message }`.

## Three-variant wiring

The schema + annotations are shared; variants differ only by sequencer shape:

- **linear** — walk the applicable `annotations.steps` in order.
- **hub** — hub task list = `status` per applicable step; saves return to hub.
- **grouped** — `annotations` also defines `groups`; group status aggregates
  member `status`; navigate within a group via the sequencer.

Render via existing `njk` + `shared/fields.js`. Errors from `validate` map onto
the existing error-summary/field-error njk shape.

## Validation & portability

See [`validation.md`](./validation.md). Option D **is** the validation spike —
its model _is_ the constraint schema — so it must showcase the decoupled-adapter
story end to end.

- **The model is the JSON Schema file + the annotations file — both data.** No
  Zod in the model. The ajv adapter is the only thing that executes.
- **Page-slice vs full-object reuse is native here:** the page-slice validator is
  a `pick`+`partial` sub-schema of the same JSON Schema used for `assembleQuote`.
  One constraint declaration, two compiled validators. This is D's strongest card
  — make the reuse obvious.
- **`assembleQuote`** validates the full schema, then **transforms** form answers
  → domain quote object (ISO date, booleans, enums). Try expressing the transform
  as **data too** (a declarative field-map) vs as adapter code — note which is
  nicer (feeds the "explore both shapes" finding).
- **Holistic business rules** (`driverAge >= 17`, `excessAmount <=
estimatedValue`) that JSON Schema can't express cleanly are the honest edge:
  put what fits in `if/then`, and record what spilled into adapter code.
- **Cross-language proof (cheap, optional):** the same `quote.schema.json` can be
  fed to a non-JS validator — even just noting "this file is ajv- _and_
  Pydantic-loadable" supports the portability rubric line.

## TODO checklist (ordered)

1. Choose the JS validator adapter (**ajv** for JSON Schema; check `package.json`,
   else add a spike-scoped dep). Scaffold `prototypes/model-spikes/spike-d/`;
   register `/prototype/spike-d/...` and add to the chooser.
2. Write `model/quote.schema.json` — the full car-insurance schema, with the
   `hadClaims` `if/then` and the `voluntaryExcess → excessAmount`
   `dependentRequired`. **Data only — no JS.**
3. Write `model/annotations.yml` — step membership, ordering, groups, and type
   hints. Keep it strictly render-agnostic.
4. Write `validation/partial.js` — the ajv-backed partial validator
   distinguishing missing from invalid, plus the page-slice `pick` and
   `assembleQuote`; then `runtime/contract.js` implementing the common contract +
   the thin sequencer.
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
- **Partial validation ergonomics.** Whole-object validation is all-or-nothing;
  you must tell "not answered yet" (missing) apart from "answered wrongly"
  (invalid). With ajv, compile per-step `pick`+`partial` sub-schemas and treat
  `required` failures as _missing_, other keywords as _invalid_. Nail this early
  — the whole status model depends on it.
- **Don't drift back to Zod-as-the-model.** Zod is fine as the _adapter_ if you
  prefer its API, but it must be generated from / kept in sync with the JSON
  Schema data — the portable `.json` is the source of truth, not the Zod code.
