# Model and flow analysis

The platform provides browser-free tools for checking configured obligation and
journey policy.

## Journey simulator

[`src/server/app/analysis/simulate.js`](../analysis/simulate.js) evaluates an answers
object with the real scope and gate functions. It reads sections through the
journey-flow configuration seam and returns the ordered ids of pages whose section
and page gates pass.

The obligation set, journey flow and dispatch index must be configured before the
simulator runs.

## Page-level reachability

[`src/server/app/analysis/flow-reachability/index.js`](../analysis/flow-reachability/index.js)
checks that each in-scope obligation has an owning page and that the page is
reachable in a representative state that scopes the obligation.

The prover accepts injected scope and page oracles so tests can prove that its
failure cases work. It reasons about model and flow gates, not validation hidden in
a controller.

## Obligation dependency reachability

[`src/server/app/model/analysis/reachability/`](../model/analysis/reachability/)
checks the dependency graph declared by obligation helper metadata. It identifies
missing dependencies and chains that cannot reach a seed.

Witness synthesis uses structured helper metadata to produce a value intended to
open a gate, then executes the real `applyTo` closure. Helpers without a structured
witness are classified explicitly rather than treated as proved.

[`src/server/app/model/analysis/coverage.test.js`](../model/analysis/coverage.test.js)
keeps helper metadata types and witness classifications in step.

## Deliberate boundary

These tools prove reachability and dependency properties. They do not prove that a
controller accepts a value, that copy is correct or that a browser interaction is
accessible. Those concerns remain controller, convention and Playwright tests.
