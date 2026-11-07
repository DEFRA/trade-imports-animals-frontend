# Live-animals journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/live-animals/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports eight ordered `sections`. A flow
section is a navigation sequence and an Overview group, and the sections together are the journey's page order. The `review` section has the one authored section
gate: it requires `scope.readyForCheckYourAnswers`. Normal page gates are derived
from `meta.collects`, scope and earlier continue prerequisites.

The `consignment-parties` section holds the CPH number page and then Roles and addresses, so
the CPH page, a sub-page marked `subPage: true` on its page identity, goes on to Roles and addresses and
Roles and addresses goes on to the contact address.

`FLOW_ONLY_KEYS` contains `declaration` and `commoditySearchRows`. Both are kept in
the session's flow-only store rather than canonical obligation fulfilment, and are
never sent to the backend.

The transport section lists one transporter step, the transporter list. The pages
that add a transporter are detours off that list and belong to no section.

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

The hub derives its groups from the flow sections: each section that holds a task
row's first page is a group, headed by its caption, and lists its task rows in the
order of their first page. The sections are also the journey's page order, which
Save and continue follows from every start.

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
page and submitting: the declaration refuses on the same verdict.

The declaration is reachable only from the review. The review's
Continue posts to `/declaration` with `step=review` - the review registers no
`POST` of its own, and `GET /declaration` redirects to the review. This is to
ensure that the user has seen the review in its latest state before submitting
the notification.

We use the concurrency token to ensure that the notification is unchanged since
the user saw the review page. The declaration page renders the same concurrency
token as the review page (RT), rather than the current concurrency token. The
declaration submit (`step=declare`) only works if the current concurrency token
is still the same as RT, meaning that the notification is unchanged. If the
notification changed after the review rendered — another tab, another user — the
token no longer matches and the trader goes back to the review with the
"notification has been updated" banner (`?staleAction=1`).

The review's GET also records the token in the session
(`check-answers/reviewed.js`), and both declaration steps require the posted
token to match it, so a token copied off another page cannot reach the
declaration without the review. A refused Continue or Submit goes back with
`?refused=1`, which moves focus to the review's error summary; the review names
every refusal itself, still-scanning documents included.

That puts the cost on the pages, not the hub: a page behind a row has to render
and save sensibly when nothing else has been answered. Where there is genuinely
nothing to ask yet the page says so itself — the consignment-details page
([`consignment-details.controller.js`](../journeys/linear/features/commodities/consignment-details/consignment-details.controller.js))
redirects to the commodity question when the notification holds no line, and
the transit countries page
([`transit-countries.controller.js`](../journeys/linear/features/transport/transit-countries/transit-countries.controller.js))
sends a load or any submit to the overview, saving nothing, when the means of
transport leaves transit countries out of scope.

## Opening run and entry guard

