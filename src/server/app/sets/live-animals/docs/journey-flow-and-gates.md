# Live-animals journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/live-animals/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports ten ordered `sections`. A flow
section is a navigation sequence. The `review` section has the one authored section
gate: it requires `scope.readyForCheckYourAnswers`. Normal page gates are derived
from `meta.collects`, scope and earlier continue prerequisites.

`FLOW_ONLY_KEYS` contains `declaration`. That value uses the session's flow-only
store rather than canonical obligation fulfilment.

## Task rows

[`task-rows.js`](../journeys/linear/flow/task-rows.js) exports twelve `taskRows`. A
task row is a hub item and a submit-readiness unit; it is not a flow section.

Most row status comes from the union of each page's `collects`. `parts` narrows a
row to a collection facet. `conditional: true` lets the hub hide a row that is not
applicable. Every row contributes to `readyForCheckYourAnswers`.

The hub's `GROUPS` array in
[`features/hub/controller.js`](../journeys/linear/features/hub/controller.js) places
task-row ids under visible headings and supplies their presentation order.

## Opening run and entry guard

[`run.js`](../journeys/linear/flow/run.js) owns the opening-run sequence and exports
`nextRunTarget`. [`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the
journey's redirect policy before handlers run.

The opening run begins when the notification is created — the dashboard's
create POST in
[`features/dashboard/controller.js`](../journeys/linear/features/dashboard/controller.js)
is the only caller of `beginOpeningRun`. The origin page is the journey entry
and an ordinary page otherwise: it has no opening-run special case.

The guard admits a request when the opening run has begun for that journey in
this session, or the journey carries committed user answers. A journey with
neither — a deep link to an id this session never created and that holds no
answers — is sent to the origin page. The origin page and its children are
exempt from the guard, so there is no redirect loop.

A journey the guard bounces to the origin page does not resume the opening run
when it saves that page. `kit.nextTarget` finds `inOpeningRun` false, so
`runTarget` is null, and the origin section holds only the origin page — the
user continues to the hub rather than into `RUN_STEPS`. That is the accepted
rule for a returning user without run state: they land on the task list and work
from there. Only a notification created in this session sequences through
`RUN_STEPS`.

## Registration wiring

[`src/server/app/routes.js`](../../../routes.js) imports `sections`, `taskRows`,
`rowStatus`, `nextRunTarget`, `FLOW_ONLY_KEYS` and `entryGuardTarget`, then passes
them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js). It also passes the
journey's `LAYOUT` from
[`config.js`](../journeys/linear/config.js).

Adding an entry to the existing `sections` or `taskRows` arrays needs no extra L1
registration: `routes.js` already injects the whole arrays. A new feature still
needs controller and binding registration in the journey barrels.

The generic algorithms are documented in [Flow machinery and gates](../../../docs/flow-and-gates.md).
