# Anatomy of a feature

Every user-facing page in this prototype lives in a feature folder under
`features/`. This file explains what goes in one, why each part exists,
and the contracts a feature must honour. It also catalogues the pages
the journey ships today.

Paths are relative to the prototype root
(`src/server/live-animals/`). For the folder map and the rest
of the docs, start at the [index](README.md).

## 1. The vertical slice

A feature is a self-contained vertical slice. `features/<name>/` holds:

- **controller(s)** — Hapi route handlers that own GET/POST, validation,
  copy and view-models (`controller.js`, or several like
  `commodities/search.controller.js` +
  `commodities/consignment-details.controller.js`)
- **`page.js`** — the page identity leaf: `{ id, slug }`, authored once,
  imported by both the controller and `flow/flow.js`. It imports nothing
  (see [section 2](#2-why-pagejs-is-import-free))
- **template(s)** — the feature's own Nunjucks markup (`template.njk`,
  or one per page like `transport/port-of-entry.njk`)

A feature owns no obligation definition. The obligation model is a single
central manifest at `model/obligations/obligations.js`; a controller names the
obligations it gathers in its `collects` list and the feature's `evaluation.js`
owns the page-field → manifest-UUID persistence bindings. Copy and validation
live page-side; the model carries neither.

`features/import-reason/` is the smallest complete example: one
controller, one page leaf, one template, gathering the single
`reasonForImport` obligation.

Not every feature gathers answers. The shell (`dashboard`, `hub`) and
the endings (`check-answers`, `confirmation`) render or act but declare
no `collects` (see [section 6](#6-pages-own-presentation)). The journey
ends on the `confirmation` page: the declaration POST redirects there
after a successful submit.

## 2. Why page.js is import-free

`page.js` exists to break a cycle.

Both the controller and `flow/flow.js` need the page's identity. The
controller spreads it into `meta`; the flow lists it in a section. By
authoring `{ id, slug }` once in a leaf file that both import, page
identity is a shared JS reference, not a string typed twice.

The leaf must import nothing. If it (or `flow.js`) imported a
controller, module loading would cycle:

```
flow -> controller -> engine -> status -> flow
```

ES modules resolve that cycle by handing `flow.js` back before it
finishes evaluating, so `sections` reads `undefined` at boot — a silent
failure that surfaces as a broken hub, not an error.

There are 15 `page.js` files. A feature with several flow pages exports
every identity from one leaf: `features/transport/page.js` exports
`portOfEntryPage`, `transitCountriesPage`, `transportersPage`,
`transportersSelectPage` and `privateTransporterDetailsPage`;
`features/commodities/page.js` exports `commoditiesPage`,
`consignmentDetailsPage` and `animalIdentificationPage`. A feature whose
sub-pages sit off the main flow exports only its flow page:
`features/documents/page.js` exports the documents hub alone, and
`features/addresses/page.js` exports the addresses hub alone — the
add-a-party sub-pages (`party-picker`, `create-address`) are reached
from that hub and never listed in `flow.js`.

## 3. The standard collecting controller

Most collecting pages follow one shape. `features/import-reason/controller.js`
is the minimal case; `features/origin/controller.js` adds a fuller
validation schema and a service-backed country list. The parts, in
order:

1. **`meta`** — the page identity plus what it collects:

   ```js
   export const meta = { ...page, collects: ['reasonForImport'] }
   ```

2. **`render(h, journey, values, errors = {})`** — one helper that
   builds the whole view-model and calls `h.view` with the feature's own
   template. Both GET and the POST error path go through it.

3. **`get`** — read the journey (`state.get`), prefill values from
   `answers`, render.

4. **`post`** — parse the payload, validate, then either:
   - **errors**: re-render with the user's **raw** input, so they see
     what they typed
   - **clean**: `state.commit` the values, then redirect to
     `kit.nextTarget(request, page, scope)`

5. **`routes`** — `kit.pageRoutes(page, { get, post })` glues the
   GET/POST pair to the page's slug.

Controllers own their validation. They compose a field→validator schema
from `lib/validate/` (`compose`, `oneOf`, `requiredOneOf`, `maxText`,
`pattern`, `dateParts` and so on) and run `validate(fields, payload)`.
The state layer never sees a schema. This page-level validation shapes
GDS field errors and is separate from the model's value-legality
predicates (see [validation.md](validation.md)).

Each controller is readable on its own; that is the point of the
page-owned spine.

## 4. The collects contract

`collects` declares which obligations a page gathers, as an explicit
array of obligation ids authored on the controller's `meta`. It is the
source of truth the boot-time dispatch index inverts into
obligation → owning page (`flow/dispatch.js`), so the model never names
a page yet the hub and check-answers can ask "which page owns
obligation X".

A single-obligation page names one id:

```js
// features/import-purpose/controller.js
export const meta = { ...page, collects: ['purposeInInternalMarket'] }
```

A page that gathers several obligations names each:

```js
// features/origin/controller.js
export const meta = {
  ...page,
  collects: [
    'countryOfOrigin',
    'regionOfOriginCodeRequirement',
    'regionOfOriginCode',
    'internalReferenceNumber'
  ]
}
```

Get this wrong and boot fails, by design. `buildDispatch` throws if two
pages collect the same obligation, and throws if any obligation that is
not system-populated (at any depth) is collected by no page. A forgotten
or duplicated `collects` is a startup crash, not a silent runtime break.

Sub-obligations inherit ownership: a collection's items belong to the
page that collects the collection. `features/commodities/search.controller.js`
collects the whole `commodityLines` group with a single id, and every
field inside a line rides with it. So a page that only edits or reads a
collection already owned upstream declares `collects: []` — the
consignment-details and animal-identification pages both do this,
because the search page already owns `commodityLines`.

## 5. Assembling features: features/index.js

`features/index.js` is the one place every controller meets. It exports
two lists:

- **`dispatchPages`** — the `meta` of every collecting page.
  Boot passes this to `buildDispatch`, which builds the
  obligation → page index and runs the coverage assertions above.
- **`allRoutes`** — every controller's `routes`, flattened for
  `server.route()`. This includes the shell, the endings and the
  off-flow sub-pages (`hub`, `party-picker`, `create-address`,
  `check-answers`, `confirmation`), which contribute routes but no
  `meta`.

Adding a page means adding it in both lists (or `allRoutes` only, if it
collects nothing). Nothing else registers controllers.

## 6. The page catalogue

The journey is grouped into flow sections in `flow/flow.js`. Each row
below is one page — its controller, what it collects and what it does.

**Shell**

- **`dashboard`** (`features/dashboard/controller.js`) — the service
  front door and the only re-entry path. Lists the session-known
  notifications (reference, Draft/Submitted tag, dates) with row
  actions: Resume on a draft; View and Amend on a submitted one. It
  drives `startJourney`, `listKnownJourneys`, `selectJourney` and
  `amendJourney` (see [section 8](#8-state-verbs-a-controller-may-use)).
  Collects nothing.
- **`import-type-filter`** (`features/import-type-filter/controller.js`)
  — the fresh-journey entry filter. Collects `importType`.
- **`hub`** (`features/hub/controller.js`) — the task-list overview.
  Collects nothing; has no `page.js`.

**Answer sections**

- **`origin`** (`features/origin/controller.js`) — collects
  `countryOfOrigin`, `regionOfOriginCodeRequirement`,
  `regionOfOriginCode` and `internalReferenceNumber`.
- **`commodities/search`** (`features/commodities/search.controller.js`)
  — the commodity picker. Collects `commodityLines` (the whole group).
- **`commodities/consignment-details`**
  (`features/commodities/consignment-details.controller.js`) — the
  commodity-lines loop hub with per-species quantity blocks. Collects
  nothing new (owned by search).
- **`commodities/animal-identification`**
  (`features/commodities/animal-identification.controller.js`) — the
  per-line identifier loop (see [section 7](#7-pages-own-presentation)).
  Collects nothing new.
- **`import-reason`** (`features/import-reason/controller.js`) —
  collects `reasonForImport`.
- **`import-purpose`** (`features/import-purpose/controller.js`) —
  collects `purposeInInternalMarket`.
- **`additional-details`** (`features/additional-details/controller.js`)
  — collects `animalsCertifiedFor` and `containsUnweanedAnimals`.
- **`documents`** (`features/documents/controller.js`) — the
  accompanying-documents loop. Collects `documents`.
- **`addresses`** (`features/addresses/controller.js`) — the party
  addresses hub. Collects `consignor`, `placeOfDestination`,
  `placeOfOrigin`, `consignee` and `importer`. Its off-flow sub-pages
  are `party-picker.controller.js` and `create-address.controller.js`.
- **`cph-number`** (`features/cph-number/controller.js`) — collects
  `countyParishHoldingCph`.
- **`transport/port-of-entry`**
  (`features/transport/port-of-entry.controller.js`) — collects
  `arrivalDateAtPort`, `portOfEntry`, `meansOfTransport`,
  `transportIdentification` and `transportDocumentReference`.
- **`transport/transit-countries`**
  (`features/transport/transit-countries.controller.js`) — collects
  `transitedCountries`; in scope only for a transit reason for import.
- **`transport/transporters`**
  (`features/transport/transporters.controller.js`) — collects
  `transporterType`.
- **`transport/transporters-select`**
  (`features/transport/transporters-select.controller.js`) — collects
  `commercialTransporter`.
- **`transport/private-transporter-details`**
  (`features/transport/private-transporter-details.controller.js`) —
  collects `privateTransporter`.
- **`contact`** (`features/contact/controller.js`) — collects
  `contactAddress`.

**Endings**

- **`check-answers`** (`features/check-answers/controller.js`,
  page id `notification-view`) — the summary. Collects nothing.
- **`declaration`** (`features/declaration/controller.js`) — the submit
  point. Collects `declaration`.
- **`confirmation`** (`features/confirmation/controller.js`) — the
  end-of-journey panel. Collects nothing.

## 7. Pages own presentation

Copy, headings, row composition and templates always live page-side.
The flow owns sequence and gates; the engine owns state. Three patterns
recur.

### The task-list hub

`features/hub/controller.js` owns all group and task-link copy:

- `GROUPS` — the numbered group captions ("1. About the consignment" …
  "Check and submit") and each row's title and hint, keyed by
  task-row id.

The hub composes each row from parts it does not own: the row structure
from `flow/task-rows.js`, status tags from the pure `rowStatus` roll-up
and hrefs derived from the model by default. The conditional
transit-countries row renders only while `transitedCountries` is in
scope. Chrome is the design's: an "Overview" h1, a back link to the
dashboard and a "Return to dashboard" secondary button in place of
breadcrumbs (`breadcrumbs: false` suppresses the layout default). The
"Check and submit" task is gated on submit readiness
(`readyForCheckYourAnswers`): until every answer row is ready its hub row
is locked — "Cannot start yet", no link — and the declaration POST
re-checks readiness server-side before it will finalise.

### Loop hubs

Repeating collections get bespoke manage-lists — there is no uniform
widget for "a list of things", so each loop hub owns its rows and copy:

- `features/commodities/consignment-details.controller.js` — the
  top-level commodity lines: the selected-commodities table with per-row
  Remove, "Add another commodity" back to the search page, and the
  inline per-species quantity blocks, composed from sub-component
  partials (`_selected-commodities-table.njk`, `_species-quantities.njk`).
- `features/commodities/animal-identification.controller.js` — the
  loop-inside-a-loop: per commodity line, a manage-list of animal
  identifier records. It writes to a depth-2 collection path
  (`['commodityLines', index, 'animalIdentifiers']`) via
  `state.appendEntryAt` and `state.removeEntryAt`, and reads each line's
  records through `state.collectionView(answers, ['commodityLines'])`.
  The number of records a line accepts is capped at the line's animal
  count (`state.collectionCapAt`); an add past the cap is rejected.
- `features/documents/controller.js` — the accompanying documents, a
  single-page loop: the entry form and the read-back table share one
  page. Each add posts a multipart file through the `document-uploads`
  service, the read-back table carries a scan-status tag column, and
  Continue is blocked while any scan is `PENDING` or `REJECTED` (the hub
  exit stays open — entries are committed at upload).

All compose over the same facts library:
`state.collectionView(answers, path)` returns
`[{ index, path, entry, complete }]` and nothing presentational. The
path sets the depth: `['commodityLines']`, `['documents']`,
`['commodityLines', index, 'animalIdentifiers']`. The controller turns
those facts into its own rows, action links and empty-state copy.

On an add surface, a valid POST creates and thereby **mints** the
entries' identities (collection, index).
`features/commodities/search.controller.js` batch-reconciles one line per
selected species (`state.reconcileEntriesAt`) before handing to the
consolidated details page. The reconcile is desired-state by key: a
still-selected (commodity, species) pair keeps its existing line untouched —
per-line values and nested identifier records included — a newly selected
pair appends its seed line, and a deselected pair's line is removed, with the
write's scope-and-wipe pass destroying anything that leaves scope with it. Until that POST the draft selection lives only
in the payload (hidden `selected`/`shown` inputs across search
round-trips) — never a half-created entry in the store. A nested add
validates its parent index before writing, so the append primitive never
fabricates a phantom parent.

### Endings

- **Check your answers** (`features/check-answers/controller.js`) is
  bespoke summary composition — the norm here, not a bypass. It owns
  row order, composed rows (Commodity N, Document N) and the exact
  "Change <key>" accessible names. Change hrefs are **derived** through
  the dispatch seam —
  `pagePath(slugOfPage(pageOfObligation(id)))` — never hardcoded slugs,
  so a page rename cannot orphan a Change link. Its POST walks on to the
  declaration; its back link points at the hub.
- **Declaration** (`features/declaration/controller.js`) is the submit
  point: its POST validates the confirmation checkbox then calls
  `state.submitJourney`, which re-checks submit readiness server-side
  (`scope.readyForCheckYourAnswers`) and finalises only if the journey is
  ready. On success it redirects to `/confirmation`.
- **Confirmation** (`features/confirmation/controller.js`) is the
  journey's end: a GDS confirmation panel with the notification's
  reference number, transport guidance and amend-from-the-dashboard
  guidance. It renders only for a submitted notification; any other
  access redirects to the hub, and a declaration GET on a submitted
  notification redirects here.

### The journey reference strip

The shared layout renders a status strip — the journey's reference number
plus a Draft/Submitted tag (`kit.journeyStrip`) — above the heading of any
page whose controller passes `journey` into `kit.base`. The hub and the task
pages pass it. The dashboard and the import-type filter never do; origin
passes it only once the journey holds committed answers, so the reference
first appears at the journey's first save; and the confirmation page omits it
because its panel already carries the reference — rendering both would double
it.

### Progressive enhancement (client JS)

A page that wants client-side behaviour layers it OVER a fully working
server-rendered control — never instead of one. The select-autocomplete
enhancement is the pattern:

- the template renders the plain govuk control as normal, opting in via
  a data attribute (`data-select-autocomplete` on the `govukSelect`);
- the behaviour lives in a webpack entry in the host repo
  (`src/client/javascripts/select-autocomplete.js`, entry
  `selectAutocomplete` in `webpack.config.js`) — it mounts
  `accessible-autocomplete`'s `enhanceSelectElement` over every opted-in
  select, and its stylesheet is pulled into `application.scss`;
- the template ships the bundle by overriding the layout's `bodyEnd`
  block with `{{ super() }}` plus a
  `getAssetPath('selectAutocomplete.js')` script tag. The webpack entry
  is load-bearing: without it the script include 404s silently and the
  enhancement never mounts.

The origin country select and the port-of-entry select both opt in and
share the one entry and bundle — a second select reuses the data
attribute and the same `bodyEnd` include, never a second webpack entry.
With JS off the select submits exactly as before; the enhancement only
changes the input affordance. The placeholder and the disabled divider
row carry `value: ''`, which keeps those decorative rows out of the
suggestion list. What the suggestion list can match is the option TEXT:
the port options render `Name (CODE)`, which gives the default substring
source its search-by-name-or-code behaviour for free.

E2E interactions with an enhanced select must target the mounted
`input#<id>` — it exists only after hydration, so actions auto-wait for
the mount. A `getByRole('combobox')` query races hydration: a plain
select's implicit ARIA role is also `combobox`, so the query can resolve
to the raw select while the bundle is still in flight, and `fill()` on a
select fails without retrying. Pin the a11y contract on the input
separately with `toHaveRole` / `toHaveAccessibleName`.

`shared/kit.js` holds the genuinely uniform mechanical bits: `base`,
`pageRoutes`, `errorSummary`, `fieldError`, `nextTarget`, `exitTarget`,
`hubExitTarget`, `changeContext`, `withChangeContext`, `readDate`,
`dateField`, `journeyStrip`, `routeOptions` and `CYA_SLUG`.

The boundary rule: every helper is independently callable and none owns
what renders. No helper accepts a template name or a field schema and
renders it. Controllers keep their own GET/POST, validation and
view-model, and call kit for plumbing only.

This is a deliberate design decision, not a style preference. The moment
a `kit.renderPage(spec)` appears, a generic config-engine has taken over
and the per-page bespoke layout — the core reason this prototype exists
— is lost. See [decisions.md](decisions.md) for the full
library-not-framework rationale and its guardrails.

`kit.nextTarget` is worth knowing: a save from a `?change=1` edit returns
to check-answers; otherwise it goes to the next gate-passing page in the
section, or back to the hub.

## 8. State verbs a controller may use

Controllers import one barrel: `import * as state from
'../../engine/index.js'`. Its full surface is:

| Verb                                   | Use                                               |
| -------------------------------------- | ------------------------------------------------- |
| `state.get(request, h)`                | Read `{ journey, answers, scope }`                |
| `state.commit(request, h, patch)`      | Save scalar answers; applies scope wipes          |
| `state.appendEntry` / `appendEntryAt`  | Add a collection entry (mints its identity)       |
| `state.updateEntry` / `updateEntryAt`  | Replace a collection entry                        |
| `state.removeEntry` / `removeEntryAt`  | Remove an entry; applies scope wipes              |
| `state.reconcileEntriesAt`             | Reconcile a collection to a target set of entries |
| `state.collectionView(answers, path)`  | Structural facts for a loop, any depth            |
| `state.collectionCapAt(answers, path)` | The append cap from the sibling count field       |
| `state.submitJourney(request, h)`      | Finalise — freeze until an amend                  |
| `state.makeScope(answers)`             | Rebuild scope from raw answers                    |
| `state.SUBMITTED`                      | The submitted-status constant                     |

Some verbs live outside the barrel on purpose:

- `startJourney` (`engine/journey.js`) — mints a fresh journey and adds
  it to the session's known list; only the dashboard uses it
- `listKnownJourneys` / `selectJourney` / `amendJourney`
  (`engine/journey.js`) — the dashboard's list and row actions (see
  [section 6](#6-the-page-catalogue)); no task page touches them
- `configureReadyForCheckYourAnswers` (`engine/read.js`) — a test override for
  the static flow readiness default; controllers never touch it

There is deliberately no `setScope` and no per-key delete. Scope is
always derived from answers, and out-of-scope data is wiped by the
engine — a page cannot hand-roll either. The engine docs (via the
[index](README.md)) cover the scope, reconcile and wipe model.
