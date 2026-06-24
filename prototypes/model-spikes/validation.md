# Validation design (cross-cutting across all four spikes)

> Read [`README.md`](./README.md) first. Validation is **not** a fifth paradigm —
> it's a concern every spike must handle, and it interacts with each paradigm
> differently. This file is the shared design; each option backlog adds a short
> paradigm-specific note that points here.

## Guiding principle: validation is a decoupled adapter

The model is **portable data** (JSON / YAML) — it _declares_ constraints, it does
not _enforce_ them. Enforcement is a separate **validation adapter** that reads
the model's declared constraints. Joi / Zod / ajv / JSON Schema are
**implementations of that adapter**, never part of the model. One declaration,
consumed by whatever validator the runtime happens to use. (A Python consumer
could read the same constraints and validate with Pydantic — same model file.)

So there is **no hand-written Joi pile sitting next to the model**. If you find
yourself authoring a schema that restates the model's field constraints, stop —
the adapter should be _derived/compiled_ from the declared constraints.

## The four validation moments

Validation is not one event. There are four, at three boundaries:

| #   | Moment                         | Scope              | Shape it sees               | Output                                                                                       |
| --- | ------------------------------ | ------------------ | --------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Page submit**                | this page's fields | raw **form** payload        | field-anchored errors (`#dateOfBirth-day`) for the GDS error summary                         |
| 2   | **Within-page cross-field**    | this page          | raw form payload            | e.g. `excessAmount` required because `voluntaryExcess === 'yes'`; DOB is a real date ≥17     |
| 3   | **Journey-level completeness** | whole journey      | normalised answers          | the model's `missingRequired` — _navigational_, "you still need to…", **not** red errors     |
| 4   | **Whole-object**               | the full quote     | assembled **domain** object | validate all conditional requireds + holistic business rules, **transform**, send downstream |

Moments 1–2 are the contract's `validate(stepId, payload)` (page-slice). Moment 3
is `missingRequired(answers)` (already in the contract — it's completeness, not
hard validation). Moment 4 is `assembleQuote(answers) -> { ok, quote, errors }`.

## Constraints once, required-ness per context

Split the concept in two so we reuse without over-coupling:

- **Intrinsic constraints** — a field _is_ "a 9-digit numeric string", a date, an
  enum, ≤58 chars. **Declared once** on the model field; the **same** declaration
  feeds both page-slice and full-object validation. No duplication.
- **Required-ness + cross-field rules** — **contextual**, layered per boundary:
  - a **page** requires only its _own_ fields (a slice, `pick(fields).partial()`
    in schema terms — foreign fields allowed-but-absent);
  - the **full object** requires _everything applicable_ (all conditional
    required-when) **plus** the holistic business rules.

This is the "partial object built up, validated as a subset without foreign
required-ness, then fully validated at the end" approach — confirmed as the
direction. Neither "one big schema reused verbatim" nor "totally separate
schemas".

## Two shapes: form answers vs domain quote object — EXPLORE BOTH

The journey collects **form-shaped** answers (`{day,month,year}` strings,
`'yes'/'no'`, checkbox arrays); the downstream API wants a **domain** object (ISO
date, booleans, enums, nested structure). There's a transform between them, and
**we don't yet know where it should sit** — so each spike must try **both** and
report which is nicer in its paradigm (this is a rubric input, not a pre-decided
answer):

- **Two-shape** — validate the **raw form** payload at page submit (moments 1–2;
  gives clean field-anchored GDS errors), and do **assemble → transform →
  validate domain object** at the CYA→submit boundary (moment 4). Belt-and-
  braces: form-valid going in, domain-valid going out. Cost: two shapes to keep
  in step.
- **One-shape** — each page's collect **normalises immediately** to domain shape;
  validate the domain object throughout. Cost: mapping moment-1 errors back to
  form field ids (`#dateOfBirth-day`) is harder.

Capture the trade-off you hit in the spike's self-scoring notes.

## When does moment 4 run? Soft on load, hard on submit (decided)

- **Check Your Answers _load_** → **soft**: use `missingRequired` to show "you
  still need to…" prompts with change links. Navigational, no red errors.
- **Check Your Answers _submit_ (POST)** → **hard**: run `assembleQuote` —
  full-object validate + business rules + transform — as the gate to downstream.
  Block + surface errors (with change links back to the offending step) on
  failure.

Hard-validating on _load_ tends to dump errors before the user has acted, so we
don't.

## Business rules: which are portable data, which are adapter code?

Per-field constraints are obviously data. The interesting boundary is the
**holistic** rules at assembly (moment 4):

- **Portable as data** — cross-field comparisons and conditional requireds:
  `require excessAmount when voluntaryExcess = yes`, `driverAge >= 17`,
  `excessAmount <= vehicleValue`. Express these declaratively in the model so any
  consumer can enforce them.
- **Adapter code (not portable)** — anything procedural: external lookups, a
  pricing/premium service call, async reference-data checks. These live in the
  language-specific layer and are explicitly _out_ of the model.

Each spike should push as much as is reasonable into the declarative side and
**name the rules that wouldn't go** — that line is a key finding.

## Validation tech — an adapter choice, not a model choice

Because validation is decoupled, "Joi vs Zod" is just _which adapter the JS
runtime uses_, and the spikes deliberately differ so we can compare:

- Options **A / B / C** — **derive Joi** from the model's declared constraints
  (matches the real app under `src/server/**`, which already uses Joi). The Joi
  schema is _generated_ from the data, not hand-authored.
- Option **D** — the model's constraint layer **is JSON Schema** (portable,
  language-agnostic data); the validator is an adapter over it (ajv in JS; could
  equally be Zod or Pydantic). This is the purest expression of "constraints as
  portable data".

"Validation ergonomics" is a rubric dimension — how cleanly each paradigm
derives the page-slice and full-object validators, and how it handles the
business-rule boundary above.

## What every spike must demonstrate for validation

1. **Page-slice validation** for at least three field types incl. a
   formatted-string (registration / postcode) and the `voluntaryExcess →
excessAmount` within-page conditional — derived from the model, field-anchored
   errors.
2. **`assembleQuote(answers)`** — assemble + transform to a domain "insurance
   quote" object + full-object validation incl. one holistic business rule
   (e.g. `driverAge >= 17`). Returns `{ ok, quote, errors }`.
3. **Soft-on-load / hard-on-submit** wired on the shared Check Your Answers page.
4. **Both shape strategies tried** (two-shape and one-shape), with the trade-off
   recorded in the spike's self-scoring notes.
5. **Unit tests**: page-slice pass/fail incl. the within-page conditional;
   `assembleQuote` success produces the right domain object; `assembleQuote`
   failure reports errors with step provenance; a holistic business rule fires.
