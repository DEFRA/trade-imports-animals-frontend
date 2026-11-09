# Live-animals journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/live-animals/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports eight ordered `sections`. A flow
section is an Overview group, and the sections together are the journey's one page
order: the order Overview lists its tasks in. Save and continue goes to the next page
in that order that applies, and from the last page that applies to check your
answers, however the page was reached (a new notification, a copy, the Overview, a
reopened draft, a new browser session, a check your answers Change link or an
amendment). When the next page that applies needs a required earlier answer that is
missing, Save and continue goes to the page that asks for it instead. This journey's
required earlier answers are where the consignment is coming from and what is being
imported. The `review` section has the one authored section
gate: it requires `scope.readyForCheckYourAnswers`. Normal page gates are derived
from `meta.collects`, scope and the required earlier answers.

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
task row groups pages on Overview and is a submit-readiness unit; it is not a flow
section, and it decides nothing about where Save and continue goes.

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
Save and continue follows from every start. The session holds no record of how a
notification was started.

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

## Entry guard and the Back link

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the journey's redirect
policy before handlers run and the Import Notification Service's type question
(`insTypeQuestionUrl`), which the gateway passes to `configureJourneyFlow()`.

Back on every journey page goes to the place the trader came from. The place travels
on the page's links and form posts as the trail (see
[Where Back goes](../../../docs/flow-and-gates.md#where-back-goes-the-trail)):

| The trader came from                  | Back opens                                           |
| ------------------------------------- | ---------------------------------------------------- |
| Save and continue on another page     | That page, carrying the places beneath it            |
| An Overview task row or review button | Overview                                             |
| A review Change link or error link    | The review                                           |
| A dashboard card (View or Amend)      | The dashboard                                        |
| Start a new notification              | The dashboard, from the first page                   |
| The Import Notification Service       | Its type question for this notification, first page  |
| Nothing the journey knows             | Overview (the first page: see the entry guard below) |

Following a Back link does not end anything: a later Save and continue goes on to the
next page that applies, adding the page saved to the trail, so Back steps through the
visited pages in reverse. Save and return to overview still goes to the overview.
Back is the same on a draft and while amending, and a page names no fixed Back target
and no list of earlier pages its Back may open.

A check your answers Change link or error-summary link carries where check your
answers' own Back link went, so Back from the page it opens returns to check your
answers with that Back link unchanged.

A round trip to a sub-page keeps where the trader came from, so the page that opened
it still goes Back where it did before: the CPH number page, the permanent address
page, add transporter and a picker's View link each carry the trail out and back.

Pages that redirect onward without showing themselves carry the trail rather than push
onto it. The identification page's no-identifiers guard sends the request on to the
additional details carrying the trail, so Back on the additional details opens Commodity
details when nothing was identified. What are you importing? opened by Commodity details
or Identification details saves back to the page that opened it, carrying the trail, and
its Back opens that page. The CPH number page opened from the CPH section's add link
saves back to Roles and addresses and goes Back there; opened from a review Change link
its Back is the review and its Save and continue goes to Roles and addresses. A return
value that is not one of the pages allowed to open this sub-page is refused, logged and ignored.

A trail that names a place the journey does not have is ignored and logged once, and
the page goes Back to its fallback. The fallback is the overview, except on the first
page (the dashboard until an answer is entered, then the overview: `leaveJourneyLink` in
`entry-guard.js`) and on the review (the overview on a draft or an amendment, the
dashboard on a submitted notification, including the one shown after an amendment is
cancelled).

Returning from the Import Notification Service's address book lands on a fixed address
that carries no trail. Roles and addresses (the Overview task "Roles and addresses",
Consignment addresses) and Contact address for consignment (the task "Contact address
for this consignment") are the only pages whose Back goes to the Overview whatever the
trail, after that return; Save and continue still goes on from them.

The hub is somewhere the user chooses to go: through the secondary "Save and
return to overview" button on the pages that offer it
([How a page ends](page-design.md#how-a-page-ends)), from Overview's address, from an
Overview task, or by opening the notification from the dashboard. Save and continue
goes to the next page that applies in the journey's one page order from every start
(a new notification, an Overview task, a reopened draft, a copy, a Change link, an
amendment or a new browser session), and past the last page that applies it goes to
the review page. The CPH number page is a sub-page: it goes on from the page that
opens it to Roles and addresses.

A notification is created by the dashboard's create POST or by the start entry
(`<set>/start`, which the Import Notification Service's type question opens), through one
helper in
[`features/dashboard/controller.js`](../journeys/linear/features/dashboard/controller.js)
that redirects to the origin page with the dashboard or the Import Notification Service
as the first place on the trail. The start entry sits outside `/notifications/`, so the
entry guard never sees it. The origin page is the journey entry.

The guard admits a request when the journey carries an answer the user entered.
System-populated obligations and flow-only keys such as `declaration` never count
as user answers. A journey with none (a deep link to an id this session never
created, or a draft with nothing saved) is sent to the origin page, and a request
for Overview, the review, the declaration or the confirmation page is sent there
too. Each redirect is logged once with the journey id and the requested path. The
origin page and its children, and the amend, cancel-amend, copy and delete
actions, are exempt from the guard, so there is no redirect loop.

A journey the guard bounces to the origin page carries no trail, so the origin page's
Back is the dashboard until an answer is entered. The guard sends the request on to
What are you importing? like any other start.

## Back on check your answers

Check your answers' Back link goes to where the trader came from, on a draft, an
amendment and a submitted notification alike:

- the last journey page, when check your answers was reached by Save and continue
  from it
- the Overview, when it was opened from the Overview
- the dashboard, when it was opened from the dashboard

Coming back by Back from a page a check your answers Change link or error-summary link
opened, Back goes where it went before. After an amendment is cancelled, Back goes to
the dashboard.

Check your answers reached any other way goes Back to the Overview on a draft or an
amendment and to the dashboard on a submitted notification. The other ways are: from
the declaration, including a refusal that comes back through it; from the confirmation
page; by a typed address; in a new browser session; or by a link whose marker is
missing or not allowed.

The review's Continue and the declaration are described under
[Task rows](#task-rows). The confirmation page has a link to the dashboard and a
button that posts to the create path, which starts a new notification.

## Registration wiring

This set's gateway,
[`src/server/app/routes-live-animals.js`](../../../routes-live-animals.js) (the
[`routes.js`](../../../routes.js) barrel only re-exports it), imports `sections`,
`taskRows`, `rowStatus`, `insTypeQuestionUrl`, `FLOW_ONLY_KEYS` and
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
