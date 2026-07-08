# Model analysis: simulation and the reachability prover

The `analysis/` folder holds two tools that interrogate the journey without a browser or a server:

- [`analysis/simulate.js`](../analysis/simulate.js) — walk a persona through the journey and get the ordered page sequence back
- [`analysis/reachability.js`](../analysis/reachability.js) — prove that no owed obligation is ever unreachable

Both run inside the unit suite (`npm run test:live-animals` from the repo root). This page explains what they do, why they are trustworthy, and where the proof deliberately stops.

## Why the model can be analysed at all

This is the payoff of the paradigm. Two design choices make the journey a checkable object rather than something you click through:

1. **The state layer is pure and browser-free.** Scope, completeness and status are derived from the answers map alone, on every read (see [scope-and-wipe.md](scope-and-wipe.md)). Nothing derived is stored, and the engine touches no request, view or browser API. Any code that holds an answers map can ask the same questions the running app asks.
2. **The predicate vocabulary is tiny and finite.** An obligation enters scope through `activatedBy` — a data literal with exactly three operators (`equals`, `includes`, `present`) over a real obligation reference, interpreted in one place (`engine/evaluate/predicate.js`). See [obligation-model.md](obligation-model.md). Because activation is data over a small finite domain, the full space of scope states can be enumerated, not sampled.

Together these mean journey properties are functions you can call. The simulator and the prover are both short because they compute over the model — they do not drive a UI.

## The simulator: persona in, page sequence out

`simulateJourney(answers)` in [`analysis/simulate.js`](../analysis/simulate.js) takes a persona and returns the ordered list of page ids that persona would visit.

A persona is just an answers map — the same shape the store holds. There is no persona DSL:

```js
simulateJourney({
  fullName: 'Alex',
  hadClaims: 'no',
  coverType: 'comprehensive'
})
// -> ['origin', 'commodities', ..., 'declaration'] in flow order
```

The simulator derives scope with the real `makeScope` from `engine/index.js`, then threads the flow section by section. It emits each page whose section gate and page gate both pass, using the real `sectionGatePasses` and `pageGatePasses` from `flow/gates.js`. That reproduces the journey shape — a linear run through each open section, back to the hub, on to the next — as one flat ordered list.

The whole function is a dozen lines because **it re-implements nothing**. Scope comes from the engine the app uses; gating comes from the flow the app uses. There is no second copy of the rules, so the simulation cannot drift from runtime behaviour.

One setup requirement: the simulator needs the same boot wiring as the app. Call `buildDispatch(dispatchPages)` and `configureReadyForQuote(readyForQuote)` first, exactly as `routes.js` does — derived gates and quote readiness both fail loud if you skip this (see [flow-and-gates.md](flow-and-gates.md)). The `beforeAll` in [`analysis/simulate.test.js`](../analysis/simulate.test.js) shows the two calls.

## The reachability prover

`proveReachability()` in [`analysis/reachability.js`](../analysis/reachability.js) proves the property:

> No owed obligation is unreachable. There is no scope state in which an obligation is in scope (owed) but the page that owns it cannot be reached under that same scope.

The boot coverage assertion in `flow/dispatch.js` already proves that every obligation is collected by exactly one page. The prover goes further: whenever the obligation is owed, that page is actually reachable. A gap here would be a dead end — the journey demands an answer the user can never give.

An empty problems list means proven. The unit suite pins `expect(proveReachability()).toEqual([])`.

### Representative-instance witnessing

Collections make naive enumeration impossible — a driver can hold any number of claims, so the instance space is unbounded. The prover stays tractable by building one minimal **witness** answers map per obligation definition, at every depth (`walkObligations()` yields the full tree):

- **Top-level activators** come from `enumerateScopeStates()`: every combination of the scope-controlling top-level answers (`hadClaims` × `voluntaryExcess` × `coverType` × every subset of the add-on slugs — 64 states). Non-activating answers cannot affect scope, so this product is the complete top-level space.
- **Collection ancestors** each get a single representative entry at index 0 (`scaffoldFor`). Per-instance independence means instance 0 stands in for instance n: all instances of a definition share the same derived owning page.
- **Item-conditional gates** are satisfied inside that representative entry. To witness `windscreenProvider`, the scaffold sets the sibling `claimType: 'windscreen'` in claim 0.

Each candidate witness is checked with the real `reconcile` — the prover asserts the target's instance path (for example `drivers[0].claims[0].windscreenProvider`) is genuinely in scope before testing reachability. The cost is linear in the number of obligation definitions times their item-conditional branches. It is never exponential in nesting depth or instance count, because one representative instance generalises.

Two maintenance facts follow from this design:

- **The add-on list is derived, never re-typed.** `ADDONS` is computed by scanning every `includes` predicate that activates off the `addons` picker. Add a new add-on to the model and its slug enters the enumeration for free.
- **A new top-level activator must be added to `enumerateScopeStates()`.** The function names the top-level scope-controlling answers explicitly. If you add an obligation whose scope is steered by a new top-level answer, extend the enumeration or the prover will never witness it.

## The fail-loud contract

The prover never skips silently. `buildWitnesses()` pairs every non-system obligation with its witness; if no enumerated state puts the target in scope, the witness is `null` and `proveReachability()` reports it as a problem with reason `no-witness-puts-in-scope`. That is surfaced as a prover bug — a hole in the enumeration — not quietly passed over. A missing owning page is reported the same way (`no-owning-page`).

The prover also proves it has teeth. `proveReachability({ pagesFor })` accepts an injectable page oracle, and [`analysis/reachability.test.js`](../analysis/reachability.test.js) feeds it a flow with pages dropped. Dropping the `claims` and `drivers` collection-hub pages makes the prover report `claims[0].windscreenProvider` and `drivers[0].claims[0].windscreenProvider` as dead ends, naming the dropped hub as the derived owning page. A prover that cannot fail proves nothing; the injection point keeps that checkable.

## The soundness condition

One witness per obligation suffices only under a condition worth stating plainly:

> Every flow gate must be a pure read of scope (`scope.inScope` / `scope.readyForQuote`).

When that holds, page reachability is a function of the very scope predicate that owes the obligation — so any state that owes the obligation also reaches the page, and one owing state is as good as all of them.

The condition holds today in two ways:

- **By construction** for derived gates — the default. `flow/gates.js` derives a gate from exactly the obligations the step collects, read from scope.
- **By discipline** for the one authored gate — `get-your-quote`'s `(scope) => scope.readyForQuote`.

The risk sits with future authored gates. If someone writes a gate that keys off an answer outside the scope-owing condition — a raw read of the answers map, say — a single witness could false-pass, and the prover would need to enumerate more witnesses. If you are editing `flow/gates.js` or authoring a gate, keep gates as pure reads of scope. See [flow-and-gates.md](flow-and-gates.md) for the gate seam itself.

## What the proof deliberately does not cover

The prover reasons about **page reachability under scope**, not **input validity**. Whether a given answer is valid is not a model fact — it lives in the controller's validation schema (see [validation.md](validation.md)), and exposing those schemas to the model layer would re-couple model and controller, the exact coupling the v2 seams exist to avoid. The witnesses set gate and sibling answers only to steer scope; they are not claims that those values would pass validation. Completion-readiness (`required`, `requiredAtLeastOne`) stays a pure model fact and is provable; input validity deliberately is not.

The same boundary explains a rule of the paradigm from the other direction: **a controller `if` that affects navigation is invisible to any prover**. The simulator and prover see only the model and the gate seam. Navigation decisions must therefore flow through gates, where analysis can see them — bury one in a controller and every guarantee on this page silently excludes it.
