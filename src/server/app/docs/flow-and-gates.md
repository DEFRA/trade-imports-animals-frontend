# Flow machinery and gates

The platform owns the algorithms in `src/server/app/flow/`. A journey owns the page
order and task-row policy that those algorithms consume.

## Journey-flow configuration

[`src/server/app/flow/journey-flow.js`](../flow/journey-flow.js) is the injection
seam. `configureJourneyFlow()` receives:

- `sections`
- `taskRows`
- `rowStatus`
- `nextRunTarget`
- `flowOnlyKeys`
- `entryGuardTarget`
- `layout`

The exported accessors fail when callable policy has not been configured. L1 calls
this seam once during route registration.

## Dispatch

[`src/server/app/flow/dispatch.js`](../flow/dispatch.js) builds indexes from injected
page descriptors. Each descriptor supplies an `id`, a `slug` and the obligation
names in `collects`.

At boot, `buildDispatch()` rejects invalid obligation names, duplicate page owners
and uncovered obligations. At runtime, dispatch resolves page ownership and route
targets without importing journey controllers.

## Derived gates

[`src/server/app/flow/gates.js`](../flow/gates.js) derives the normal gate for a page
from its collected obligations and prerequisites. An authored page or section gate
is only needed for policy that cannot be expressed by those facts.

[`src/server/app/flow/prerequisites.js`](../flow/prerequisites.js) finds
strictly-earlier fields that are enforced when the user continues. It reads the
configured section list through the journey-flow seam.

## Navigation and status

[`src/server/app/flow/navigation.js`](../flow/navigation.js) finds the first
gate-passing page in a section or task row. `nextInSection()` returns the next
gate-passing page, or the hub when the section is finished.

[`src/server/app/flow/section-status.js`](../flow/section-status.js) calculates
section status from dispatch ownership. Submit readiness is the conjunction of the
configured task-row statuses: fulfilled, not applicable and optional rows are
ready.

## Opening-run state

[`src/server/app/flow/run-state.js`](../flow/run-state.js) stores whether a journey is
in its opening run through the injected session port. The journey supplies
`nextRunTarget`; shared controller helpers call it through the journey-flow seam.

For the current section order, task rows, authored review gate and opening run, see
the [live-animals journey flow guide](../sets/live-animals/docs/journey-flow-and-gates.md).
