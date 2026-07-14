# Anatomy of a feature

Every user-facing page in this spike lives in a feature folder under
`features/`. This file explains what goes in one, why each part exists,
and the contracts a feature must honour.

Paths are relative to the spike root
(`prototypes/standalone/live-animals/`). For the folder map and
the rest of the docs, start at the [index](README.md).

## 1. The vertical slice

A feature is a self-contained vertical slice. `features/<name>/` holds:

- **controller(s)** — Hapi route handlers that own GET/POST, validation,
  copy and view-models (`controller.js`, or several like
  `commodities/list.controller.js` + `commodities/select.controller.js`)
- **`page.js`** — the page identity leaf: `{ id, slug }`, authored once,
  imported by both the controller and `flow/flow.js`. It imports nothing
  (see [section 2](#2-why-pagejs-is-import-free))
- **`obligations.js`** — the feature's slice of the obligation model:
  pure data (identity, relationships, structural facts), never copy or
  validation. Boot rejects any outward import
  (`obligation-purity.js`)
- **template(s)** — the feature's own Nunjucks markup (`template.njk`,
  or one per page like `transport/port-of-entry.njk`)

`features/import-reason/` is the smallest complete example: one
controller, one page leaf, one obligation, one template.

Not every feature collects answers. The shell (`dashboard`, `hub`) and
the endings (`check-answers`, `confirmation`) render or act but
declare no `collects` (see [section 6](#6-pages-own-presentation)). The
journey ends on the `confirmation` page (c-022 superseded at M3-16): the
declaration POST redirects there after a successful submit.

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
failure that surfaces as a broken hub, not an error. Each `page.js`
carries a one-line comment pointing here; this section is the full
story.

There are 13 `page.js` files. A feature with several flow pages exports
every identity from one leaf (`features/transport/page.js` exports
`portOfEntryPage`, `transportDetailsPage` and the rest). A feature
with sub-pages exports only its flow page:
`features/documents/page.js` exports the documents hub alone, because
the add-a-document sub-page is reached from that hub and never listed in
`flow.js`.

## 3. The standard collecting controller

Most collecting pages follow one shape. `features/import-reason/controller.js`
is the minimal case; `features/origin/controller.js` adds a fuller
validation schema. The parts, in order:

1. **`meta`** — the page identity plus what it collects:

   ```js
   export const meta = { ...page, collects: kit.collectsFrom(obligations) }
   ```

2. **`render(h, values, errors = {})`** — one helper that builds the
   whole view-model and calls `h.view` with the feature's own template.
   Both GET and the POST error path go through it.

3. **`get`** — read the journey (`state.get`), prefill values from
   `answers`, render.

4. **`post`** — parse the payload, validate, then either:
   - **errors**: re-render with the user's **raw** input, so they see
     what they typed
   - **clean**: `state.commit` the **clean** values (normalising
     validators like `currency` return a cleaned value — persist that,
     not the raw payload), then redirect to
     `kit.nextTarget(request, page, scope)`

5. **`routes`** — `kit.pageRoutes(page, { get, post })` glues the
   GET/POST pair to the page's slug.

Controllers own their validation. They compose a field→validator schema
from `lib/validate/` (`requiredText`, `currency`, `oneOf`, `dateParts`
and so on) and run `validate(fields, payload)`. The state layer never
sees a schema. All validators except `origin`'s `countryOfOrigin` are
optional: blank saves, malformed non-blank input fails.

The result is small — around 60 lines for `import-reason`, around 115
for `origin` with its five validators and service-backed country list
(read per POST — see [validation.md](validation.md)). Each
controller is readable on its own; that is the point of the page-owned
spine.

## 4. The collects contract

`collects` declares which obligations a page gathers. It is the authored
source of truth the boot-time dispatch index inverts into
obligation → owning page (`flow/dispatch.js`), so the model never names
a page yet the hub and check-answers can ask "which page owns
obligation X".

The default is the whole feature:

```js
collects: kit.collectsFrom(obligations)
```

`collectsFrom` maps the feature's real obligation objects to their ids,
skipping `system` obligations (computed, never collected). No obligation
carries the flag today — the only one was the car quote's `premium`,
removed with the quote feature in inc-028 — but the skip stands ready for
a future computed value.

A feature that splits its obligations across pages must author an
explicit subset per page. Transport is the worked example — each page
declares the ids it owns:

```js
// features/transport/transporters.controller.js
export const meta = { ...page, collects: [transporterType.id] }

// features/transport/port-of-entry.controller.js
export const meta = {
  ...page,
  collects: [portOfEntry.id, arrivalDateAtPort.id]
}
```

Get this wrong and boot fails, by design. `buildDispatch` throws if two
pages collect the same obligation, and throws if any non-system
obligation (at any depth) is collected by no page. A forgotten or
duplicated `collects` is a startup crash, not a silent runtime break.

Sub-obligations inherit ownership: a collection's items belong to the
page that collects the collection (`commodityLines` covers
`commodityLines.commoditySelection`), so a loop page's `collects` stays
a single id.

## 5. Assembling features: features/index.js

`features/index.js` is the one place every controller meets. It exports
two lists:

- **`dispatchPages`** — the `meta` of every collecting page.
  Boot passes this to `buildDispatch`, which builds the
  obligation → page index and runs the coverage assertions above.
- **`allRoutes`** — every controller's `routes`, flattened for
  `server.route()`. This includes the shell and endings, which
  contribute routes but no `meta`.

Adding a page means adding it in both lists (or one, if it collects
nothing). Nothing else registers controllers.

## 6. Pages own presentation

Copy, headings, row composition and templates always live page-side.
The flow owns sequence and gates; the engine owns state. Three patterns
recur.

### The task-list hub

`features/hub/controller.js` owns all task-link copy:

- `GROUP_ROWS` — title and hint for the always-present group
  tasks

The hub composes each row from parts it does not own: status tags from
the pure `sectionStatus` roll-up and hrefs from `sectionEntry` (gates
are derived from the model by default — see the flow docs via the
[index](README.md)). The "Check and submit" task is gated on submit
readiness (`readyForCheckYourAnswers`, RULE 2): until every answer section
is ready its hub row is locked — "Cannot start yet", no link — and the
declaration POST re-checks readiness server-side before it will finalise.

### Loop hubs

Repeating collections get bespoke manage-lists — there is no uniform
widget for "a list of things", so each loop hub owns its rows and copy:

- `features/commodities/list.controller.js` — top-level commodity lines
- `features/documents/controller.js` — top-level documents, a
  single-page loop: the entry form and the read-back table share one page

Both compose over the same facts library:
`state.collectionView(answers, path)` returns
`[{ index, path, entry, complete }]` and nothing presentational. The
path sets the depth: `['commodityLines']`, `['documents']`. The
controller turns those facts into its own rows, action links and
empty-state copy. The engine also supports a loop inside a loop — a
nested claims sub-hub keyed on a `['drivers', driverIndex, 'claims']`
path — but that outer/inner-loop machinery went with the car
named-driver section (inc-025); there is no live nested loop until M2's
`animalIdentifiers` (see [limits.md](limits.md)).

Shared form logic without a shared renderer was demonstrated by the car
claim form's `claim-entry.js` (view-model, payload parsing and
validation kept in a feature-local module, separate from rendering — the
controller still chose its template and called `h.view` itself). That
module was removed with named-driver; the pattern stays available for
any future form that needs the same seam.

On an add sub-page, a valid POST appends and thereby **mints** the
entry's identity (collection, index) — `features/commodities/select.controller.js`
does this before handing to the details sub-page. Until that POST the
draft lives only in the payload — never a half-created entry in the
store. A nested add (writing under a `{driver}`-style parent index) must
validate the parent index first, or the generic append primitive would
fabricate a phantom parent; that guard (`driver-claim.controller.js`'s
`validDriver`) went with named-driver and has no live carrier until a
depth-2 collection returns.

### Endings

- **Check your answers** (`features/check-answers/controller.js`) is
  bespoke summary composition — the norm here, not a bypass. It owns
  row order, composed rows (Commodity N, Document N) and the
  exact "Change <key>" accessible names. Change hrefs are **derived**
  through the dispatch seam —
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
  guidance (c-029 — no outstanding-items checklist). It renders only for
  a submitted notification; any other access redirects to the hub, and a
  declaration GET on a submitted notification redirects here.
- **Dashboard** (`features/dashboard/controller.js`) is the service
  front door AND the only re-entry path: it lists the session-known
  notifications (reference, Draft/Submitted tag, dates) with row
  actions — Resume on a draft; View and Amend on a submitted one.
  Amend is the c-029 sanctioned unfreeze: `amendJourney` →
  `records.amend`, then the hub for edit-and-resubmit through the same
  declaration gate. Every row action refuses a reference the session
  does not know — there is no backend browse. The old `/resume`
  recover-by-identity route was retired in its favour.

### Progressive enhancement (client JS)

A page that wants client-side behaviour layers it OVER a fully working
server-rendered control — never instead of one. The pattern (canary:
the origin country select, inc-058):

- the template renders the plain govuk control as normal, opting in via
  a data attribute (`data-select-autocomplete` on the `govukSelect`);
- the behaviour lives in a per-page webpack entry in the host repo
  (`src/client/javascripts/select-autocomplete.js`, entry
  `selectAutocomplete` in `webpack.config.js`) — the origin entry mounts
  `accessible-autocomplete`'s `enhanceSelectElement` over every opted-in
  select, and its stylesheet is pulled into `application.scss`;
- the template ships the bundle by overriding the layout's `bodyEnd`
  block with `{{ super() }}` plus a
  `getAssetPath('selectAutocomplete.js')` script tag — the same
  manifest-hashed include the host app uses. The webpack entry is
  load-bearing: without it the script include 404s silently and the
  enhancement never mounts.

With JS off the select submits exactly as before; the enhancement only
changes the input affordance. Option values (the placeholder and the
disabled divider row carry `value: ''`) are what keeps the decorative
rows out of the suggestion list, and the underlying select — renamed
`<id>-select` by the enhancement — remains the control that submits.

`shared/kit.js` holds the genuinely uniform mechanical bits:
`errorSummary`, `fieldError`, `base`, `pageRoutes`, `readDate`,
`dateField`, `nextTarget`, `collectsFrom`, `open`, `CYA_SLUG`.

The boundary rule: every helper is independently callable and none owns
what renders. No helper accepts a template name or a field schema and
renders it. Controllers keep their own GET/POST, validation and
view-model, and call kit for plumbing only.

This is a deliberate design decision, not a style preference. The
moment a `kit.renderPage(spec)` appears, the rejected generic
config-engine has sneaked back in and the per-page bespoke layout —
the core reason this spike exists — is lost. See
[decisions.md](decisions.md) for the full library-not-framework
rationale and its guardrails.

`kit.nextTarget` is worth knowing: a save from a `?change=1` edit
returns to check-answers; otherwise it goes to the next gate-passing
page in the section, or back to the hub.

## 8. State verbs a controller may use

Controllers import one barrel: `import * as state from
'../../engine/index.js'`. Its full surface is:

| Verb                                  | Use                                         |
| ------------------------------------- | ------------------------------------------- |
| `state.get(request, h)`               | Read `{ journey, answers, scope }`          |
| `state.commit(request, h, patch)`     | Save scalar answers; applies scope wipes    |
| `state.appendEntry` / `appendEntryAt` | Add a collection entry (mints its identity) |
| `state.updateEntry` / `updateEntryAt` | Replace a collection entry                  |
| `state.removeEntry` / `removeEntryAt` | Remove an entry; applies scope wipes        |
| `state.collectionView(answers, path)` | Structural facts for a loop, any depth      |
| `state.submitJourney(request, h)`     | Finalise — freeze until an amend            |
| `state.makeScope(answers)`            | Rebuild scope from raw answers              |

Some verbs live outside the barrel on purpose:

- `startJourney` (`engine/journey.js`) — mints a fresh journey and adds
  it to the session's known list; only the dashboard uses it
- `listKnownJourneys` / `selectJourney` / `amendJourney`
  (`engine/journey.js`) — the dashboard's list and row actions (see
  section 6); no task page touches them
- `configureReadyForCheckYourAnswers` (`engine/read.js`) — boot-only injection
  of the flow's readiness roll-up; controllers never touch it

There is deliberately no `setScope` and no per-key delete. Scope is
always derived from answers, and out-of-scope data is wiped by the
engine — a page cannot hand-roll either. The engine docs (via the
[index](README.md)) cover the scope, reconcile and wipe model.
