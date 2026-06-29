# Obligations — working definition

> **Status:** working notes from an in-progress design discussion. Some items
> are settled; one is open (see §What's still open). Update this file as the
> concept evolves.
>
> **Last updated:** 2026-06-29

## Context

We're working in `trade-imports-animals-frontend/prototypes/` — five
implementations of a sample insurance journey (one hand-written prototype plus
four model-spikes A/B/C/D, each exploring a different paradigm for
representing the journey as a render-agnostic model). Interaction design's
canvas notes (`Notes from chat with interaction design.canvas` and the
triaged [`interaction-design-todo.md`](./interaction-design-todo.md)) use the
word **obligation** — but **no concept by that name exists in any of the five
implementations**. The closest existing primitive is Spike C's `require`
rules in [`spike-c/model/rules.json`](./spike-c/model/rules.json) (rules with
authored `reason` strings that demand fields).

We are iteratively defining what an "obligation" means, with the goal of
nailing a precise enough spec to (a) judge paradigm fit, (b) potentially
retrofit one or more spikes, and (c) treat it as the **journey-agnostic
core**, with journeys as adapters over it.

## Working definition

An **obligation** is a discrete unit that contributes to the user completing
the journey. The current sketch shape:

```jsonc
{
  "id": "1234",
  "name": "dateOfBirth",
  "type": "date",
  "activations": [
    {
      "when": "...",
      "reason": "Age verification (insurance regulation)",
      "status": "mandatory"
    },
    {
      "when": "...",
      "reason": "Marketing personalisation",
      "status": "optional"
    }
  ]
  // completionPolicyOverride?: ...   (rare; falls back to journey default)
}
```

### Key properties (settled)

| Property                                            | Decision                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**                                        | Yes — every obligation has a stable `id`; can be referenced from multiple places.                                                                                                                                                                                    |
| **Type**                                            | A single data type (the type of what gets produced). Open type space — `date`, `string`, `email`, `file`, `boolean`, `address`, `payment-receipt`, etc.                                                                                                              |
| **Activations**                                     | One or more. Each activation is a condition + an authored user-facing `reason` + a per-activation `status` (mandatory / optional).                                                                                                                                   |
| **Effective status when multiple activations fire** | "Most restrictive wins" — if any activation says mandatory, the obligation is mandatory for journey completion.                                                                                                                                                      |
| **Status flip while in scope**                      | An obligation can move between mandatory and optional based on later answers, without leaving scope. Data is preserved across status flips.                                                                                                                          |
| **Scope exit**                                      | When all activations leave scope, the obligation is fully out of scope and its data is **actively cleared** (consistent with the canvas "delete conditional data" steer).                                                                                            |
| **Convergent obligations**                          | A single obligation can be brought into scope by multiple reasons (multi-activation). The data remains unitary — edits from one presentation propagate to others. There are NOT two obligations on the same field; there's one obligation with multiple activations. |
| **Completion policy**                               | Three modes need supporting per journey: silently-skipped / must-address / gate-collected at end. Resolved per-journey default with per-obligation override.                                                                                                         |
| **Sub-journey results**                             | A sub-journey could return: a boolean done/not-done; a single typed value filling one parent obligation; or a typed value satisfying multiple parent obligations. All three need supporting.                                                                         |
| **Kind taxonomy**                                   | Open / extensible. New kinds (agreement, payment, identity-verification, schedule, third-party-action …) can be added without changing the obligation's outer shape.                                                                                                 |

## The journey-agnostic insight

The obligations model is **journey-agnostic**. Multiple journeys of different
types — internal CRM, polished public web, mobile, quick prototype, fully
designed customer journey — should all be able to **satisfy the same
obligations** with different presentation layers. Two journey implementations
can coexist over the same obligations (e.g. a skeleton for quick validation
alongside a polished version), which doubles as a regression-check.

The converse rule: **anything the user submits on a form (excluding auth and
other cross-cutting concerns) should map to an obligation.**
Pure-presentational pages (start screens, "what you'll need", confirmation,
error pages, hub views) and non-data UI affordances (language toggles,
accessibility controls) are journey furniture and live entirely in the
journey layer.

### Layering

- **Layer 1 — Obligations** (`obligations.json` or similar): journey-agnostic.
  Identity, type, activations, constraints, retention rules. Knows nothing
  about pages or how data is acquired.
- **Layer 2 — Journey** (one per journey implementation): references
  obligations by id. Declares pages, ordering, grouping, per-page hard/soft
  mandate (page-level "must answer to Save and continue"), copy/labels/hints,
  acquisition mechanisms (form input, file upload, NI lookup, sub-journey…).

### Pages reference obligations (settled)

```jsonc
// journey.json — example
{ "page": "dob-page", "presents": ["dob"] }
```

A page declares which obligations it asks about. The obligation has no notion
of where it's shown. Pages are the composition unit; obligations are the
contract.

### Acquisition methods are journey-side

A single obligation might be acquired multiple ways (manual DOB entry vs
NI-lookup-then-extract). **These ways are NOT properties of the obligation** —
the obligation just sees a typed value arrive in its field. Acquisition
methods and their UI mechanisms are entirely journey-layer composition.
Provenance ("which method was used") becomes journey-side metadata, not an
obligation concept.

### Two distinct "mandatory" concepts

These are independent:

1. **Mandatory at save and continue** — a page-level constraint that blocks
   the form submission until the field is filled (the existing prototype's
   `fullName` pattern). Lives on the page in the journey layer.
2. **Mandatory for journey completion** — the obligation-level mandate. The
   journey can't complete (e.g. can't get the quote) until satisfied, but
   pages presenting it can be soft (let the user skip and come back) or hard
   (block save).

