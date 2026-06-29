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
the journey. The obligation itself is **pure data** — light and JSON-encodable.
All applicability/optionality logic lives in a separate **scoping function**
(see §The evaluation engine).

Current sketch of the data shape:

```jsonc
// obligations.json — pure data, JSON-portable
[
  {
    "id": "1234",
    "name": "dateOfBirth",
    "type": "date",
    "cardinality": "single"
  },
  {
    "id": "5678",
    "name": "address",
    "type": "address",
    "cardinality": "indexed",
    "indexedBy": "..." // controller mechanism — see §What's still open
  }
]
```

The obligation declares **what data is canonical** (id, name, type,
cardinality). It does **not** declare _when_ it's in scope, _whether_ it's
mandatory, _which_ pages present it, or _how_ the data is acquired — those
are all handled elsewhere.

### Key properties (settled)

| Property                                                             | Decision                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**                                                         | Yes — every obligation has a stable `id`; can be referenced from multiple places.                                                                                                                                                                                                |
| **Type**                                                             | A single data type (the type of what gets produced). Open type space — `date`, `string`, `email`, `file`, `boolean`, `address`, `payment-receipt`, etc.                                                                                                                          |
| **Cardinality**                                                      | `single` (one canonical value per user, e.g. date of birth) or `indexed` (a collection of instances, e.g. address history, multi-select with per-item follow-ups). See §Single vs indexed obligations.                                                                           |
| **Scoping (in-scope / out-of-scope, mandatory / optional, reasons)** | NOT on the obligation. Computed by a scoping function — see §The evaluation engine.                                                                                                                                                                                              |
| **Effective status when multiple reasons fire**                      | "Most restrictive wins" — if any reason says mandatory, the obligation is mandatory for journey completion.                                                                                                                                                                      |
| **Status flip while in scope**                                       | An obligation can move between mandatory and optional based on later answers, without leaving scope. Data is preserved across status flips.                                                                                                                                      |
| **Scope exit**                                                       | When the obligation is fully out of scope, its data is **actively cleared** (consistent with the canvas "delete conditional data" steer).                                                                                                                                        |
| **Convergent obligations**                                           | A single obligation can be brought into scope for multiple reasons. The data remains unitary — edits from one presentation propagate to others. There are NOT two obligations on the same field; there's one obligation that the scoping function activates for several reasons. |
| **Completion policy**                                                | Three modes need supporting per journey: silently-skipped / must-address / gate-collected at end. Resolved per-journey default with per-obligation override.                                                                                                                     |
| **Sub-journey results**                                              | A sub-journey could return: a boolean done/not-done; a single typed value filling one parent obligation; or a typed value satisfying multiple parent obligations. All three need supporting.                                                                                     |
| **Kind taxonomy**                                                    | Open / extensible. New kinds (agreement, payment, identity-verification, schedule, third-party-action …) can be added without changing the obligation's outer shape — they appear as new `type` values.                                                                          |

## The evaluation engine

Obligations stay simple (data); the engine that decides which apply and how
takes three inputs:

1. **Obligations** — the journey-agnostic data file above.
2. **The user's previous answers** — the live state of what's been collected so
   far in this journey.
3. **Configuration** — environment-specific behaviours (feature flags,
   versioning, A/B variants, statute version, regional rules, etc.).

It returns, for each obligation:

```ts
{
  inScope: boolean,
  status?: 'mandatory' | 'optional',     // only meaningful if inScope
  reasons?: Array<{ text: string }>,     // authored, multi-reason provenance
  instances?: Array<InstanceState>       // only for indexed cardinality
}
```

### Why scoping is a function, not data

A separate thought-experiment exercise tested whether scoping could stay
purely declarative (JSON conditions or a rule language like JSON Logic). It
can't — at least not without significant cost. The cases that broke it:

- **Algorithm-shaped rules.** E.g. "the union of address date ranges must
  cover the last 5 years with no gaps". This is interval algebra, not a
  query. A pure rule language either can't express it or only does so by
  reinventing programming-language primitives.
