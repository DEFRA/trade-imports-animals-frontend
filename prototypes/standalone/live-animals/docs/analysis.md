# Model analysis: the simulator and the two reachability provers

The prototype ships three tools that interrogate the journey without a browser
or a running server. They compute over the model, so they are cheap to run and
they cannot drift from what the app does.

- [`analysis/simulate.js`](../analysis/simulate.js) — walk a persona through the
  flow and get the ordered page sequence back.
- [`analysis/flow-reachability.js`](../analysis/flow-reachability.js) — the
  **page-level** prover: every in-scope obligation is presented by a page, and
  that page is reachable in the state that scopes it.
- [`model/analysis/reachability.js`](../model/analysis/reachability.js) — the
  **obligation-dependency** prover: every gated obligation's `dependsOn` graph
  terminates at an always-in-scope seed, and every gate can be opened by a
  synthesised value.

All three run inside the unit suite. Run it with `npm run test:live-animals`.
This page explains what each tool proves, why it can be trusted, and where the
proof deliberately stops.

## Why the model can be analysed at all

Two design choices make the journey a checkable object rather than something you
click through:

1. **Derivation is pure and browser-free.** Scope, completeness and status are
   computed from the answers map on every read (see
   [scope-and-wipe.md](scope-and-wipe.md)). Nothing derived is stored, and the
   engine touches no request, view or browser API. Any code that holds an
   answers map can ask the same questions the running app asks.
2. **The scope space is small and finite.** An obligation enters scope through
   its `applyTo` closure, which reads a handful of top-level answers. The full
   product of those scope-controlling answers is 24 states — small enough to
   enumerate rather than sample (see [obligation-model.md](obligation-model.md)
   and [flow-and-gates.md](flow-and-gates.md)).

Each `applyTo` closure is opaque JavaScript, but it carries a structured
`.metadata` sidecar built by the helper factories in
[`model/obligations/helpers.js`](../model/obligations/helpers.js). The metadata
declares **which obligation the gate reads** (`dependsOn`) and, for the
structured helper family, **what value would open it**. That sidecar is what
turns the closures into analysable data.

## The simulator: persona in, page sequence out

`simulateJourney(answers)` in [`analysis/simulate.js`](../analysis/simulate.js)
takes a persona and returns the ordered list of page ids that persona would
visit. A persona is just an answers map — the same shape the store holds. There
is no persona DSL:

```js
simulateJourney({
  countryOfOrigin: 'FR',
  transporterType: 'Commercial'
})
// -> ['origin', 'commodities', ..., 'declaration'] in flow order
```

The simulator derives scope with the real `makeScope` from
[`engine/index.js`](../engine/index.js), then threads the flow section by
section. It emits each page whose section gate and page gate both pass, using
the real `sectionGatePasses` and `pageGatePasses` from
[`flow/gates.js`](../flow/gates.js). That reproduces the journey shape — a run
through each open section, back to the hub, on to the next — as one flat ordered
list.

The whole function is a dozen lines because **it re-implements nothing**. Scope
comes from the engine the app uses; gating comes from the flow the app uses.
There is no second copy of the rules, so the simulation cannot drift from
runtime behaviour.

One setup requirement: the simulator needs the same boot wiring as the app. Call
`buildDispatch(dispatchPages)` and
`configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` first, exactly as
[`routes.js`](../routes.js) does — derived gates and submit readiness both fail
loud if you skip this. The `beforeAll` in
[`analysis/flow-reachability.test.js`](../analysis/flow-reachability.test.js)
shows the two calls.

## The page-level prover: no owed obligation is a dead end

`proveFlowReachability()` in
[`analysis/flow-reachability.js`](../analysis/flow-reachability.js) proves the
property:

> There is no scope state in which an obligation is in scope (owed) but the page
> that presents it cannot be reached under that same scope.

The boot coverage assertion in [`flow/dispatch.js`](../flow/dispatch.js) already
proves that every obligation is collected by exactly one page. This prover goes
further: whenever the obligation is owed, that page is actually reachable through
the flow gates. A gap would be a dead end — the journey demands an answer the
user can never give.

It reports two problem kinds:

