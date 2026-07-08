# How to add a new page

A page in this spike is a vertical slice plus three registrations. You create
four files in a new feature folder, register them in three places, then author
the two presentation surfaces the paradigm never generates for you: the
check-your-answers rows and the hub task row.

This guide uses a worked example that was validated live on the real code: a
`vehicle-security` page asking where the vehicle is kept overnight
(`parkingLocation`, a required radio) and whether a tracker is fitted
(`hasTracker`, optional). Every step names an existing feature to copy —
[`features/import-reason/`](../features/import-reason/) is the smallest slice
and [`features/origin/`](../features/origin/) shows the full
validation pattern.

## What you get for free

Once the slice is registered, the paradigm derives the rest:

- **Routing** — the controller exports its own routes via `kit.pageRoutes`;
  adding them to `allRoutes` registers the GET/POST pair. There is no central
  route table to edit.
- **Navigation** — `sectionEntry` and `nextInSection`
  ([`flow/navigation.js`](../flow/navigation.js)) walk the `sections` array. A
  one-page section returns to the hub on save with no wiring.
- **Status roll-up** — `sectionStatus`
  ([`flow/section-status.js`](../flow/section-status.js)) computes the
  section's tag from the obligations its pages collect. A required obligation
  drives Not started → In progress → Completed on its own.
- **Quote gating** — `readyForQuote` requires every non-quote section to be
  Fulfilled or Not applicable, so a new section counts automatically. The
  check-your-answers POST re-checks readiness server-side.
- **Scope-exit wipe** — if the page's obligations ever leave scope, `reconcile`
  destroys their data. You never write wipe logic. See
  [scope-and-wipe.md](scope-and-wipe.md).

What is not free: the template, the validation schema, the
check-your-answers rows and the hub row. You author all four by hand.

## You do not author a gate

A page or section with no `gate` is reachable exactly when some obligation it
collects is in scope. The gate derives from your `collects` declaration, so
"gate passes" and "section status is not Not applicable" agree by
construction. An authored `gate` exists only as an override for flow-level
facts the model cannot express — the only one in the journey is
`get-your-quote`'s readiness check. Do not add one for a normal page. See
[flow-and-gates.md](flow-and-gates.md).

## The steps

### 1. Create the page identity leaf

Create `features/vehicle-security/page.js`, copying
[`features/import-reason/page.js`](../features/import-reason/page.js):

```js
export const vehicleSecurityPage = {
  id: 'vehicle-security',
  slug: 'vehicle-security'
}
```

The leaf must import nothing. Both the controller and `flow/flow.js` import
this same object, so the page identity is a shared reference, not a string
typed twice. If the leaf (or `flow.js`) imported a controller, the load-time
cycle flow → controller → engine → status → flow would leave `sections`
reading `undefined` at boot.

### 2. Declare the obligations

Create `features/vehicle-security/obligations.js`, copying
[`features/import-reason/obligations.js`](../features/import-reason/obligations.js):

```js
export const parkingLocation = { id: 'parkingLocation', required: true }
export const hasTracker = { id: 'hasTracker' }
export const obligations = [parkingLocation, hasTracker]
```

Obligations are pure data: identity, relationships and structural facts only —
never copy, a type or a validator. A boot guard enforces this per file.
`required` means "owed for completion" (it feeds the status roll-up); it does
not block saving. Save-blocking is a controller-owned validator. See
[obligation-model.md](obligation-model.md).

### 3. Write the controller

Create `features/vehicle-security/controller.js`, copying
[`features/origin/controller.js`](../features/origin/controller.js).
The fixed shape:

```js
export const meta = { ...page, collects: kit.collectsFrom(obligations) }

const fields = compose(
  oneOf('parkingLocation', ['garage', 'driveway', 'street'])
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    /* ... */
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    /* prefill from answers */
  })
}

const post = (request, h) => {
  const { value: clean, errors } = validate(fields, request.payload ?? {})
  if (errors) return render(h, rawValues, errors)
  const { scope } = state.commit(request, h, {
    /* clean values */
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
```

`meta.collects` is the page's ownership declaration — it feeds the boot-built
dispatch index, the status roll-up and the derived gate. `kit.collectsFrom`
takes the feature's whole non-system obligation set; author an explicit subset
only when a feature splits its obligations across pages (see
[`features/transport/`](../features/transport/)). Validation lives
here, not in the model — see [validation.md](validation.md).

### 4. Write the template

Create `features/vehicle-security/template.njk`, copying
[`features/import-reason/template.njk`](../features/import-reason/template.njk). Extend the
shared layout, include the shared error summary, and use govuk macros. View
names resolve from the prototypes Nunjucks root, so the controller references
it as `standalone/live-animals/features/vehicle-security/template`.

### 5. Register the obligations in the registry

In [`registry.js`](../registry.js), add the sideways import and spread the
slice into the `all` array, keeping flow order:

