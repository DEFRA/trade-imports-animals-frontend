# Obligations — working definition

> **Status:** working notes from an in-progress design discussion. Some items
> are settled; several are open (see §What's still open). Update this file as
> the concept evolves.
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
All applicability/optionality logic lives in a separate **evaluation engine**
(sync, pure, deterministic) wrapped by an **orchestrator** that handles I/O
(see §The evaluation engine).

Obligations come in two broad shapes:

- **User-facing** — the user satisfies them by answering a question, uploading
  a file, accepting a notice, etc. Rendered by the journey layer.
- **System-handled** — the runtime satisfies them on the user's behalf via a
  callback pattern. Sub-journey receipts and external API lookups are both of
  this shape. Not rendered (or only rendered as a "checking…" state) — the
  orchestrator triggers the work and writes the result back to state.

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
  },
  {
    "id": "9999",
    "name": "additionalDriver",
    "type": "sub-journey-receipt",
    "cardinality": "single",
    "subJourneyRef": "add-driver-v1"
  },
  {
    "id": "aaaa",
    "name": "fraudFlag",
    "type": "lookup-result",
    "cardinality": "single",
    "lookupRef": "fraud-check-v1"
  }
]
```

The obligation declares **what data is canonical** (id, name, type,
cardinality, optional system-handler reference). It does **not** declare
_when_ it's in scope, _whether_ it's mandatory, _which_ pages present it, or
_how_ user-facing obligations are presented — those are all handled elsewhere.

### Key properties (settled)

| Property                                                             | Decision                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity**                                                         | Yes — every obligation has a stable `id`; can be referenced from multiple places.                                                                                                                                                                                                        |
| **Type**                                                             | A single data type (the type of what gets produced). Open type space — `date`, `string`, `email`, `file`, `boolean`, `address`, `payment-receipt`, `sub-journey-receipt`, `lookup-result`, etc.                                                                                          |
| **Cardinality**                                                      | `single` (one canonical value per user, e.g. date of birth) or `indexed` (a collection of instances, e.g. address history, multi-select with per-item follow-ups). See §Single vs indexed obligations.                                                                                   |
| **Scoping (in-scope / out-of-scope, mandatory / optional, reasons)** | NOT on the obligation. Computed by the evaluation engine — see §The evaluation engine.                                                                                                                                                                                                   |
| **Effective status when multiple reasons fire**                      | "Most restrictive wins" — if any reason says mandatory, the obligation is mandatory for journey completion.                                                                                                                                                                              |
| **Status flip while in scope**                                       | An obligation can move between mandatory and optional based on later answers, without leaving scope. Data is preserved across status flips.                                                                                                                                              |
| **Scope exit**                                                       | When the obligation is fully out of scope, its data is **actively cleared** (consistent with the canvas "delete conditional data" steer).                                                                                                                                                |
| **Convergent obligations**                                           | A single obligation can be brought into scope for multiple reasons. The data remains unitary — edits from one presentation propagate to others. There are NOT two obligations on the same field; there's one obligation that the scoping function activates for several reasons.         |
| **Completion policy**                                                | Three modes need supporting per journey: silently-skipped / must-address / gate-collected at end. Resolved per-journey default with per-obligation override.                                                                                                                             |
| **Sub-journey result fan-out**                                       | Closed (was open question G). A sub-journey integrates via a callback that returns a single lookup id. The obligation's canonical data IS the id; the orchestrator dereferences when needed. There is no multi-field fan-out at the obligation level — one sub-journey = one obligation. |
| **Kind taxonomy**                                                    | Open / extensible. New kinds (agreement, payment, identity-verification, schedule, third-party-action …) can be added without changing the obligation's outer shape — they appear as new `type` values.                                                                                  |

## The evaluation engine

The system has two cooperating components: a pure **evaluator** and a
side-effecting **orchestrator**.

### The evaluator (pure, sync, deterministic)

```ts
function evaluate(
  obligations: Obligation[],
  answers: AnswersState,
  config: Config
): PerObligationState
```

Inputs:

1. **Obligations** — the journey-agnostic data file above.
2. **Answers** — the live state of what's been collected so far. Includes
   user inputs AND the results of system-handled obligations (lookup results,
   sub-journey receipts).
3. **Configuration** — environment-specific behaviours (feature flags,
   versioning, A/B variants, statute version, regional rules, etc.).

Output, per obligation:

```ts
{
  inScope: boolean,
  status?: 'mandatory' | 'optional',     // only meaningful if inScope
  reasons?: Array<{ text: string }>,     // authored, multi-reason provenance
  instances?: Array<InstanceState>       // only for indexed cardinality
}
```

The evaluator never performs I/O. Given the same inputs it always returns the
same output. Trivially testable; replayable; auditable.

### The orchestrator (side-effecting)

The runtime around the evaluator manages everything async:

```
loop:
  state = evaluate(obligations, answers, config)
  for each in-scope obligation in state:
    if user-facing: render in the journey UI; await user input
    if system-handled (sub-journey / lookup / …):
      trigger if not already in flight
      on callback: write result into answers
  if no progress possible (waiting for user OR for callbacks): yield
  if answers / config changed since last evaluate: goto loop
