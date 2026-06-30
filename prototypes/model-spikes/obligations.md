# Obligations — working definition

> **Status:** working notes from an in-progress design discussion. Some items
> are settled; several are open (see §What's still open). Update this file as
> the concept evolves.
>
> **Last updated:** 2026-06-30

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

### Terminology

A consistent vocabulary across the discussion and the data model:

- **Obligation** — a discrete unit the user can or must satisfy to complete
  the journey. Defined declaratively in `obligations.json`.
- **Obligation id** — the `id` field on the obligation definition. Stable
  across users, journeys, and sessions. **Encouraged to be meaningful**
  (e.g. `"fullName"`, `"dateOfBirth"`) rather than opaque (`"1234"`), so
  the same string can flow through the model → HTML form input
  `name="fullName"` → fulfilments map key, aligning identifiers across
  layers.
- **Fulfilment** — an entry/record holding one filling-in of an obligation
  by a user (or by the system, for system-handled obligations). A
  single-cardinality obligation has at most one fulfilment; an
  indexed-cardinality obligation has zero or more.
- **FulfilmentId** — identifier of a specific fulfilment.
  - For **single-cardinality** obligations: `fulfilmentId === obligationId`.
    The obligation id alone uniquely addresses the (at most one)
    fulfilment.
  - For **indexed-cardinality** obligations: a per-fulfilment id within
    the obligation's collection. Shape depends on `source` — see
    §Fulfilments storage.
- **Fulfil** (verb) — the user (or the system) fulfils an obligation by
  providing the canonical data. Fulfilments can be incomplete (partially
  answered), complete, or stale.
- **Service** — the thing the user is trying to do (e.g. "get a car
  insurance quote", "file an animal-trade notification"). A Service has
  exactly **one** Obligations definition (the data contract) and **one
  or more** Flows (presentations/orchestrations of that contract).
- **Flow** — a static description of how a Service is delivered to the
  user: which pages exist, in what order, how obligations are grouped,
  per-page hard/soft mandate, copy/labels/hints, acquisition mechanisms.
  Multiple Flows can coexist for the same Service — e.g. a skeleton Flow
  for rapid validation alongside a polished Flow for production, or a
  re-working of the polished Flow in development. All Flows of a Service
  reference the same underlying Obligations.
- **Journey** — a runtime instance of **one Flow** being navigated by a
  user. Owns the **fulfilments map** keyed by obligation id. Each Journey
  has its own id. Multiple Journeys can coexist for the same user (e.g.
  different browser tabs), each isolated; "user" and "session" are
  explicitly NOT the uniqueness scope.
- **Page** — a leaf container in a Flow. Has an ordered list of
  `presents` entries (obligations + mandate) that it asks the user
  about. Maps 1:1 to an HTML artefact in the implementation.
- **Section / SubSection** — a Group container in a Flow. Has an
  ordered list of child Containers (Pages or further SubSections).
  Sections and SubSections nest arbitrarily; top-level Sections are
  what appear on the Task List by default.
- **Container** — collective term for Pages and Groups (Sections /
  SubSections). A Flow's content is a tree of Containers.
- **Fulfilled** — applied recursively across the Container tree. A
  Page is Fulfilled iff every in-scope mandatory obligation it presents
  is fulfilled. A Group is Fulfilled iff every applicable child
  Container is Fulfilled. A Journey is Fulfilled iff every top-level
  Section is Fulfilled — at which point the user can Submit on the CYA
  page.
- **Submitted** — the Journey has been finalised: the user has clicked
  Submit on CYA. No further changes. We deliberately avoid "Complete"
  as a separate term — it overlapped Fulfilled and Submitted
  confusingly.

```
Service (e.g. car-insurance-quote)
├── Obligations          ← one per service; the data contract
└── Flows                ← one or more; each a presentation /
                         │  orchestration of the same obligations
    └── Journey          ← zero-many runtime instances per Flow per
                         │  user (multi-tab → multiple Journeys in flight)
        └── fulfilments  ← scoped to the Journey
```

Note: the existing prototype code uses `answers` / `quote` for its state
bag. That's a legacy hand-written convention; the obligations model uses
**fulfilments**. They're related but the abstractions are different — a
future implementation aligned with the obligations model would converge
on one vocabulary.

### Two broad shapes

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
// Obligation ids are meaningful strings; they double as fulfilments-map
// keys and as form input names where the journey layer renders them.
[
  {
    "id": "fullName",
    "type": "text",
    "cardinality": "single"
  },
  {
    "id": "dateOfBirth",
    "type": "date",
    "cardinality": "single"
  },
  {
    "id": "address",
    "type": "address",
    "cardinality": "indexed",
    "indexedBy": { "source": "user", "mutability": "add-and-remove" }
  },
  {
    "id": "additionalDriver",
    "type": "sub-journey-receipt",
    "cardinality": "single",
    "subJourneyRef": "add-driver-v1"
  },
  {
    "id": "fraudFlag",
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
| **Cardinality**                                                      | `single` (one fulfilment per user, e.g. date of birth) or `indexed` (a collection of fulfilments, e.g. address history, multi-select with per-item follow-ups). See §Single vs indexed obligations.                                                                                      |
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
  fulfilments?: Array<FulfilmentState>   // only for indexed cardinality
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
- **Indexed sub-obligation templating.** E.g. "the user selected K
  modifications; for each selected modification a `cost[item]` fulfilment
  is mandatory and a `professionallyFitted[item]` becomes mandatory only if
  cost > £500". The fulfilment set itself needs to be **projected** from
  state — not a query, a template.
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

An `indexed` obligation produces a collection of fulfilments:

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

### The `indexedBy` shape — source × mutability

Where the index keys come from and who can change them are two independent
dimensions; together they describe every realistic pattern. All three of
the patterns interaction design needs (user-driven, derived from another
obligation, externally seeded) are combinations of these dimensions.

| Dimension      | Values                                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **source**     | `user` (user creates fulfilmentIds via add/remove; starts empty) / `derived` (fulfilmentIds come from another obligation's answer) / `seeded` (initial fulfilmentIds come from an external system at bootstrap; user may then mutate per `mutability`) |
| **mutability** | `read-only` / `add-only` / `add-and-remove` (and possibly `add-remove-and-reorder` for ordered collections)                                                                                                                                            |

| Pattern                                 | Example                                          | `source`  | `mutability`                                                  |
| --------------------------------------- | ------------------------------------------------ | --------- | ------------------------------------------------------------- |
| **1 — user-driven**                     | address history, additional drivers (new policy) | `user`    | `add-and-remove`                                              |
| **2 — derived from another obligation** | per-modification cost (after a multi-select)     | `derived` | `read-only` (mutating the controller drives all changes)      |
| **3 — externally seeded**               | renewal endorsements; broker-quote handoff       | `seeded`  | `add-and-remove` (typical renewal: edit, remove old, add new) |

Sketch:

```jsonc
{
  "id": "addresses",
  "type": "address",
  "cardinality": "indexed",
  "indexedBy": { "source": "user", "mutability": "add-and-remove" }
}

{
  "id": "modCost",
  "type": "currency",
  "cardinality": "indexed",
  "indexedBy": {
    "source": "derived",
    "controllingObligation": "modifications",
    "mutability": "read-only"
  }
}

{
  "id": "drivers",
  "type": "driver",
  "cardinality": "indexed",
  "indexedBy": {
    "source": "seeded",
    "seedHandler": "rollover-drivers-v1",
    "mutability": "add-and-remove"
  }
}
```

### Seeded = orchestrator-handled obligation (settled)

Pattern 3 (seeded) doesn't need new machinery: fetching initial
fulfilmentIds / data from an external system is structurally identical to a
lookup-result or sub-journey-receipt. The orchestrator fires the
`seedHandler` at journey start (or whenever the obligation enters scope);
the callback writes the seed values into state. From the evaluator's
perspective the seeded obligation just becomes "fulfilments exist; some are
satisfied" the way any other indexed obligation would.

### Lifecycle for derived (pattern 2) — settled

When the controlling obligation's answer changes:

- **FulfilmentId added** (e.g. user adds `suspension` to the modifications
  selection) → a fresh blank fulfilment of the derived obligation comes
  into scope.
- **FulfilmentId removed** (e.g. user removes `alloys`) → that fulfilment
  drops out of scope; its data is wiped, consistent with the existing
  scope-exit rule.
- **FulfilmentId re-added** after a previous remove → fresh blank again
  (no rehydration), consistent with the canvas "delete conditional data"
  steer and the yes→no→yes round-trip spec already in the e2e suite.

### Fulfilments storage — the journey-scoped map

Fulfilments live in a **journey-scoped map**. The journey is the
uniqueness scope (not the user, not the session — a single user might have
several journeys open simultaneously, e.g. in different browser tabs).
Within a journey, the **fulfilments map** is keyed by obligation id. Each
entry is either a single value (for single-cardinality obligations) or a
nested map of fulfilmentId → value (for indexed obligations).

A single-cardinality obligation needs no separate per-instance identifier:
`fulfilmentId === obligationId` by convention, and the obligation id alone
addresses the (at most one) fulfilment.

For indexed obligations, the inner map's keys are per-fulfilment
identifiers whose shape varies by `source`. Three illustrative shapes:

**Source = `user`** — opaque ids generated by the orchestrator each time
the user adds a fulfilment (e.g. ULID/UUID):

```jsonc
journey.fulfilments = {
  "address": {
    "01H8XK7M5RW6QYJ2AB": {
      "value": { "from": "2020-01-01", "to": "2023-06-30", "country": "UK" }
    },
    "01H8XK9P3T8WBZN4DE": {
      "value": { "from": "2023-07-01", "to": null, "country": "FR" }
    }
  }
}
```

The keys are meaningless to the user but stable for the orchestrator.
Survive reorder, delete, reload.

**Source = `derived`** — the controlling obligation's answer values
themselves are the keys; meaningful and semantic:

```jsonc
journey.fulfilments = {
  "modifications": { "value": ["turbo", "alloys"] }, // controller (single)
  "modificationCost": {
    // derived indexed — one fulfilment per controller value
    "turbo": { "value": 800 },
    "alloys": { "value": 200 }
  }
}
```

Adding `"suspension"` to the controller spawns a fresh blank
`modificationCost["suspension"]` fulfilment; removing `"alloys"` drops
`modificationCost["alloys"]` and wipes its data (the lifecycle rule from
§Lifecycle for derived).

**Source = `seeded`** — fulfilmentIds come from the external source (DB
ids, policy reference numbers, domain codes):

```jsonc
journey.fulfilments = {
  "driver": {
    "POL-2024-DRV-001": { "value": { "name": "Alex Driver", "...": "..." } },
    "POL-2024-DRV-002": { "value": { "name": "Sam Passenger", "...": "..." } }
  }
}
```

When a `seeded` obligation also allows user mutability, the map is
**heterogeneous** by design — seeded fulfilments keep their source-
provided ids; user-added fulfilments get orchestrator-generated opaque
ids:

```jsonc
journey.fulfilments = {
  "driver": {
    "POL-2024-DRV-001": { "value": { "name": "Alex Driver", "...": "..." } }, // seeded
    "POL-2024-DRV-002": { "value": { "name": "Sam Passenger", "...": "..." } }, // seeded
    "01H8XK7M5RW6QYJ2AB": { "value": { "name": "Jordan New", "...": "..." } } // user-added
  }
}
```

Each fulfilment's id reflects its origin; nothing in the model file needs
to know about the mixing.

### Cross-fulfilment and within-fulfilment scoping

Within a fulfilment you can have the same activation logic as single
obligations. Across fulfilments you can have quantifier-shaped rules ("any
address with country ≠ UK") that are part of why scoping needs to be a
function (see §The evaluation engine).

### Existing precedent in the prototype

The prototype's `claims` loop and `addons` subtasks are respectively a
hacked-in pattern 1 (user-driven, via `arrayKey: 'claims'` +
`done: 'claimsDone'`) and pattern 2 (derived from the addons multi-select).
Neither is generalised; both would map cleanly onto this `indexedBy` shape.

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

## Service architecture — Obligations, Flows, Journeys

The Obligations model is **Flow-agnostic**. Multiple Flows for the same
Service — internal CRM, polished public web, mobile, quick prototype, fully
designed customer-facing — all reference the same Obligations. Two (or
more) Flows can coexist over the same Obligations definition (e.g. a
skeleton Flow for rapid validation alongside a polished Flow for
production, or a re-working of the polished Flow in development), which
doubles as a regression-check: if both Flows satisfy the same Obligations,
they're behaviourally equivalent at the data-contract level.

The converse rule: **anything the user submits on a form (excluding auth
and other cross-cutting concerns) should map to an obligation.**
Pure-presentational pages (start screens, "what you'll need", confirmation,
error pages, hub views) and non-data UI affordances (language toggles,
accessibility controls) are Flow furniture and live entirely in the Flow
layer.

### Layering

- **Layer 1 — Obligations** (`obligations.json` or similar): Service-level
  data contract. Identity, type, cardinality, constraints. Knows nothing
  about pages, Flows, or how data is acquired. Fully portable. **One per
  Service.**
- **Layer 1.5 — Engine + orchestrator** (`evaluator.js` + a runtime, or
  per-language equivalents): the evaluator is pure
  `(obligations, answers, config) → per-obligation state`. The
  orchestrator is the side-effecting wrapper that triggers system-handled
  obligations, collects callbacks, writes to `answers`, and re-runs the
  evaluator. Implementation-language code; not portable across languages,
  but each language consumer ships its own pair. **One per implementation
  language.**
- **Layer 2 — Flow** (e.g. `flow.json`): a static definition of how the
  Service is delivered to the user. References obligations by id; declares
  pages, ordering, grouping, per-page hard/soft mandate, copy/labels/hints,
  acquisition mechanisms for user-facing obligations (form input, file
  upload, etc.). **One or more Flows per Service** — skeleton, polished,
  re-working, etc.
- **Layer 3 — Journey** (runtime): a specific user navigating a specific
  Flow. Owns the fulfilments map (see §Fulfilments storage). Has its own
  id; isolated from other Journeys. **Zero-many Journeys per Flow per user
  at any moment** (multi-tab → multiple concurrent Journeys).

### The Flow's container hierarchy

A Flow's content is a tree of **Containers**. Two shapes:

- **Group** — a Section or SubSection. Has an ordered list of child
  Containers (Pages or further SubSections).
- **Page** — a leaf. Has an ordered list of `presents` entries (the
  page model — next subsection).

Arbitrary nesting is supported. A Section can contain SubSections that
contain further SubSections that contain Pages, in any combination.
**Each Group declares its own ordered child list; there is no
Flow-global Page ordering.**

```
Flow
├── Section "About you and your vehicle"
│   ├── Page "email"
│   ├── Page "about-you"
│   └── Page "your-vehicle"
├── Section "Add-ons" (with nested SubSections)
│   ├── Page "addon-selection"
│   ├── SubSection "Named driver"
│   │   ├── Page "named-driver-who"
│   │   └── Page "named-driver-relationship"
│   └── SubSection "Vehicle modifications"
│       ├── Page "modifications-describe"
│       └── Page "modifications-value"
├── Section "Your driving and cover"
│   └── ...
└── CheckYourAnswers   (special; not a Section)
```

A skeleton Flow may have a flat ordered list of Pages with no Groups at
all — the model needs to support both Sectioned and pure-linear shapes.
See §What's still open for the precise skeleton-shape question.

### The Flow's page model

A Page declares which obligations it presents. Pages are the unit of
HTML composition; pages map 1:1 to HTML artefacts in the implementation.

#### Static page membership (the common case)

Most pages present a fixed set of obligations:

```jsonc
// flow.json — typical page entry
{
  "page": "about-you",
  "presents": [
    { "obligation": "fullName", "mandate": "hard" },
    { "obligation": "preferredName" }, // soft (default)
    { "obligation": "phone" }, // soft
    { "obligation": "dateOfBirth" } // soft
  ]
}
```

#### Dynamic page membership (when needed)

For indexed obligations whose fulfilments are projected from state
(e.g. per-modification cost), the same page model presents a variable
number of obligation slots — one per fulfilment of the indexed
obligation:

```jsonc
{
  "page": "modification-cost",
  "presentsForEach": {
    "obligation": "modificationCost", // indexed obligation
    "fulfilment": "*", // expand to every in-scope fulfilment
    "mandate": "hard" // applies per-fulfilment
  }
}
```

The runtime expands `presentsForEach` to one virtual page-presentation
per in-scope fulfilment of the indexed obligation. Same shape works for
any indexed source (`user`, `derived`, `seeded`).

A page can mix `presents` and `presentsForEach` — a static header plus a
dynamic per-fulfilment section.

#### Per-pair mandate — soft default, explicit hard

Each page entry carries an optional `mandate` flag:

- `hard` — at Save and continue, if this obligation is in scope and
  unfulfilled at submit, the page re-renders with errors and the user
  can't advance. The `fullName-on-the-email-gate` pattern.
- `soft` (default; can be omitted) — Save and continue is allowed even
  if the obligation is in scope and unfulfilled. The Engine keeps it on
  the still-to-do list; the user encounters it again elsewhere.

Soft default + explicit hard. Skips the "I forgot to opt out" footgun
and matches the expected distribution — most page entries are not
hard-blocking.

#### Two-mandate composition

The Flow's page-level mandate and the Engine's Journey-completion
mandate compose orthogonally:

| Page-level       | Engine-level | Effect at this page                                                                                                |
| ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `hard`           | mandatory    | Must fill here AND required for Journey completion. Most restrictive.                                              |
| `hard`           | optional     | Must fill on this page (UX choice) even though the Journey doesn't strictly need it.                               |
| `soft` (default) | mandatory    | Can skip on this page; Engine keeps the obligation in scope; needed before Journey can complete. **The 90% case.** |
| `soft` (default) | optional     | No constraint at either level.                                                                                     |

Enforcement:

- **On page POST** — every page entry with `mandate: 'hard'` that is in
  scope and unfulfilled blocks Save and continue. The page re-renders
  with a GDS error summary + per-field errors.
- **On Journey completion attempt** (POST /check-your-answers or
  equivalent) — the Engine's output is the source of truth; any
  unfulfilled Engine-mandatory obligation blocks completion regardless
  of how individual pages declared their mandates.
- **On Save and continue from a page with unfilled non-hard
  obligations** — partial state is saved; navigation advances per the
  navigation algorithm (still open — see §What's still open, P).

#### Consistency tests this enables

- **Hard-mandate without rendering** — if a page hard-mandates obligation
  X but the actual HTML template doesn't have an input for X, the user
  is stuck. Static check on the (page entry, HTML template) pair.
- **Hard-mandate on never-applicable obligation** — if a page hard-
  mandates X but X can't plausibly be in scope when this page is
  reached, the constraint is dead code. Warning-level static check.
- **Cross-Flow Engine equivalence** — given identical answers + config,
  all Flows of a Service should leave the Engine in the same state at
  the end. The skeleton Flow becomes a reference oracle for the polished
  Flow.

### Acquisition methods are Flow-side

A single obligation might be acquired multiple ways (manual DOB entry vs
NI-lookup-then-extract). **These ways are NOT properties of the
obligation** — the obligation just sees a typed value arrive in its field.
Acquisition methods and their UI mechanisms are entirely Flow-layer
composition. Provenance ("which method was used") becomes Flow-side
metadata, not an obligation concept.

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

## Navigation and status

The Flow's Container tree says **what content exists**; the navigation
algorithm says **what page to show next given the current Engine state**.
Both hand off to the **status taxonomy**, which the user sees on the
Task List and which drives the navigation rules.

### Per-Container status taxonomy

Every Container (Page, SubSection, Section) has a status, computed from
the Engine output. The same five states apply at every level:

| Status               | Meaning                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Not Applicable**   | Container has no in-scope mandatory obligations — either none of its obligations apply, or all are served elsewhere in the Flow. Effectively skipped by the navigation algorithm. |
| **Cannot start yet** | Applicable but prerequisites unmet (some obligation it depends on is unsatisfied elsewhere; falls out of the Engine's `appliesWhen` / `requiredWhen` logic).                      |
| **Not Started**      | Applicable, no fulfilments yet.                                                                                                                                                   |
| **In Progress**      | Some fulfilments present, not all required ones done.                                                                                                                             |
| **Fulfilled**        | All in-scope mandatory obligations satisfied (recursive — see below).                                                                                                             |

The same vocabulary applies to the Journey as a whole, with **Fulfilled**
meaning every top-level Section is Fulfilled.

### Recursive Fulfilled definition

"Fulfilled" applies at every level of the Container tree, with the same
recursive rule:

- A **Page** is Fulfilled iff every in-scope mandatory obligation it
  presents is fulfilled (leaf rule).
- A **Group** (Section or SubSection) is Fulfilled iff every applicable
  child Container is Fulfilled.
- A **Journey** is Fulfilled iff every top-level Section is Fulfilled.

The recursion lets parents trust children's status. The Task List
displays Section-level status; users drill in for the granular view.

### Status-propagation rules

For Groups, status is derived from their children. Sketch of the
propagation (with "Not Applicable" treated as filtered-out):

- All children Not Applicable → parent is **Not Applicable**.
- All applicable children Fulfilled → parent is **Fulfilled**.
- All applicable children Cannot start yet → parent is **Cannot start
  yet**.
- All applicable children Not Started, no Fulfilled, no Cannot start
  yet → parent is **Not Started**.
- Any applicable child In Progress; or any mix of Fulfilled with Not
  Started / Cannot start yet → parent is **In Progress**.

The mixed-state cases (especially Cannot start yet vs Not Started vs In
Progress in combination) need fully specifying; see §What's still open.

### Navigation algorithm

Given an Engine state and a Container tree:

1. **Task List**: render each top-level Section with its status and a
   link. Sections with status Not Applicable are hidden; status Cannot
   start yet are shown but their link is disabled.
2. **Entering a Section**: navigate to the first applicable
   non-Fulfilled descendant Page (depth-first traversal). Whether the
   entry-Page is the first applicable, or the first applicable
   _incomplete_, is configurable per Flow — see §What's still open.
3. **On Page POST**: validate hard mandates; on success, write the
   submitted fulfilments to the Journey state; **recalculate the Engine**
   from the new state; then walk to the next applicable non-Fulfilled
   Container in the current Section's subtree. If none, return to the
   Task List.
4. **At any point** the user can navigate back to the Task List (it's
   always reachable from the page header).
5. **CYA is reachable** earlier than Fulfilled — the page renders with
   soft prompts for missing items, so the user sees current state and
   can navigate to fill the gaps. The Submit button on CYA is enabled
   iff the Journey is Fulfilled.
6. **On CYA Submit**: the Engine re-checks Journey-Fulfilled; if yes,
   transition to Submitted. If no, re-render CYA with the missing
   items called out.

The runtime never asks "what's the next page" in a hard-coded way; it
always asks "what's the next applicable, non-Fulfilled descendant Page
in the current Container subtree, given the current Engine state".
This makes navigation **correct by construction** under structural Flow
changes — add or remove a Page, change an obligation's `appliesWhen`,
and the navigation adapts without code changes.

### CYA and Change-link round-trip

CYA lists every Fulfilment with values + a Change link. With multiple
Pages presenting the same obligation, the Change link goes to **the
first matching Page in depth-first Flow traversal** (settled — option
(a) of the amend-link question).

The Change flow uses the `?change=1` pattern from the existing
prototype:

- User clicks Change → page is rendered in change mode.
- On submit, the runtime returns to CYA instead of advancing to the
  next Page in the Section.

This is a runtime-level behaviour; the Flow doesn't declare it per
page.

### Back navigation and breadcrumbs

Back is **contextual**:

- If the user arrived at this Page from the Task List or CYA, Back
  returns there.
- Otherwise (arrived from another Page in the same Section), Back
  returns to the previous Page in the Section.

Breadcrumbs (optional, per Flow design) offer additional applicable
navigation across Sections / Pages. Best treated as a renderer concern
informed by the Container tree, not a separate model concept.

### Fulfilled → Submitted lifecycle

For the Journey as a whole:

- **Not Started** — user has reached the Flow but has no fulfilments.
- **In Progress** — some Sections have In Progress / Fulfilled status.
- **Fulfilled** — all top-level Sections are Fulfilled; CYA Submit is
  enabled.
- **Submitted** — user clicked Submit on CYA. Journey is final; no
  further changes. The system might surface a receipt / confirmation
  page, but the fulfilments are immutable.

A Journey can move between In Progress and Fulfilled freely (e.g. the
user fulfils everything, then goes back to amend, dropping back to In
Progress, then fulfils again). Only Submitted is a one-way transition.

## Tests

The layered architecture enables (and to some extent requires) tests at
several distinct levels. They differ in what they verify, what
infrastructure they need, and when they earn their keep.

### Test classes

| Layer                 | Test class                                                                                                                                                           | Inputs                                             | Style                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| Static — model only   | **Static reachability** — every obligation is presented by at least one Flow page                                                                                    | Obligations + Flow                                 | Pure JSON walk                     |
| Static — model + HTML | **Model ↔ HTML alignment** — page model and HTML templates agree (multiple sub-checks)                                                                               | Flow + HTML templates                              | HTML parse + comparison            |
| Dynamic — runtime     | **Dynamic reachability / completability** — for any plausible Engine state, the navigation algorithm yields pages that present every in-scope unfulfilled obligation | Obligations + Flow + Engine + navigation algorithm | Property-based / state enumeration |
| Cross-Flow            | **Engine-equivalence across Flows** — given identical answers + config, all Flows of a Service leave the Engine in the same state                                    | Obligations + ≥2 Flows + Engine + scripted answers | Fixture-driven                     |
| Browser               | **End-to-end happy-path** — the rendered service actually works                                                                                                      | Live app                                           | Playwright / similar               |

The first two are CI-fast (fixture-only). The third needs the Engine and
navigation algorithm but no browser. The fourth needs ≥2 Flows. The fifth
is the existing prototype Playwright suite.

### Model ↔ HTML alignment — sub-checks

All four run from the same inputs (Flow + HTML); one walker per page
entry asserts alignment.

- **Forward alignment** — every `presents` entry on a page has a matching
  HTML input. Hard-mandate variant is a strict case: a hard mandate with
  no input means the user is provably stuck.
- **Reverse alignment** — every HTML input has a matching `presents`
  entry (catches orphan form fields not in the model).
- **Type alignment** — the HTML widget can produce values that satisfy
  the obligation's type (`date` obligation → date input or three-part
  widget; `email` → `type="email"`).
- **A11y / required-attribute alignment** — for `mandate: 'hard'`
  entries, the HTML signals "required" appropriately (`aria-required`,
  error-message id wiring, etc.).

### Dynamic reachability — sub-checks

- **State-aware reachability** — for property-generated (answers, config)
  combinations, the Engine produces a state and the navigation algorithm
  yields a page-path the user can navigate to satisfy every in-scope
  unfulfilled obligation.
- **Hard-mandate-on-never-applicable** — for every page entry with
  `mandate: 'hard'`, is the obligation in scope in any plausible Engine
  state when this page is reached? Otherwise the constraint is dead code.

(The plain "every obligation has a page" check lives in the static-
reachability row above, since it doesn't need the Engine.)

### Cross-Flow Engine equivalence — the central architectural assertion

This is the formal proof of the architectural claim: **Obligations are
the data contract; Flows are interchangeable presentations**. Without it,
the claim is aspirational.

**How it works.** Scripts are written at the **obligation level**, not
the page level:

```ts
const basicScript = [
  { obligation: 'email', value: 'alex@example.com' },
  { obligation: 'fullName', value: 'Alex Driver' },
  { obligation: 'dateOfBirth', value: '1985-03-27' }
  // ...
]

for (const flow of [skeletonFlow, polishedFlow, mobileFlow]) {
  const engineState = runScript(basicScript, flow)
  expect(engineState).toEqualSnapshotForScript(basicScript)
}
```

The script-runner uses the navigation algorithm to walk each Flow,
delivering the user's intent to whichever pages present which
obligations. Engine state at the end is the single point of comparison.

**Value**:

- Skeleton Flow becomes a regression oracle for the polished Flow.
- Free coverage for any new Flow added to the Service — replay the same
  scripts.
- Refactor-safety: rework the polished Flow and prove the data is
  unchanged.
- Migration safety: users hopping Flows mid-flight don't suffer state
  corruption.
- A/B integrity: an experiment varies presentation, not behaviour.
- Multi-channel coherence: web + mobile + CRM Flows produce identical
  results from identical inputs.
- Surfaces "Flow has snuck in business logic" smells: failure usually
  means presentation is doing too much.

**When they're necessary vs optional**:

| Scenario                                                   | Cross-Flow scripts needed?         |
| ---------------------------------------------------------- | ---------------------------------- |
| Multiple Flows live in production simultaneously           | Yes — active correctness check     |
| Active A/B experiments                                     | Yes — experiment integrity         |
| Mid-flight Flow migration                                  | Yes — data-safety proof            |
| Skeleton Flow alongside polished Flow during development   | Yes — oracle for the polished work |
| Single mature Flow in production, no A/B, no multi-channel | No — nothing to compare against    |

**Infrastructure vs scripts**:

- **Infrastructure** (script runner, snapshot machinery, obligation-
  language script format): build once during the prototypes / first
  productionisation. Reusable across all Services. Cheap to keep around.
- **Per-Service scripts**: written per Service and only worth
  maintaining if the Service has multiple Flows to compare. Retire
  scripts when a Service goes single-Flow; resurrect them when it
  goes multi-Flow again.

### A note on architectural-invariant tests

Cross-Flow Engine equivalence is an **architectural invariant test** —
it proves the layering claim holds. During the prototypes and early
productionisation it's how you discover that the architecture is sound
(and where it isn't).

Once trust is established, you can scale these tests down for single-Flow
Services — but plan a replacement to keep the architecture from drifting:

- **Static / lint-style checks** that flag Flow code accessing things it
  shouldn't (e.g. Flow trying to do scoping logic that belongs in the
  Engine).
- **Code-review discipline** with the layering docs at hand.
- **Periodic spot-checks** when touching the architecture, even if not
  on every CI run.

Without one of those, the layering can rot quietly. The cross-Flow test
was an enforcement mechanism; if you retire it, plan its replacement.

### Honest caveats

- Cross-Flow tests only test what the scripts cover. A discipline of
  script coverage is separate.
- They depend on the navigation algorithm being correct. A bug in nav =
  the test fails for the wrong reason. So dynamic-reachability tests
  should land first.
- Snapshot comparison is fiddly — Engine output includes provenance
  reasons and fulfilmentIds that differ per Flow for indexed obligations
  (because `user`-source fulfilmentIds are orchestrator-generated UUIDs
  per Flow). Comparison should target the canonical fulfilment _values_,
  not per-Flow identifiers.

## What's still open

### H. Controller mechanism for indexed obligations — hybrids

The structural part of this question and the per-source fulfilmentId
shapes are now settled — see §The `indexedBy` shape — source × mutability
and §Fulfilments storage. One sub-question remains:

- **H.2 Hybrid source/mutability combinations** — `seeded + read-only`
  (audit data), `derived + user-can-add-extras`, user-driven with min/max
  constraints. Deferred until a concrete journey makes a hybrid case real.

### N. Cross-obligation references between fulfilments

When one fulfilment refers to another — e.g. "claim X relates to driver
Y", where both `claims` and `drivers` are indexed obligations and a claim
fulfilment needs to point at a specific driver fulfilment. Two stances:

- **Model-level "foreign key"** — the model declares the reference;
  runtime enforces referential integrity (can't delete a driver if a
  claim still references them; cascade or block).
- **Just data the evaluator handles** — the model says nothing special. A
  claim fulfilment happens to have a field whose value happens to be a
  driver's fulfilmentId. Any referential integrity is a scoping concern.

The second is simpler and consistent with the "scoping is a function"
position. The first is more structured if integrity needs to be enforced
generically. Defer until a concrete cross-reference case emerges.

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

### P. Navigation algorithm — sub-questions

The core navigation algorithm is now sketched in §Navigation and status,
including the Container tree, recursive Fulfilled definition, status
taxonomy, the recalc-then-route rule, CYA round-trip, and contextual
back navigation. Several sub-questions remain:

- **P.1 Container model — distinct types or unified?** Two design
  options for the Flow schema:
  - (a) **Three distinct types** — `Section`, `SubSection`, `Page` as
    schema-level discriminants. Explicit; more types to define.
  - (b) **Unified recursive `Container`** — every node has `id`,
    `title`, EITHER `children: [Container]` (Group form) OR `presents:
[...]` (Page form). Composes naturally with arbitrary nesting.

  Leaning (b) for clean recursion; (a) might surface useful
  distinctions (e.g. "top-level Sections show on Task List by default;
  deeper Groups don't").

- **P.2 Status-propagation rules for mixed-state Group children.**
  The §Navigation and status table is sketched but not pinned. The
  trickier mixed cases (Fulfilled + Cannot start yet, Not Started +
  Cannot start yet, etc.) need a precise truth table.

- **P.3 First-Page vs first-incomplete-Page on Section entry.** When
  the user enters a Section, does the runtime jump to the first
  applicable Page, or the first applicable Page that isn't yet
  Fulfilled? Probably the latter (resume where you left off), but
  worth being a Flow-level configurable.

- **P.4 First-incomplete navigation for deeply nested containers.**
  When entering a Section, does the runtime walk depth-first through
  the tree to find the first incomplete Page anywhere in the subtree
  (deep-link to where you left off), or stop at the first level (so
  the user drills into SubSections themselves)?

- **P.5 Skeleton Flow shape.** Does the model require at least one
  Section (a skeleton uses a single anonymous Section wrapping all
  Pages), or does it permit a top-level `pages: [...]` alternative
  shape with no Sections at all? Most uniform: always wrap in a
  Section, suppress the Task List in the renderer if there's only one.

- **P.6 Task List rendering of nested SubSections.** UX choice that
  may need Flow-level declaration: render flat with indentation;
  show only top-level Sections and reveal SubSections on drill-in;
  show SubSections as "tasks within tasks" on a sub-hub. Mostly a
  renderer concern but the Flow may want to express hints.

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
