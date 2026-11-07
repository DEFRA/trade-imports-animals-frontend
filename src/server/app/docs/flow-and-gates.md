# Flow machinery and gates

The platform owns the algorithms in `src/server/app/flow/`. A journey owns the page
order and task-row policy that those algorithms consume.

## Journey-flow configuration

[`src/server/app/flow/journey-flow.js`](../flow/journey-flow.js) is the injection
seam. `configureJourneyFlow()` receives:

- `sections`
- `taskRows`
- `rowStatus`
- `insTypeQuestionUrl`
- `flowOnlyKeys`
- `entryGuardTarget`
- `layout`
- `sectionCaption`

The exported accessors fail when callable policy has not been configured. L1 calls
this seam once during route registration.

`sectionCaption` is chrome rather than topology: it maps a page id to the name of
the section of the journey that page belongs to, which `kit.base()` puts in the
view as `caption` and `shared/section-caption.njk` renders above the page heading.
A journey that names no sections leaves it out and its pages render no caption.

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

[`src/server/app/flow/navigation.js`](../flow/navigation.js) owns the journey's
page order and the next page after one. The order is the set's flow sections
read in order. A step is a page that belongs to a task row and is not marked as
a sub-page; a sub-page keeps its section's status and prerequisites but is
reached only from the page that opens it. `nextStepPath()` answers the next
step after a page whose scope rule passes (`pageAppliesTo()` in
[`gates.js`](../flow/gates.js): the page's own gate, else some obligation it
collects in scope), or nothing past the last step, and throws for a page in no
section. `kit.nextTarget` uses it after the explicit exits and falls back to
the review page when it answers nothing. `taskRowsOfSection()` lists a
section's task rows in the order of their first page, which is how the hub
derives its groups.

`rowEntry()` always answers with a page. A task row is a way into the
notification rather than a step of a sequence, and a journey is worked in
whatever order its user chooses, so a row opens at the first page whose gate
passes, else its first page. That page decides for itself what to show someone
who has answered nothing else — the live-animals
[`consignmentDetails` page](../sets/live-animals/journeys/linear/features/commodities/page.js)
sends a user to the commodity question when the notification holds no commodity
line.

A conditional row (`conditional: true` in the set's task rows) is different:
the hub leaves it out while it does not apply or while none of its pages passes
its gate, so Overview never links to a page the flow would turn away. The
live-animals transit countries row stays off Overview until rail or road is
saved and a country of origin and a commodity are answered, matching the
transit countries page's own redirect.

[`src/server/app/flow/section-status.js`](../flow/section-status.js) calculates
section status from dispatch ownership. Submit readiness is the conjunction of the
configured task-row statuses: fulfilled, not applicable and optional rows are
ready.

## Opening-run state

[`src/server/app/flow/run-state.js`](../flow/run-state.js) stores whether a journey is
in its opening run, through the injected session port.

## Where Back goes: the trail

Back on a journey page goes to the place the trader came from. Where they came from
travels on the page's links and on its form posts, never in the session, so it
survives a refresh, a refused save, a round trip through a sub-page and a new browser
session.

The place is one query parameter, the trail: an ordered list of places, newest last. A
place is a start place (Overview, the dashboard, the Import Notification Service's
type question) or the slug of a page in the journey's `sections`. Every journey form
posts to its own address, so a POST sees the same trail as the GET that showed it.

[`kit.js`](../shared/kit.js) owns three operations on the trail:

- `carryTrail(request, href)` puts the request's trail on a link that brings the trader
  back to the same place, such as a sub-page round trip or a page's own redirect.
- `pushTrail(request, href, entry)` puts the request's trail and one more place on a
  link that moves the trader on. `nextTarget()` pushes the page it is given, so Save
  and continue lands on the next page with the page saved on top of the trail. A
  trail past 40 places loses its oldest.
- `trailBackLink(request, { fallback })` answers the newest place on the trail,
  carrying the places beneath it. With no trail, or a trail that names a place the
  journey does not have, it answers the fallback, the overview by default, and for a
  trail that is not recognised it logs once at info.

The Import Notification Service's type question is set knowledge, so the journey
supplies it through the `insTypeQuestionUrl` seam. The Back href is always built
from a recognised slug or start place, never echoed from the request.

A sub-page that returns to the page that opened it keeps that page as its Back and
its save target, carrying the trail. A page that redirects onward without showing
itself carries the trail, so Back on the page it lands on skips it.

For the current section order, task rows, authored review gate and the entry guard, see
the [live-animals journey flow guide](../sets/live-animals/docs/journey-flow-and-gates.md).
