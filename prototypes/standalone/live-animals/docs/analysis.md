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
  countryOfOrigin: 'FR',
  transporterType: 'Commercial'
})
// -> ['origin', 'commodities', ..., 'declaration'] in flow order
```

The simulator derives scope with the real `makeScope` from `engine/index.js`, then threads the flow section by section. It emits each page whose section gate and page gate both pass, using the real `sectionGatePasses` and `pageGatePasses` from `flow/gates.js`. That reproduces the journey shape — a linear run through each open section, back to the hub, on to the next — as one flat ordered list.

The whole function is a dozen lines because **it re-implements nothing**. Scope comes from the engine the app uses; gating comes from the flow the app uses. There is no second copy of the rules, so the simulation cannot drift from runtime behaviour.

One setup requirement: the simulator needs the same boot wiring as the app. Call `buildDispatch(dispatchPages)` and `configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` first, exactly as `routes.js` does — derived gates and submit readiness both fail loud if you skip this (see [flow-and-gates.md](flow-and-gates.md)). The `beforeAll` in [`analysis/simulate.test.js`](../analysis/simulate.test.js) shows the two calls.

## The reachability prover

`proveReachability()` in [`analysis/reachability.js`](../analysis/reachability.js) proves the property:

> No owed obligation is unreachable. There is no scope state in which an obligation is in scope (owed) but the page that owns it cannot be reached under that same scope.

The boot coverage assertion in `flow/dispatch.js` already proves that every obligation is collected by exactly one page. The prover goes further: whenever the obligation is owed, that page is actually reachable. A gap here would be a dead end — the journey demands an answer the user can never give.

An empty problems list means proven. The unit suite pins `expect(proveReachability()).toEqual([])`.

### Representative-instance witnessing

Collections make naive enumeration impossible — a driver can hold any number of claims, so the instance space is unbounded. The prover stays tractable by building one minimal **witness** answers map per obligation definition, at every depth (`walkObligations()` yields the full tree):

- **Top-level activators** come from `enumerateScopeStates()`: every combination of the scope-controlling top-level answers (`regionOfOriginCodeRequirement` × `reasonForImport` × `meansOfTransport` × `transporterType` — 24 states). Non-activating answers cannot affect scope, so this product is the complete top-level space.
- **Collection ancestors** each get a single representative entry at index 0 (`scaffoldFor`). Per-instance independence means instance 0 stands in for instance n: all instances of a definition share the same derived owning page.
- **Item-conditional gates** are satisfied inside that representative entry. To witness `numberOfPackages`, the scaffold sets the sibling `commoditySelection` to a package-count commodity in line 0.

Each candidate witness is checked with the real `reconcile` — the prover asserts the target's instance path (for example `commodityLines[0].numberOfPackages`) is genuinely in scope before testing reachability. The cost is linear in the number of obligation definitions times their item-conditional branches. It is never exponential in nesting depth or instance count, because one representative instance generalises.

One maintenance fact follows from this design:

- **A new top-level activator must be added to `enumerateScopeStates()`.** The function names the top-level scope-controlling answers explicitly. If you add an obligation whose scope is steered by a new top-level answer, extend the enumeration or the prover will never witness it.

## The fail-loud contract

The prover never skips silently. `buildWitnesses()` pairs every non-system obligation with its witness; if no enumerated state puts the target in scope, the witness is `null` and `proveReachability()` reports it as a problem with reason `no-witness-puts-in-scope`. That is surfaced as a prover bug — a hole in the enumeration — not quietly passed over. A missing owning page is reported the same way (`no-owning-page`).

There is one deliberate, self-emptying exclusion: an obligation whose activator obligation is no longer registered (the activator survives only as a module-local identity stub after its collecting feature was removed) can never enter scope by construction, so it drops out of the witness set instead of reporting as a prover bug. The exclusion set is derived from the registry and emptied as the stub-bearing car features were deleted — its last member was the system `premium` (activated off the unregistered `coverType` stub), which went with the quote feature in inc-028. The set is now empty: every registered activator resolves to a registered obligation. The mechanism is kept as a live guard, so if a future feature ever leaves an unregistered activator behind, its root re-enters the exclusion set rather than failing the prover.

The prover also proves it has teeth. `proveReachability({ pagesFor })` accepts an injectable page oracle, and [`analysis/reachability.test.js`](../analysis/reachability.test.js) feeds it a flow with pages dropped. Dropping the `commodities` collection-hub page makes the prover report `commodityLines[0].numberOfPackages` as a dead end, naming the dropped hub as the derived owning page. A prover that cannot fail proves nothing; the injection point keeps that checkable.

## The soundness condition

One witness per obligation would suffice trivially only under a condition worth stating plainly:

> Every flow gate is a pure read of scope (`scope.inScope`).

When that holds, page reachability is a function of the very scope predicate that owes the obligation — so any state that owes the obligation also reaches the page, and one owing state is as good as all of them.

That condition no longer holds: flow gates now read ANSWERS as well as scope. RULE 1 (mandate-derived sequencing) gates a step on earlier `enforcedAt: 'continue'` obligations being answered, and RULE 2 gates the `review` section on submit-readiness — an authored gate `(scope) => scope.readyForCheckYourAnswers`. A scope-only witness fragment would therefore false-FAIL a step whose answer-based prerequisites are unmet.

The prover answers this the way its own soundness note always reserved — by enumerating richer witnesses. Each candidate now rides a fully submit-ready BASE journey (`submitReadySeed` in `reachability.js`), layered under the enumerated scope state and the target's own scaffold, so every step's answer-based prerequisites are met while the target's specific triggering state still wins. Blank enumerated axes are dropped before layering (activation is always positive, so no witness needs a blank axis, but a blank would defeat the RULE 2 review gate for the always-in-scope `declaration`). If you author a gate that keys off an answer this base does not already supply, extend the base or the enumeration. See [flow-and-gates.md](flow-and-gates.md) for the gate seam itself.

## What the proof deliberately does not cover

The prover reasons about **page reachability under scope**, not **input validity**. Whether a given answer is valid is not a model fact — it lives in the controller's validation schema (see [validation.md](validation.md)), and exposing those schemas to the model layer would re-couple model and controller, the exact coupling the v2 seams exist to avoid. The witnesses set gate and sibling answers only to steer scope; they are not claims that those values would pass validation. Completion-readiness (`required`, `requiredAtLeastOne`) stays a pure model fact and is provable; input validity deliberately is not.

The same boundary explains a rule of the paradigm from the other direction: **a controller `if` that affects navigation is invisible to any prover**. The simulator and prover see only the model and the gate seam. Navigation decisions must therefore flow through gates, where analysis can see them — bury one in a controller and every guarantee on this page silently excludes it.