- **Indexed sub-obligation templating.** E.g. "the user selected K modifications;
  for each selected modification a `cost[item]` sub-obligation is mandatory
  and a `professionallyFitted[item]` becomes mandatory only if cost > £500".
  The obligation list itself needs to be **projected** from state — not a
  query, a template.
- **External state.** Reference-data lookups, historical-policy checks,
  fraud-flag signals from upstream services. Either evaluation is async, or
  the state must be pre-loaded — both push beyond what JSON conditions can
  express alone.

Pure JSON conditions cover the simple 80% but stretch awkwardly to cover the
rest. The pragmatic answer: keep obligations as pure data; concentrate logic
in a single scoping function that has the full expressivity of the
implementation language.

### Trade-off accepted

The scoping function is **not portable across languages** in the way the
obligations data is. A non-JS consumer (Python validator, mobile native
runtime) needs its own scoping implementation. This is honest: real-world
scoping touches external state and language-specific facilities anyway.
What stays portable is the **contract** — the obligations data file
describes what data must exist, with what type and cardinality; each
runtime decides when and why.

## Single vs indexed obligations

A `single` obligation produces one canonical value:

```jsonc
{ "id": "dob", "name": "dateOfBirth", "type": "date", "cardinality": "single" }
// → answers.dateOfBirth = '1985-03-27'
```

An `indexed` obligation produces a collection of instances:

```jsonc
{
  "id": "addr",
  "name": "address",
  "type": "address",
  "cardinality": "indexed",
  "indexedBy": "..."
}
// → answers.addresses = [
//     { from: '...', to: '...', country: 'UK', ... },
//     { from: '...', to: '...', country: 'FR', ... },
//   ]
```

Indexed obligations introduce two extra design points:

- **Controller mechanism** — what determines how many instances exist?
  Could be user-driven (the user clicks "add another address"); could be
  derived from another obligation (the user selected K items from a
  multi-select, instantiate one sub-obligation per selection); could be
  externally seeded (e.g. each modifier on the policy spawns instances).
  The `indexedBy` shape is still open.
- **Cross-instance and within-instance scoping.** Within an instance you can
  have the same activation logic as single obligations. Across instances you
  can have quantifier-shaped rules ("any address with country ≠ UK") that
  are part of why scoping needs to be a function.

The existing prototype's `addons` step (`kind: 'subtasks'`) is the only
indexed-obligation pattern shipped today, and it's hacked in as a special
case rather than modelled generically.

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

- **Layer 1 — Obligations** (`obligations.json` or similar): journey-agnostic
  data. Identity, type, cardinality, constraints. Knows nothing about pages
  or how data is acquired. Fully portable.
- **Layer 1.5 — Scoping** (`scoping.js` or per-runtime equivalent): a pure
  function `(obligations, answers, config) → per-obligation state`. Decides
  in-scope / out-of-scope / mandatory / optional / reasons / indexed-instances.
  Implementation-language code; not portable.
- **Layer 2 — Journey** (one per journey implementation): references
  obligations by id. Declares pages, ordering, grouping, per-page hard/soft
  mandate, copy/labels/hints, acquisition mechanisms (form input, file upload,
  NI lookup, sub-journey…). Multiple journeys can coexist over the same
  obligations + scoping.

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
2. **Mandatory for journey completion** — the obligation-level mandate
   returned by the scoping function. The journey can't complete (e.g. can't
   get the quote) until satisfied, but pages presenting it can be soft (let
   the user skip and come back) or hard (block save).

A single mandatory obligation can have hard presentations and soft
presentations in different parts of the same journey.

### "Kinds" collapse

Earlier we listed "kinds" as if they were obligation discriminants
(question / file-upload / sub-journey / agreement / payment …). Under the
cleaner model most collapse into either **data types** on the obligation or
**journey-side acquisition mechanisms**:

