# How to add a new page

A page is a vertical slice plus a handful of registrations. You create three
files in a new feature folder, register them in three places, then author the
two presentation surfaces the model never generates for you: the
check-your-answers rows and the hub task row.

The data fields a page presents are **obligations**. Obligations live in one
central manifest, [`model/obligations/obligations.js`](../model/obligations/obligations.js) —
never in a feature folder. A page does not own its fields; it presents
obligations that already exist in the model and declares which ones it
collects. If your page presents a genuinely new data field, add the obligation
to the manifest first — see [add-a-field.md](add-a-field.md) — then follow this
guide to give it a page.

This guide uses a worked example: an `import-reason` page asking why the
animals are being imported (`reasonForImport`, a required radio). The smallest
slices to copy are [`features/import-reason/`](../features/import-reason/) (one
field, one radio) and [`features/origin/`](../features/origin/) (the full
validation pattern with several fields).

## What you get for free

Once the slice is registered, the model derives the rest:

- **Routing** — the controller exports its own routes via `kit.pageRoutes`;
  spreading them into `allRoutes` registers the GET/POST pair. There is no
  central route table to edit.
- **Navigation** — `nextInSection` and `sectionEntry`
  ([`flow/navigation.js`](../flow/navigation.js)) walk the `sections` array. A
  one-page section returns to the hub on save with no wiring.
- **Status roll-up** — task and section status come from `statusOf`
  ([`bridge/status.js`](../bridge/status.js)), driven by the
  obligations your page collects. A mandatory obligation moves the tag Not
  started → In progress → Completed on its own.
- **Submit gating** — `readyForCheckYourAnswers`
  ([`flow/section-status.js`](../flow/section-status.js)) requires every answer
  section to be Fulfilled, Not applicable or Optional, so a new section counts
  automatically (the `review` section is excluded). The declaration POST
  re-checks readiness server-side before it will finalise.
- **Scope-exit wipe** — if an obligation your page collects leaves scope, the
  evaluator purges its stored value and the write path applies that purge
  through the bridge. You never write wipe logic. See
  [scope-and-wipe.md](scope-and-wipe.md).

What is not free: the template, the validation schema, the check-your-answers
rows and the hub row. You author those by hand.

## You do not author a gate

A page or section with no `gate` is reachable exactly when some obligation it
collects is in scope. The gate derives from your `collects` declaration, so
"gate passes" and "status is not Not applicable" agree by construction. The
only authored gate in the journey is the `review` section's
`(scope) => scope.readyForCheckYourAnswers` in
[`flow/flow.js`](../flow/flow.js), which holds the check-and-submit surface
shut until every task is done. Do not add a gate for a normal page. See
[flow-and-gates.md](flow-and-gates.md).

## The steps

### 1. Create the page identity leaf

Create `features/import-reason/page.js`:

```js
export const importReasonPage = { id: 'import-reason', slug: 'import-reason' }
```

The leaf imports nothing. Both the controller and
[`flow/flow.js`](../flow/flow.js) import this same object, so the page identity
is a shared reference, not a string typed twice. If the leaf (or `flow.js`)
imported a controller, the load-time cycle flow → controller → engine → status
→ flow would leave `sections` reading `undefined` at boot.

### 2. Write the controller

Create `features/import-reason/controller.js`, copying
[`features/origin/controller.js`](../features/origin/controller.js) for the
full validation pattern. The fixed shape:

```js
export const meta = { ...page, collects: ['reasonForImport'] }
const view = `${TEMPLATES}/features/import-reason/template`

const fields = compose(
  oneOf(
    'reasonForImport',
    importReasonPurpose.reasons().map((o) => o.value)
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Reason for import', { backLink: hubPath(), journey }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
    /* option lists from services, prefilled from values */
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { reasonForImport: answers.reasonForImport ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { reasonForImport: payload.reasonForImport ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }
  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
```

Key points:

- **`meta.collects` is an explicit array of obligation names.** Those names
  are the `name` of obligations in the manifest. `collects` is the page's
  ownership declaration — it feeds the boot-built dispatch index, the status
  roll-up and the derived gate. List every obligation this page is responsible
  for and no other; `buildDispatch` fails the boot if a name is collected by
  two pages, or if a non-system obligation is collected by none.
- **Handlers are async.** `state.get(request, h)` resolves to
  `{ journey, answers, scope }`; `state.commit(request, h, values)` resolves to
  `{ scope }`. Both live in [`engine/index.js`](../engine/index.js), imported
  as `state`. The per-request read is memoised, so the error-path `state.get`
  costs no second load.
- **Validation lives in the controller**, via
  [`lib/validate/`](../lib/validate/) (`compose`, `oneOf`, `requiredOneOf`,
  `maxText`, `pattern`, …). `validate(fields, payload)` returns
  `{ value, errors }`; on `errors` you re-render with the raw submitted values.
  The controller owns value legality such as enum membership and formats — see
  [validation.md](validation.md).
- **Pass `journey` into `kit.base`** so the shared layout renders the
  reference/status strip.
- **Redirect via `kit.nextTarget`.** It resolves the three save exits (primary
  save, save-and-return, cancel) and change-context returns, so a controller
  that redirects through it needs nothing extra. A bespoke success redirect
  must consult `kit.hubExitTarget(request)` first.

A feature that spreads its obligations across several pages holds several
controller/template pairs, each with its own narrower `collects` — see
[`features/transport/`](../features/transport/).

### 3. Write the template