- **`no-owning-page`** — an obligation is in scope, but dispatch indexes no page
  that presents it (`pageOfObligation` returns nothing).
- **`owning-page-unreachable-in-scope`** — the owning page exists, but is not in
  the reachable set for the state that scopes the obligation.

An empty problems list means proven. The unit suite pins
`expect(proveFlowReachability()).toEqual([])`.

### How the state space is covered

Naive enumeration is impossible because collections hold any number of
instances. The prover stays finite by combining a fixed happy-path base with the
scope-flag cross-product:

- **`enumerateScopeStates()`** yields the 24 top-level scope states — the
  cross-product of `regionOfOriginCodeRequirement` × `reasonForImport` ×
  `meansOfTransport` × `transporterType` (2 × 2 × 2 × 3). These are the answers
  that move conditional obligations into and out of scope; non-activating
  answers cannot change scope, so this product is the complete top-level space.
- **`submitReadySeed`** is a maximal, submit-ready base answer set with one
  representative commodity line and one animal identifier. It puts almost every
  obligation in scope. Each of the 24 states is overlaid on top of it, so every
  step's answer-based prerequisites stay satisfied while the state's own
  triggering answers win.
- **`withoutBlanks`** strips empty axes from a state before overlaying. Blank
  values would knock the always-in-scope `declaration` out of the review gate
  and false-fail the run; activation is always positive, so no witness needs a
  blank axis.

For each state the prover reads `inScope` from `makeScope`, reads the reachable
pages from `simulateJourney`, and checks every in-scope obligation against
`pageOfObligation`. `makeScope` layers two frontend-only flow obligations
(`importType`, `declaration`) onto the projected scope so their pages stay
reachable; the prover skips them via `A_ONLY_FLOW_OBLIGATIONS`, along with the
`SYSTEM_POPULATED` fields, because none of those is presented by a page. Their
page reachability is a runtime concern covered by the flow and E2E tests, not a
model fact.

### It proves it has teeth

`proveFlowReachability({ scopeFor, pagesFor })` accepts injectable scope and page
oracles, and
[`analysis/flow-reachability.test.js`](../analysis/flow-reachability.test.js)
feeds it a flow with pages dropped. Dropping every page except `origin` and
`commodities` makes the prover report each in-scope obligation owned by a
removed page (for example `transporterType`) as
`owning-page-unreachable-in-scope`. Injecting a scope that carries an
obligation dispatch never indexed makes it report `no-owning-page`. A prover that
cannot fail proves nothing; the injection points keep that checkable.

### The soundness condition

One representative instance per obligation suffices only under a condition worth
stating plainly:

> Every flow gate is a read of scope or of answers the base already supplies.

Flow gates read answers as well as scope. Mandate-derived sequencing gates a step
on earlier `enforcedAt: 'continue'` obligations being answered, and the `review`
section gates on submit-readiness (`(scope) => scope.readyForCheckYourAnswers`).
Because every candidate rides the fully submit-ready `submitReadySeed`, those
answer-based prerequisites are met in every state, so a state that owes an
obligation also reaches its page. If you author a gate that keys off an answer
the base does not already supply, extend `submitReadySeed` or the enumeration —
otherwise the prover will false-fail the step whose prerequisite is unmet. See
[flow-and-gates.md](flow-and-gates.md) for the gate seam itself.

## The obligation-dependency prover: every gate can open

[`model/analysis/reachability.js`](../model/analysis/reachability.js) proves a
different property, one level below pages — that the obligation dependency graph
is sound:

> Every gated obligation's `dependsOn` chain terminates at an always-in-scope
> seed, and every gate whose helper carries recoverable metadata can be opened
> by a concrete synthesised value.

It runs in two layers.

### Layer 1 — the graph check

`proveReachability(records)` operates over `{ id, dependsOn }` records and
returns `{ reachable, unreachable, errors }`. An obligation is **reachable** if:

- its `dependsOn` is empty (an always-in-scope seed); or
- its `dependsOn` is a pure self-loop `[own-id]` — no external prerequisite, so
  it acts as a seed; or
- every non-self dependency is already reachable.