| Earlier "kind"       | New home                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **question**         | Not a kind — just the default UI mechanism (any obligation can be acquired via a form input).                                                                                                                       |
| **file-upload**      | If the canonical data IS the file: obligation type is `file` (or `file-set`). If the canonical data is something extracted from a file: obligation type is whatever's extracted; "upload" is a journey-side method. |
| **sub-journey**      | Journey-side composition: "to satisfy these N obligations, run sub-journey Q and map its return value." Not an obligation itself.                                                                                   |
| **agreement** (T&Cs) | Probably an obligation with `type: boolean` (or `consent`). The UI mechanism (a checkbox after content) is journey-side.                                                                                            |
| **payment**          | Probably its own obligation with `type: payment-receipt` (the canonical data is the receipt / confirmation id), satisfied by a journey-side payment flow.                                                           |
| **schedule**         | Obligation type is `time-slot` or similar. UI mechanism (calendar picker, list, …) is journey-side.                                                                                                                 |

The obligation's **type** becomes the only discriminant, and the type space
stays open. The journey-layer translates each type into a renderable
mechanism. New types = new journey-side renderers; the obligation file is
unchanged.

## Implications for the existing four spikes

| Spike                         | Fit                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C — rules engine**          | **Closest fit overall.** [`rules.json`](./spike-c/model/rules.json)'s authored `reason` strings + the `engine.evaluate(answers)` function in [`runtime/engine.js`](./spike-c/runtime/engine.js) are the closest existing primitives to "obligations + scoping". To match the vision, C's `rules.json` would shift entirely into the scoping function (lose its purely-declarative framing), keeping the authored-reasons pattern intact. |
| **A — declarative selectors** | Significant refactor. Currently embeds `steps` (journey concept) inside [`journey.json`](./spike-a/model/journey.json). Would need to split `obligations.json` (data) from a scoping function and from `journey.json` (presentation).                                                                                                                                                                                                    |
| **B — statechart**            | Awkward. A statechart IS a journey by construction; "multiple journeys over one obligation set" means one statechart per journey, all reading shared obligations. The statechart paradigm doesn't make obligations primary; it makes flow primary.                                                                                                                                                                                       |
| **D — schema-first**          | [`annotations.json`](./spike-d/model/annotations.json) was always the journey layer over the schema. The schema could become the type/constraint layer of obligations; the annotations the journey layer. But D's other weaknesses (no native provenance, value-blind conditionals) don't go away — and the scoping function is alien to the schema-first paradigm.                                                                      |

The architectural nudge is firmly toward **Spike C** as the closest paradigm
fit if obligations become first-class — with the caveat that **none of the
four spikes ships the obligations / scoping / journey three-layer split
today**. C is closest because its engine + authored-reasons combination
already approximates Layer 1.5 (scoping) more than the others.

## What's still open

### G. Sub-journey result fan-out

When a sub-journey returns a multi-field result that satisfies multiple parent
obligations (e.g. an "add a driver" sub-journey returning `{ name, dob,
licence }` that fills three sibling obligations), where is that fan-out
declared?

- (a) **Parent obligation declares the mapping** — sub-journeys stay
  context-free, more reusable.
- (b) **Sub-journey publishes a manifest** of what it satisfies — tied to
  specific obligation ids, less reusable.
- (c) **Shared schema, runtime matches by name.**

### H. Controller mechanism for indexed obligations

What does `indexedBy` actually express? Likely candidates:

- **User-driven** — the user can click "add another" / "remove"; the
  controller value is the array length.
- **Controlled by another obligation** — a multi-select obligation supplies
  the keys; indexed sub-obligations are instantiated one per key.
- **Externally seeded** — instances arrive from outside (e.g. each
  underwriter rider attaches an indexed obligation).

How (and whether) to make this declarative is still open.

### I. Configuration shape

The scoping function takes configuration as one of its inputs. What is the
shape of configuration? Likely a flat key-value bag (feature flags), but
could be richer (statute version, regional rules, A/B cohort). Worth pinning
down once we have a concrete journey that uses it.

### J. Where authored reasons are authored

Under Position B, reasons come back from the scoping function. They could be:

- **Inline string literals in the function** — simplest, but spreads the user-
  facing copy across implementation code.
- **Looked up from a separate copy file** (`reasons.json`) by key — keeps copy
  centralised, translatable, reviewable by content design.

The second is probably cleaner for a real system.

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