[`run.js`](../journeys/linear/flow/run.js) owns the opening-run sequence and exports
`previousRunTarget`. [`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the
journey's redirect policy before handlers run.

`RUN_STEPS` lists the steps the Back link follows during the run: origin, what
you are importing, the reason for import, the commodity details, animal
identification, the additional details, the arrival details, the transit
countries, the transporter, the uploaded documents, roles and addresses, the
contact address and then the review page. The CPH number page is not a step: it
opens from the CPH section's add link on Roles and addresses and saves back to it.
What are you importing? is likewise a detour, not a step, when Commodity details or Identification details opens it:
it saves back to the page that opened it, carrying any change context, and its Back opens that page.
Save and return to overview still goes to the overview. A return value that names neither page is refused, logged and ignored, so the next page that applies follows.

Three pieces of the sequence carry reasons that are easy to lose. Fish is on none
of the identifier allowlists, so animal identification has nothing to ask of a
consignment of fish; the identification page's no-identifiers guard sends that
request on to the additional details rather than to the hub, so the run carries
on. The transporter leg is one step, the list: the add spokes behind it are not
steps, and each hands the run back at the list's step when it saves. A spoke that
continued from itself would find no step and drop the trader on the hub.

During the run, a step's Back link opens the previous step rather than the
overview, and following it does not end the run: a later Save and continue goes
on to the next step. Each `RUN_STEPS` entry names the earlier steps its Back link
may open, nearest first, and `previousRunTarget` returns the first whose gate
passes, so a skipped step is skipped going back too. On a draft notification, a
page opened from a Change link on the review has the same Back link, carrying
change context, which carries Back; its save goes on to the next page that applies. While the
notification is being amended, every page keeps its usual Back link.
`kit.runBackLink()` falls back to the overview when neither the run nor a draft
Change link applies, or no named earlier step applies. A
page that has declared, through the helper's `returnsToReview` option, that it
returns to the review is answered with the review instead when the request
carries change context or the notification is being amended; every other page
is unaffected.

| Step                    | Back opens                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- |
| What are you importing? | Origin, or Commodity details or Identification details when one of them opened it     |
| Reason for import       | What are you importing?                                                               |
| Commodity details       | What are you importing?, not the reason between them                                  |
| Additional details      | Animal identification when a chosen species needs identifiers, else Commodity details |
| Transit countries       | Arrival details                                                                       |

Animal identification, arrival details, the transporter, roles and addresses
and the contact address keep their Back link on the overview, from a review
Change link as well. Origin keeps the Back link it has without the Change link:
it goes back to the Import Notification Service's type question, for this
notification, while the opening run is active and began at the start entry; to
the dashboard while it is active and began at the list's create; otherwise to
the overview when the overview would admit the request (see
[the entry guard](#opening-run-and-entry-guard)), else to the dashboard. The
identification condition is `identifiesAnAnimal`, the rule that also decides
whether the identification task row applies.

The documents page's Back link opens the review while the notification is
being amended, or when the page was opened by changing the uploaded documents
from the review; it opens the overview otherwise.

The review page's Back link follows the notification's status instead. A
submitted notification, including the one shown after an amendment is cancelled,
goes back to the notification list; a draft's review and an amendment in
progress go back to the overview.

The hub is somewhere the user chooses to go — through the secondary "Save and
return to overview" button on the pages that offer it
([How a page ends](page-design.md#how-a-page-ends)), or by opening the
notification from the dashboard — not somewhere the run puts them between
sections. Rendering the hub, or the review page, completes the run
([`completeOpeningRun`](../../../flow/run-state.js), called from
[`features/hub/controller.js`](../journeys/linear/features/hub/controller.js) and
[`features/check-answers/controller.js`](../journeys/linear/features/check-answers/controller.js)).
Save and continue goes to the next page that applies in the journey's order
from every start (a new notification,
an Overview task, a reopened draft, a copy, a Change link or an amendment), and
past the last page that applies it goes to the review page. The CPH number page
is a sub-page: it goes on from the page that opens it to Roles and addresses.
Nothing marks a page as opened from the hub.

The opening run begins when the notification is created. The dashboard's
create POST and the start entry (`<set>/start`, which the Import Notification
Service's type question opens) both create it, through one helper in
[`features/dashboard/controller.js`](../journeys/linear/features/dashboard/controller.js)
that calls `beginOpeningRun` and records which of the two entries began the
run. The start entry sits outside `/notifications/`, so
the entry guard never sees it. The origin page is the journey entry.
Its Back link reads the opening-run record (see the Back link rules above), and
its save goes on through `kit.nextTarget` like any other page.

The guard admits a request when the journey carries an answer the user entered.
System-populated obligations and flow-only keys such as `declaration` never count
as user answers. A journey with none — a deep link to an id this session never
created, or a draft with nothing saved — is sent to the origin page, and a request
for Overview, the review, the declaration or the confirmation page is sent there
too. Each redirect is logged once with the journey id and the requested path. The
origin page and its children, and the amend, cancel-amend, copy and delete
actions, are exempt from the guard, so there is no redirect loop. The guard
admits a request only when the journey carries an answer the user entered.

A journey the guard bounces to the origin page goes on from that page to What are
you importing? like any other start. Overview's link is the dashboard until an
answer is entered, for Back and Cancel alike (`leaveJourneyLink` in `entry-guard.js`).

## Registration wiring

This set's gateway,
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it), imports `sections`,
`taskRows`, `rowStatus`, `previousRunTarget`, `FLOW_ONLY_KEYS` and
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

The caption names where a page sits in the notification, not the page's own
copy, so one string serves every page in a section. The map has one entry per
section, listing its pages, and never a string per page.

The commodity details page (the Selected commodities table and quantities) is
filed under its own section, "Description of the goods"; the section captioned
"Commodity details" (id additionalDetails) holds the additional details page.

Some pages carry no caption on purpose:

- The overview, check your answers, contact address, declaration and
  confirmation pages open straight into their heading.
- Delete notification and cancel amend are interruptions, not steps in a
  section.
- The address pickers get their caption from the addresses feature.

The generic algorithms are documented in [Flow machinery and gates](../../../docs/flow-and-gates.md).