```js
import * as vehicleSecurity from './features/vehicle-security/obligations.js'
// then, in `all`:
...vehicleSecurity.obligations,
```

### 6. Register the page in the feature index

In [`features/index.js`](../features/index.js), import the controller, add
`vehicleSecurity.meta` to `dispatchPages` and spread
`...vehicleSecurity.routes` into `allRoutes`. `dispatchPages` is what the boot
coverage assertion reads — see "How the wiring is guarded" below.

### 7. Add the section to the flow

In [`flow/flow.js`](../flow/flow.js), import the page leaf from step 1 and add
a section in the order you want it to appear:

```js
import { vehicleSecurityPage } from '../features/vehicle-security/page.js'
// then, in `sections`:
{
  id: 'vehicle-security',
  pages: [vehicleSecurityPage]
}
```

Always import the leaf — never inline a `{ id, slug }` literal here. No
`gate`: an always-live section derives to reachable from its collects. (The
`dynamic: true` marker on the remaining car sections is a leftover of the
vendored add-on shape — it goes with those sections; do not use it for a
live-animals section.)

### 8. Add the check-your-answers rows

In [`features/check-answers/controller.js`](../features/check-answers/controller.js),
add a `row(...)` line per obligation to `buildRows`, with a label lookup where
the stored value is a code (copy the `COVER_LABEL` pattern):

```js
row('Overnight parking', PARKING_LABEL[answerOf('parkingLocation')] ?? '', 'parkingLocation'),
row('Tracking device', answerOf('hasTracker') === 'yes' ? 'Yes' : 'No', 'hasTracker'),
```

The third argument is the obligation id — the Change link derives its target
from the dispatch index (`pageOfObligation`), so you never hardcode the slug.

### 9. Add the hub row

In [`features/hub/controller.js`](../features/hub/controller.js), add an entry
to the `GROUP_ROWS` literal:

```js
{ id: 'vehicle-security', title: 'Vehicle security', hint: 'Where the vehicle is kept, tracker' }
```

The id must match the section id from step 7. `sectionStatus` supplies the
row's tag and `sectionEntry` its href; the progress line counts over
`GROUP_ROWS.length`, so it updates itself.

### 10. Add a contract case

In [`contract.test.js`](../contract.test.js), add a case to the `cases` array
with a valid payload filling every field. It asserts the POST handler commits
exactly what `meta.collects` declares — the one binding the boot assertion
cannot see.

## How the wiring is guarded

The boot coverage assertion is the primary wiring guard. `buildDispatch`
([`flow/dispatch.js`](../flow/dispatch.js)) asserts every non-system
obligation is collected by exactly one page. Until your `meta` is in
`dispatchPages` (step 6), `parkingLocation` and `hasTracker` are "collected by
no page": the server refuses to boot, and because almost every test file runs
`buildDispatch(dispatchPages)` in its `beforeAll`, the whole unit suite fails
loudly. A forgotten or duplicated registration is a startup failure, never a
silent runtime break.

## The blast radius of a required field

This gotcha was validated live. A **required** obligation in an
**always-live** section is a new in-scope gap, so `readyForQuote` turns false
until it is answered. That fails every ready-to-quote fixture in the suite,
not just your page's own tests — building the worked example turned four test
files red at once ([`item-conditional.test.js`](../item-conditional.test.js),
[`indexed.test.js`](../indexed.test.js),
[`flow/dispatch.test.js`](../flow/dispatch.test.js) and
[`analysis/simulate.test.js`](../analysis/simulate.test.js)). Each was fixed
by adding `parkingLocation: 'garage'` to its ready fixture.

An **optional** field has none of this reach — it never gates the quote. Reach
for `required: true` only when the journey genuinely cannot complete without
the answer, and budget for the fixture sweep when you do.

## The shared happy-path E2E

The shared spec
([`prototypes/e2e/task-list-with-linear-tasks.spec.js`](../../../e2e/task-list-with-linear-tasks.spec.js))
walks every prototype journey by clicking named task links and asserting
headings. It never asserts the task count or list, so an extra hub task is
invisible to it — with one exception. A required new field blocks
`readyForQuote`, so the quote row stays "Cannot start yet" and the spec's
`Get your quote` link never appears.

If that happens, extend the walk journey-conditionally for the
`live-animals` journey only (copy how `walkNamedDriver` in
[`prototypes/e2e/journey.js`](../../../e2e/journey.js) branches per journey):
click the new task and complete it before `Get your quote`. The other journeys
stay untouched.

## Check your work

From the frontend repo root:

```
npm run test:live-animals
npm run test:prototype
```

Both suites must be green, including your new contract case. If the unit suite
fails wholesale with "collected by no page", revisit step 6. If only
ready-to-quote fixtures fail, you added a required field — see the blast
radius section above.