The classification is a fixpoint iteration that stops when no new node is marked.
Structural defects are reported in `errors` and excluded from the
reachable/unreachable split: a missing `dependsOn` array, or a `dependsOn` id
that resolves to no obligation in the manifest (a dangling reference). A dangling
id is reported, never crashed on.

The records come from the manifest: an obligation with an `applyTo` contributes
`obligationMetadata(o).dependsOn` (the derived-or-declared dependency the helper
metadata names), and an obligation without one is a seed. On the real manifest
the prover reports zero unreachable and zero errors — the unit suite pins that.

### Layer 2 — witness synthesis

The graph check alone would pass vacuously for a gate whose predicate can never
fire. `synthesiseWitness(obligation)` closes that gap. It inspects the gate's
`applyTo.metadata` and returns one of three kinds (`WITNESS_KIND`):

- **`witness`** — `{ obligationId, value, projection? }`: a concrete value that,
  written under `obligationId` in a fulfilments map, opens the gate. The value
  comes straight from the metadata — the first entry of an allowlist
  (`allowListed`, `anyAllowListed`, `includesGate`), the scalar target
  (`matches`, `equalsGate`), a non-blank sentinel (`presentGate`,
  `presentPerRecord`), or a sentinel outside the derived union (`notInUnionOf`).
  A `projection` group id is carried for depth-N gates whose gated obligation
  sits deeper than the gate (per-unit identifiers project onto `unitRecord`).
- **`trivial`** — the gate is always open: a structural group with no `applyTo`,
  a bare always-in-scope closure, an `alwaysInScope` helper, or a status-flip
  gate whose two branches are both `inScope: true`. No witness is needed.
- **`opaque`** — the metadata carries no data-level target, so only the
  graph-level check applies. The manifest currently has none.

`proveWithWitnesses(obligations)` runs the graph check, then for every `witness`
kind feeds the synthesised value through the **real `applyTo` closure** and
asserts it returns `inScope: true`, seeding a synthetic projection path for
depth-N gates. A witness that fails to open its own closure is a build-time
defect — metadata drift against the real predicate — and is pushed to `errors`.
The result reports how much of the manifest each kind covers:
`{ reachable, unreachable, errors, witnesses: { synthesisable, trivial, opaque } }`.
On the real manifest every witness opens its closure, the opaque set is empty,
and at least fourteen gates are value-level proved.

### The coverage gate keeps synthesis honest

Every helper in [`model/obligations/helpers.js`](../model/obligations/helpers.js)
that attaches a `.metadata.type` must be classified — either as a
witness-synthesisable helper in `STRUCTURED_HELPER_TYPES`, or as opaque-by-design
in `OPAQUE_HELPER_TYPES`.
[`model/analysis/coverage.test.js`](../model/analysis/coverage.test.js) pins this
in both directions: the two sets are disjoint, `STRUCTURED_HELPER_TYPES` matches
the `case` labels dispatched inside `synthesiseWitness` exactly, and every helper
export whose gate carries a `.metadata.type` classifies as one or the other.

This is the maintenance fact that follows from the design: **a new gate helper is
a three-touch change** — the factory in `helpers.js`, a `case` in
`synthesiseWitness`, and an entry in `STRUCTURED_HELPER_TYPES`. Skip any one and
the coverage gate fails, so the prover can never silently drift toward
classifying everything as opaque and passing vacuously.

## What the proof deliberately does not cover

Both provers reason about **reachability**, not **input validity**. Whether a
given answer is valid is not a model fact — it lives in the controller's
validation schema (see [validation.md](validation.md)), and exposing those
schemas to the model would re-couple model and controller, the exact coupling the
seams exist to avoid. Synthesised witnesses and seed answers steer scope; they
are not claims that those values would pass validation. Completion-readiness
(`requires`, `anyOfIds`) stays a pure model fact and is provable; input validity
deliberately is not.

The same boundary cuts the other way: **a controller `if` that affects
navigation is invisible to every prover**. The simulator and both provers see
only the model, the flow and the gate seam. Navigation decisions must flow
through gates, where analysis can see them — bury one in a controller and every
guarantee on this page silently excludes it.