Create `features/import-reason/template.njk`, copying
[`features/import-reason/template.njk`](../features/import-reason/template.njk).
Extend the shared layout, include the shared error summary, and use govuk
macros. View names resolve from the prototypes Nunjucks root, so the controller
references it as
`standalone/live-animals/features/import-reason/template`.

End the form with the shared `saveActions` macro
([`shared/save-actions.njk`](../shared/save-actions.njk)), passing the `hubHref`
that `kit.base` puts in the view model — every task page carries the design's
three exits.

### 4. Register the page in the feature index

In [`features/index.js`](../features/index.js), import the controller, add
`importReason.meta` to `dispatchPages` and spread `...importReason.routes` into
`allRoutes`. `dispatchPages` is what the boot coverage assertion reads — see
"How the wiring is guarded" below.

### 5. Place the page in a flow section

In [`flow/flow.js`](../flow/flow.js), import the page leaf from step 1 and add
it to a section in the order you want it walked:

```js
import { importReasonPage } from '../features/import-reason/page.js'
// then, in `sections`:
{ id: 'consignment', pages: [importReasonPage, importPurposePage, additionalDetailsPage] }
```

A section is a navigation sequence: `nextInSection` walks its pages, returning
to the hub after the last one. Always import the leaf — never inline an
`{ id, slug }` literal here. Add no `gate`; an always-live section derives to
reachable from its pages' collects.

### 6. Give it a hub task row

The hub is decoupled from the flow sections. A task row can bundle several
pages, and its wiring lives in two places:

- In [`flow/task-rows.js`](../flow/task-rows.js), add an entry to `taskRows`
  naming the pages the row covers. A single-page row is just
  `{ id: 'importReason', pages: [importReasonPage] }`; a row that spans pages
  lists them all. Optional keys: `parts` (a facet spec, e.g.
  `{ collection: 'commodityLines', except: ['animalIdentifiers'] }`, when the
  row should reflect a subset of a collection) and `conditional: true` (the
  hub hides the row while its status is Not applicable). `rowStatus` derives
  the tag from `statusOf` over the row's collected obligations.

- In [`features/hub/controller.js`](../features/hub/controller.js), present the
  row inside the `GROUPS` literal. Each group has a `caption` and a list of
  rows `{ id, title, hint }`; the `id` must match the `taskRows` id from above.
  `taskRowById` supplies the status and `rowEntry` the href, so the progress
  and tag update themselves.

### 7. Add the check-your-answers rows

In
[`features/check-answers/controller.js`](../features/check-answers/controller.js),
add a `row(...)` line per obligation to the owning summary card, with a label
lookup where the stored value is a code (copy the `YES_NO_LABEL` pattern):

```js
row('Reason for import', importReasonPurpose.reasonLabel(answers.reasonForImport) ?? '', 'reasonForImport'),
```

Cards are assembled in `buildSections`; add your row to the card that owns the
obligation, or a new card if the page starts a new group. The third argument is
the obligation name — the Change link derives its target from the dispatch
index (`pageOfObligation`), so you never hardcode a slug. Wrap conditional rows
in the same scope check the model uses (`scope.has('…')`) so a row appears only
when its obligation is in scope.

### 8. Add a contract case

In [`contract.test.js`](../contract.test.js), add a case to the `cases` array
with a valid payload filling every field. It drives the POST handler and
asserts it commits exactly the committable obligations `meta.collects` declares
— the one binding the boot assertion cannot see (the boot check proves coverage
of the index; the contract proves the handler writes what it claims).

## How the wiring is guarded

The boot coverage assertion is the primary wiring guard. `buildDispatch`
([`flow/dispatch.js`](../flow/dispatch.js)) asserts every non-system obligation
is collected by exactly one page. Until your `meta` is in `dispatchPages`
(step 4), `reasonForImport` is "collected by no page": the server refuses to
boot, and because almost every test file runs `buildDispatch(dispatchPages)` in
its `beforeAll`, the whole unit suite fails loudly. A forgotten or duplicated
registration is a startup failure, never a silent runtime break.

## The blast radius of a mandatory field

A **mandatory** obligation that is always in scope (a plain `status: 'mandatory'`
with no `applyTo` in the manifest) is a new in-scope gap, so
`readyForCheckYourAnswers` turns false until it is answered. That fails every
ready-to-submit fixture in the suite, not just your page's own tests, because
the submit gate spans the whole journey. Each failing fixture is fixed by
adding a value for the new obligation to its ready state.

A **conditional** obligation (one with an `applyTo` gate) only bites when its
gate is open, and an **optional** obligation never gates submission at all.
Reach for `status: 'mandatory'` with no gate only when the journey genuinely
cannot complete without the answer, and budget for the fixture sweep when you
do. The requiredness and scope of a field are model facts — see
[add-a-field.md](add-a-field.md) and [obligation-model.md](obligation-model.md).

## The happy-path E2E

The journey's own spec
([`prototypes/e2e/live-animals.spec.js`](../../../e2e/live-animals.spec.js))
walks the full journey by clicking named task links and asserting headings,
ending on the confirmation panel. The full-walk test completes every hub task,
so a mandatory new field blocks `readyForCheckYourAnswers` and the final submit
will not finalise until your task is done. If you add a mandatory field, extend
that walk to fill it before the `Check and submit` step, and add a valid value
to the shared happy-path fixture the walk reads.

## Check your work

From the frontend repo root:

```
npm run test:live-animals
npm run test:prototype
```

Both suites must be green, including your new contract case. If the unit suite
fails wholesale with "collected by no page", revisit step 4. If only
ready-to-submit fixtures fail, you added a mandatory field — see the blast
radius section above.
</content>
</invoke>
