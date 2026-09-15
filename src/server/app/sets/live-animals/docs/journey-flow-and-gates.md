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
row to a collection facet. The commodity line is split three ways — the selection
on the `commodities` row, the numbers on the `consignmentDetails` row, the
identifiers on the `animalIdentification` row — so each of the three pages over
that one collection carries a status of its own. The `commodities` row claims its
facet with `except` rather than `only`, so a new member of the collection defaults
to that row instead of falling out of all three. `conditional: true` lets the hub
hide a row that is not applicable. Every row contributes to
`readyForCheckYourAnswers`.

`applies` is the escape hatch for a row whose parts cannot express its
applicability. `rowStatus` calls it with the answers and reads Not applicable when
it answers no, whatever the parts would have rolled up to. The animal
identification row needs it: its part is the `commodityLines` collection, a
structural group in scope from the moment the notification exists, so the roll-up
never reaches Not applicable and `conditional: true` on its own would leave the row
drawn. Reach for `applies` only when a scope condition genuinely cannot carry the
rule — the transit-countries row needs no `applies`, because its answer leaves
scope on its own.

The hub's `GROUPS` array in
[`features/hub/controller.js`](../journeys/linear/features/hub/controller.js) places
task-row ids under visible headings and supplies their presentation order.

Design release 1 lets a trader start any task on the notification in any order.
The one row the hub still shows shut is Check and submit, which reads the review
section's authored gate on `readyForCheckYourAnswers` and is the only thing on
the page that ever says "Cannot start yet". Every other row is a link carrying a
real status from the moment the notification exists. A row that does not apply to
this consignment leaves the list instead (`conditional`, and `applies` where the
parts cannot express it).

That puts the cost on the pages, not the hub: a page behind a row has to render
and save sensibly when nothing else has been answered. Where there is genuinely
nothing to ask yet the page says so itself — the consignment-details page
([`consignment-details.controller.js`](../journeys/linear/features/commodities/consignment-details/consignment-details.controller.js))
redirects to the commodity question when the notification holds no line.

## Opening run and entry guard

[`run.js`](../journeys/linear/flow/run.js) owns the opening-run sequence and exports
`nextRunTarget`. [`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the
journey's redirect policy before handlers run.

The run is the whole notification, not its first leg. `RUN_STEPS` runs origin,
what you are importing, the consignment details, the reason for import, animal
identification, the additional details, the arrival details, the transit
countries, the transporter, the uploaded documents, the roles and addresses, the
CPH number, the contact address and then the review page, so the primary button —
"Save and continue" on every one of them but the review page, which ends with
"Continue" — carries a new notification from the entry page to the review page
in one pass. The hub is somewhere the user chooses
to go — through the secondary "Save and return to overview" button on every
page, or by opening the notification from the dashboard — not somewhere the run
puts them between sections. Taking that button, or otherwise landing on the
hub — including the run's own fall-through when the review gate or every
remaining step is closed — renders the hub, and rendering it completes the run
([`completeOpeningRun`](../../../flow/run-state.js), called from
[`features/hub/controller.js`](../journeys/linear/features/hub/controller.js)).
After that, saving a page follows `nextInSection` and returns to the hub at the
end of each section: the run is not re-entered for that notification. The review
step
carries the same authored gate the review flow section does, so a run that
arrives with the notification incomplete falls through to the hub; so does a run
whose remaining steps are all gated out.

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
[`config.js`](../journeys/linear/config.js) and its `sectionCaptionOf` from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js).

Adding an entry to the existing `sections` or `taskRows` arrays needs no extra L1
registration: `routes.js` already injects the whole arrays. A new feature still
needs controller and binding registration in the journey barrels.

## Section captions

[`journeys/linear/flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)
files every page under the section of the notification it belongs to, and names
those sections in its own `copy/` bundles. `kit.base()` resolves the name for the
page identity a controller passes it and puts it in the view as `caption`; the page
template imports `sectionCaption` from
[`shared/section-caption.njk`](../../../shared/section-caption.njk) and calls it
immediately above its heading. Pass the caption size that matches the heading —
`sectionCaption(caption, "govuk-caption-xl")` above a `govuk-heading-xl` — and let
nothing sit between the two: the caption carries its own bottom margin, which
collapses from the tablet breakpoint, so it only reads as a caption when it is the
element directly above the heading.

These sections are the ones a reader sees named above a heading. They are finer
than the hub's task-row groups and are not derived from them — the caption keeps
animal identification with the other consignment questions and separates arrival,
transit and adding a transporter, where the hub does not. A page left out of the
map renders no caption; its unit test lists those pages so a new page cannot be
added without a decision either way.

The generic algorithms are documented in [Flow machinery and gates](../../../docs/flow-and-gates.md).
