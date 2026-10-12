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
No row on the hub is ever shut: every row is a link carrying a real status from
the moment the notification exists, and nothing on the page says "Cannot start
yet". A row that does not apply to this consignment leaves the list instead
(`conditional`, and `applies` where the parts cannot express it).

The review is not a task row at all. Design release 1 reaches it from a primary
"Review and submit" button under the task list, beside the secondary "Return to
dashboard", and offers it whatever the notification still owes — the review page
renders an unfinished notification and names what is outstanding. The review
section's authored gate on `readyForCheckYourAnswers` still stands between that
page and submitting: the check-answers POST refuses on the same verdict.

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
create POST and its start GET (`<set>/start`, reached from the Import
Notification Service's type question) in
[`features/dashboard/controller.js`](../journeys/linear/features/dashboard/controller.js)
are the only callers of `beginOpeningRun`. Both go through one
`openNewNotification` helper. The start entry sits outside `/notifications/`,
so the entry guard never sees it. The origin page is the journey entry and an
ordinary page otherwise: it has no opening-run special case.

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

This set's gateway,
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it), imports `sections`,
`taskRows`, `rowStatus`, `nextRunTarget`, `FLOW_ONLY_KEYS` and
`entryGuardTarget`, then passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js). It also passes the
journey's `LAYOUT` from
[`config.js`](../journeys/linear/config.js) and its `sectionCaptionOf` from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js).

Adding an entry to the existing `sections` or `taskRows` arrays needs no extra L1
registration: `routes-live-animals.js` already injects the whole arrays. A new feature still
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

## Template mode

Template mode is another way of walking the journey's own pages, never a copy of
them. The set gateway registers, beside every
`/notifications/{journeyId}/<slug>` route, a twin at `/templates/{journeyId}/<slug>`
whose handler is the same handler run inside a template-mode context
([`shared/template-mode.js`](../../../shared/template-mode.js)). In that context
the records port reads the template store, `pagePath` and `hubPath` build
`/templates/...` links, and the page chrome draws the grey `Template` tag with the
template's name in place of a notification's reference. A change to a journey page
therefore reaches template mode with no template work.

[`flow/template-mode.js`](../journeys/linear/flow/template-mode.js) lists what a
template leaves out: the documents, declaration and confirmation pages, and the
amend, cancel-amend, copy and delete actions. None of them gets a twin. The opening
run also skips the review (`TEMPLATE_MODE_RUN_SKIPPED_PAGE_IDS`), so after the last
question a template falls to its own overview path rather than the review.

The overview route is twinned at `/templates/{journeyId}` and is the template's task
list: the hub's own handler, which in template mode drops every task whose pages
template mode leaves out (and any section left empty, today Documents), heads the
list "Template tasklist" and ends with "Review template" and "Return to manage
templates".

Once a template is saved, the same address is the template's page
(`features/template-page/`): the overview twin's handler is wrapped by
`withTemplatePage` through `templateModeRoutes`' `overview` option, so a template
still being created keeps the task list and a saved one shows its answers in the
review's cards. A template the user does not have opens Manage templates.

The card's and the page's "Use template" POST to `/templates/{journeyId}/use`
([`features/templates/use-template.js`](../journeys/linear/features/templates/use-template.js)).
The handler reads the user's saved template of this set, seeds a new draft through
`startJourney`'s `fulfilment` option (`notificationSeedFrom`, which leaves out
`TEMPLATE_NOT_CARRIED_OBLIGATION_IDS`), begins the opening run and opens the new
notification's own task list. Any template the user cannot use opens Manage
templates and creates nothing.

The page's Change links open a question page with the change marker. Every other twin
is wrapped by `withTemplateChange` through the `page` option, which sends a template
the user does not have to Manage templates, and runs a saved template reached from a
Change link in the saved-change context (`changingSavedTemplate()`). There the page
ends with "Save and return" and a "Cancel" link to the template's page, Back returns
there, and saving returns there with a Success banner kept in the session under the
`templateUpdated` key ([`features/template-page/updated-banner.js`](../journeys/linear/features/template-page/updated-banner.js)),
taken once. Saving moves the template's saved time on, which is its date created. A
template never holds an arrival date (`TEMPLATE_NOT_HELD_OBLIGATIONS`): the records
port drops it on write and on load.

The review route is twinned too and is the template review: the review's own handler,
which in template mode is titled "Review your template", shows no errors, leaves out
the documents section (renumbering the last two as the task list does) and the arrival
date, goes Back to the task list, and ends with "Save template". That button's POST
moves the template to saved (`templates.saveFor`) and opens Manage templates instead
of the declaration. Its Change links open each page under the template with the
change marker, so saving that page returns to the template review.

Save template also stores `{ name }` in the session (the `templateSaved` key,
[`features/templates/saved-banner.js`](../journeys/linear/features/templates/saved-banner.js)).
Manage templates reads and clears it, so the Success banner shows once and a reload
loses it. A blank name reads "Untitled template" wherever a saved template is titled
(the banner and its card). The list is ordered by when each template was last saved,
newest first, not by when it was started.

A template-mode page links to the template's task list, so its Save and return and
Cancel controls return there. Pages that already hide the return controls (Origin, CPH number and the transporter sub-pages) still end with Save and continue alone. "What
are you importing?" goes Back to Origin, and its Save and continue returns to the
task list.