A single mandatory obligation can have hard presentations and soft
presentations in different parts of the same journey.

### "Kinds" collapse

Earlier we listed "kinds" as if they were obligation discriminants
(question / file-upload / sub-journey / agreement / payment …). Under the
cleaner model most collapse into either **data types** on the obligation or
**journey-side acquisition mechanisms**:

| Earlier "kind"       | New home                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **question**         | Not a kind — just the default UI mechanism (any obligation can be acquired via a form input).                                                                                                                                   |
| **file-upload**      | If the canonical data IS the file: obligation type is `file` (or `file-set`). If the canonical data is something extracted from a file: obligation type is whatever's extracted; "upload" is a journey-side acquisition method. |
| **sub-journey**      | Journey-side composition: "to satisfy these N obligations, run sub-journey Q and map its return value." Not an obligation itself.                                                                                               |
| **agreement** (T&Cs) | Probably an obligation with `type: boolean` (or `consent`). The UI mechanism (a checkbox after content) is journey-side.                                                                                                        |
| **payment**          | Probably its own obligation with `type: payment-receipt` (the canonical data is the receipt / confirmation id), satisfied by a journey-side payment flow.                                                                       |
| **schedule**         | Obligation type is `time-slot` or similar. UI mechanism (calendar picker, list, …) is journey-side.                                                                                                                             |

The obligation's **type** becomes the only discriminant, and the type space
stays open. The journey-layer translates each type into a renderable
mechanism. New types = new journey-side renderers; the obligation file is
unchanged.

## Implications for the existing four spikes

| Spike                         | Fit                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C — rules engine**          | **Best fit.** [`rules.json`](./spike-c/model/rules.json)'s `require` rules with authored reasons map almost 1:1 to obligations with activations. Splitting `steps` (a journey concept) out of [`fields.json`](./spike-c/model/fields.json) into a per-journey file would land C very close to this vision.                                                |
| **A — declarative selectors** | Significant refactor needed. Currently embeds `steps` (a journey concept) inside [`journey.json`](./spike-a/model/journey.json). Would need to split `obligations.json` from `journey.json`.                                                                                                                                                              |
| **B — statechart**            | Awkward. A statechart IS a journey by construction. "Multiple journeys over one obligation set" means one statechart per journey, all reading a shared obligations file — unnatural for the paradigm.                                                                                                                                                     |
| **D — schema-first**          | [`annotations.json`](./spike-d/model/annotations.json) was always the journey layer over the schema. Lifting it into a per-journey file (with [`quote.schema.json`](./spike-d/model/quote.schema.json) as shared obligation constraints) would be a clean version of D. But D's other weaknesses (no native provenance, value-blind conditionals) remain. |

The architecture nudge is firmly toward **Spike C** as the closest paradigm
fit if obligations become first-class.

## What's still open

**G. Sub-journey result fan-out.** When a sub-journey returns a multi-field
result that satisfies multiple parent obligations (e.g. an "add a driver"
sub-journey returning `{ name, dob, licence }` that fills three sibling
obligations), where is that fan-out declared?

- (a) **Parent obligation declares the mapping** — sub-journeys stay
  context-free, more reusable.
- (b) **Sub-journey publishes a manifest** of what it satisfies — tied to
  specific obligation ids, less reusable.
- (c) **Shared schema, runtime matches by name.**

This is the next thing to settle. Beyond G, we have enough to write a
precise spec.

## Cross-reference

- The five implementations live under `prototypes/`. See
  [`prototypes/README.md`](../README.md) and
  [`prototypes/model-spikes/README.md`](./README.md) for layout.
- The triaged interaction-design canvas:
  [`interaction-design-todo.md`](./interaction-design-todo.md).
- Recent commits on `spike/EUDPA-249-prototype-layouts` add the prerequisites
  that make the obligations conversation tractable: the pre-hub email gate,
  mandatory-at-save validation for Full name, and the optional preferredName
  field. None of these use the "obligation" name yet — they're implemented
  per-spike using each paradigm's native primitives.