done when no in-scope obligation remains unsatisfied
```

This is a **fixed-point computation** — re-evaluate until the result is
stable. Same pattern as React Suspense, Redux-saga, Elixir GenServer trees,
Bazel's action graph.

### Why this split

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
  fraud-flag signals from upstream services.

The first two pushed scoping into a function. The third — async I/O — was
initially treated as "scoping needs to be async", but the cleaner answer is:
**scoping stays sync; async lives in the orchestrator**. The external state
arrives via the system-handled-obligation callback pattern, identical to how
sub-journey receipts arrive. By the time the evaluator runs, the state it
needs is already in `answers` (or absent, in which case the engine declares
the lookup obligation in-scope and the orchestrator fires the call).

### What this buys

- **Engine stays trivially testable.** Property-based testing is feasible
  (generate random answer/config combinations and assert the result shape).
- **Caching is implicit.** System-handler results live in `answers`. No
  separate cache layer with its own freshness policy.
- **Replay is straightforward.** Replay the recorded answers + config through
  the engine to reconstruct what the user saw at any point.
- **Failure handling is uniform.** A failed lookup is just an unsatisfied
  lookup-obligation. The orchestrator can retry, surface to the user, fall
  back to defaults — same patterns as any other obligation that's stuck.
- **Audit trail is first-class.** Each system-handled-obligation satisfaction
  is a recordable event ("ran fraud-flag check at 10:03, result clear"),
  alongside user-answer events.
- **Sub-journeys and lookups are the same thing.** Both are
  orchestrator-handled obligation types with a callback that writes a value
  into state. The mechanism is unified.
- **Reference data is a non-event most of the time.** Most reference data is
  bundled with the obligations file (static, no I/O needed). Lookups are
  reserved for genuinely dynamic data.

### Trade-off accepted

The evaluator is **not portable across languages** in the way the obligations
data is. A non-JS consumer (Python validator, mobile native runtime) needs
its own evaluator implementation. What stays portable is the **contract** —
the obligations data file describes what data must exist, with what type and
cardinality; each runtime decides when and why, and orchestrates its own
async.

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

## Staleness

Answers — both user-entered and system-handled — can go stale. This is
**not** a lookup-only concern: a manually-entered phone number from six
months ago might also need re-confirming; an address may have changed; a
declared NCD count may need refreshing at renewal.

So the staleness mechanism needs to be **uniform across all answer types**.
Whatever shape it takes (TTL on the obligation, an activation predicate that
fires when the recorded answer is older than N, a per-obligation freshness
policy), it must apply equally to:

- User-entered answers (typed values, file uploads, selections)
- System-handled results (sub-journey receipts, lookup results, dereferenced data)

The likely shape: each obligation can declare a freshness rule; when the
stored answer fails the rule, the obligation re-enters the "needs satisfying"
state. The orchestrator then either re-fires (for system-handled types) or
re-presents (for user-facing types). Open question — see §What's still open.

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
- **Layer 1.5 — Engine + orchestrator** (`evaluator.js` + a runtime, or
  per-language equivalents): the evaluator is pure
  `(obligations, answers, config) → per-obligation state`. The orchestrator
  is the side-effecting wrapper that triggers system-handled obligations,
  collects callbacks, writes to `answers`, and re-runs the evaluator.
  Implementation-language code; not portable across languages, but each
  language consumer ships its own pair.
- **Layer 2 — Journey** (one per journey implementation): references
  obligations by id. Declares pages, ordering, grouping, per-page hard/soft
  mandate, copy/labels/hints, acquisition mechanisms for user-facing
  obligations (form input, file upload, etc.). Multiple journeys can coexist
  over the same obligations + engine.

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
   returned by the evaluator. The journey can't complete (e.g. can't get
   the quote) until satisfied, but pages presenting it can be soft (let the
   user skip and come back) or hard (block save).

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
| **sub-journey**      | An orchestrator-handled obligation type (`sub-journey-receipt`); the orchestrator fires the sub-journey, awaits the callback, writes the receipt id into `answers`. The evaluator treats it as ordinary input.      |
| **agreement** (T&Cs) | Probably an obligation with `type: boolean` (or `consent`). The UI mechanism (a checkbox after content) is journey-side.                                                                                            |
| **payment**          | Probably its own obligation with `type: payment-receipt` (the canonical data is the receipt / confirmation id), satisfied by a journey-side payment flow.                                                           |
| **schedule**         | Obligation type is `time-slot` or similar. UI mechanism (calendar picker, list, …) is journey-side.                                                                                                                 |
| **lookup**           | An orchestrator-handled obligation type (`lookup-result`); the orchestrator makes the external call, awaits the response, writes the result into `answers`. Same mechanism as sub-journeys.                         |

The obligation's **type** becomes the only discriminant, and the type space
stays open. The journey-layer translates each user-facing type into a
renderable mechanism; the orchestrator handles system-handled types via the
callback pattern. New types = new journey-side renderers OR new
orchestrator handlers; the obligation file is unchanged.

## Implications for the existing four spikes

| Spike                         | Fit                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C — rules engine**          | **Closest fit overall.** [`rules.json`](./spike-c/model/rules.json)'s authored `reason` strings + the `engine.evaluate(answers)` function in [`runtime/engine.js`](./spike-c/runtime/engine.js) are the closest existing primitives to "obligations + evaluator". To match the vision, C's `rules.json` would shift entirely into the evaluator function (lose its purely-declarative framing), keeping the authored-reasons pattern intact. |
| **A — declarative selectors** | Significant refactor. Currently embeds `steps` (journey concept) inside [`journey.json`](./spike-a/model/journey.json). Would need to split `obligations.json` (data) from an evaluator and from `journey.json` (presentation).                                                                                                                                                                                                              |
| **B — statechart**            | Awkward. A statechart IS a journey by construction; "multiple journeys over one obligation set" means one statechart per journey, all reading shared obligations. The statechart paradigm doesn't make obligations primary; it makes flow primary.                                                                                                                                                                                           |
| **D — schema-first**          | [`annotations.json`](./spike-d/model/annotations.json) was always the journey layer over the schema. The schema could become the type/constraint layer of obligations; the annotations the journey layer. But D's other weaknesses (no native provenance, value-blind conditionals) don't go away — and the evaluator function is alien to the schema-first paradigm.                                                                        |

None of the four spikes ships the obligations / evaluator / orchestrator /
journey split today. C is closest because its engine + authored-reasons
combination already approximates Layer 1.5 (the pure evaluator) more than
the others. The orchestrator layer (fixed-point loop, system-handled
obligation callbacks) is new to all four.

## What's still open

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

The evaluator takes configuration as one of its inputs. What is the shape of
configuration? Likely a flat key-value bag (feature flags), but could be
richer (statute version, regional rules, A/B cohort). Worth pinning down
once we have a concrete journey that uses it.

### J. Where authored reasons are authored

Under the function-based model, reasons come back from the evaluator. They
could be:

- **Inline string literals in the function** — simplest, but spreads the
  user-facing copy across implementation code.
- **Looked up from a separate copy file** (`reasons.json`) by key — keeps
  copy centralised, translatable, reviewable by content design.

The second is probably cleaner for a real system.

### K. Staleness mechanism

Staleness needs to be **uniform** across user-entered answers and
system-handled results (lookups, sub-journey receipts). Two natural shapes:

- **Per-obligation TTL** in the data — orchestrator invalidates the stored
  answer when TTL expires; the obligation re-enters in-scope-but-unsatisfied
  state.
- **Activation predicate over freshness** — the evaluator declares "in scope
  if missing OR older than N"; collapses staleness into the existing
  activation machinery.

The second is more uniform with how everything else is decided, but probably
harder to author. Worth pinning when we have a concrete staleness case.

### L. Where lookup results live in state

Two natural homes for the results of system-handled obligations:

- **In `answers` alongside user inputs** — the evaluator sees one unified
  state bag. Consistent and simple, but mixes user data with system-derived
  data (might affect privacy, serialisation, access control).
- **In a separate `systemState` / `derivedAnswers`** — explicit separation;
  user answers stay clean. Evaluator reads from both. Slightly more ceremony
  but the audit/serialisation/privacy story is cleaner.

Leaning (b) for an extensible model, but not pinned.

### M. Failure policies per orchestrator-handled obligation

When a system-handled obligation fails (lookup times out, sub-journey
errors), the orchestrator needs a policy declared per-obligation:

- **block** — journey can't proceed; show an error; retry.
- **degrade** — treat as unsatisfied; surface a fallback path ("we couldn't
  verify; please upload proof manually").
- **default** — pretend the call returned a known default value; journey
  continues.
- **stale-ok** — use the last known good value with a marker.

Encoded in the obligation, executed by the orchestrator, opaque to the
evaluator.

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
