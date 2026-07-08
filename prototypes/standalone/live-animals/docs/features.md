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
  `claims/list.controller.js` + `claims/entry.controller.js`)
- **`page.js`** — the page identity leaf: `{ id, slug }`, authored once,
  imported by both the controller and `flow/flow.js`. It imports nothing
  (see [section 2](#2-why-pagejs-is-import-free))
- **`obligations.js`** — the feature's slice of the obligation model:
  pure data (identity, relationships, structural facts), never copy or
  validation. Boot rejects any outward import
  (`obligation-purity.js`)
- **template(s)** — the feature's own Nunjucks markup (`template.njk`,
  or one per page like `modifications/describe.njk`)

`features/import-reason/` is the smallest complete example: one
controller, one page leaf, one obligation, one template.

Not every feature collects answers. The shell (`start`, `hub`) and the
endings (`quote`, `check-answers`, `confirmation`, `resume`) render or
act but declare no `collects` (see
[section 6](#6-pages-own-presentation)).

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

There are 12 `page.js` files. A feature with two flow pages exports both
identities from one leaf (`features/modifications/page.js` exports
`modificationsDescribePage` and `modificationsValuePage`). A feature
with sub-pages exports only its flow page:
`features/named-driver/page.js` exports the drivers hub alone, because
the driver detail, entry and claim sub-pages are reached from that hub
and never listed in `flow.js`.

## 3. The standard collecting controller

Most collecting pages follow one shape. `features/import-reason/controller.js`
is the minimal case; `features/about-you/controller.js` adds a fuller
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
sees a schema. All validators except `about-you`'s `fullName` are
optional: blank saves, malformed non-blank input fails.

The result is small — around 60 lines for `import-reason`, around 95 for
`about-you` with its five validators and date widget. Each controller is
readable on its own; that is the point of the page-owned spine.

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
skipping `system` obligations (computed, never collected — for example
`quote`'s `premium`).

A feature that splits its obligations across pages must author an
explicit subset per page. Modifications is the worked example — two
pages, one obligation each:

```js
// features/modifications/describe.controller.js
export const meta = { ...page, collects: [modDescription.id] }

// features/modifications/value.controller.js
export const meta = { ...page, collects: [modValue.id] }
```

Get this wrong and boot fails, by design. `buildDispatch` throws if two
pages collect the same obligation, and throws if any non-system
obligation (at any depth) is collected by no page. A forgotten or
duplicated `collects` is a startup crash, not a silent runtime break.

Sub-obligations inherit ownership: a collection's items belong to the
page that collects the collection (`claims` covers
`claims.claimType`), so a loop page's `collects` stays a single id.

## 5. Assembling features: features/index.js

`features/index.js` is the one place every controller meets. It exports
two lists:

- **`dispatchPages`** — the `meta` of each of the 12 collecting pages.
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

- `GROUP_ROWS` — title and hint for the three always-present group
  tasks
- `ADDON_COPY` — title and hint per dynamic add-on section, looked up
  through `addonCopy(id)`, which **throws** when a dynamic section has
  no authored entry. A missing copy entry is a bug to surface loudly,
  not a blank row. Do not soften the throw.

The hub composes each row from parts it does not own: status tags from
the pure `sectionStatus` roll-up, hrefs from `sectionEntry`, add-on row
visibility from `sectionGatePasses(section, scope)` (gates are derived
from the model by default — see the flow docs via the
[index](README.md)). The quote row stays inert ("Cannot start yet")
until `scope.readyForQuote`.

### Loop hubs

Repeating collections get bespoke manage-lists — there is no uniform
widget for "a list of things", so each loop hub owns its rows and copy:

- `features/claims/list.controller.js` — top-level claims
- `features/named-driver/drivers-hub.controller.js` — drivers (the
  outer loop)
- `features/named-driver/driver-detail.controller.js` — one driver's
  nested claims sub-hub (a loop inside a loop)

All three compose over the same facts library:
`state.collectionView(answers, path)` returns
`[{ index, path, entry, complete }]` and nothing presentational. The
path sets the depth: `['claims']`, `['drivers']`,
`['drivers', driverIndex, 'claims']`. The controller turns those facts
into its own rows, action links and empty-state copy.

Shared form logic without a shared renderer: the claims entry controller
exports `claimEntryModel`, `claimFromPayload` and `validateClaim` so the
top-level loop and the nested driver-claims loop render an identical
form — but each controller still chooses its template and calls
`h.view` itself.

On an add sub-page, a valid POST appends and thereby **mints** the
entry's identity (collection, index). Until that POST the draft lives
only in the payload — never a half-created entry in the store. Nested
writes must validate the path index first:
`driver-claim.controller.js`'s `validDriver` redirects on a malformed
or out-of-range `{driver}` param, because the generic append primitive
would otherwise fabricate a phantom driver.

### Endings

- **Quote** (`features/quote/controller.js`) computes the premium on
  demand from the current answers (`lib/quote.js`). Nothing derived is
  ever stored. Its one obligation (`premium`) is `system`, so
  `collectsFrom` correctly yields an empty set.
- **Check your answers** (`features/check-answers/controller.js`) is
  bespoke summary composition — the norm here, not a bypass. It owns
  row order, composed rows (Vehicle, Claim N, add-on status) and the
  exact "Change <key>" accessible names. Change hrefs are **derived**
  through the dispatch seam —
  `pagePath(slugOfPage(pageOfObligation(id)))` — never hardcoded slugs,
  so a page rename cannot orphan a Change link. Its POST is the one
  soft gate: `state.submitJourney` re-checks readiness server-side and
  re-renders if the journey is not ready.
- **Confirmation** (`features/confirmation/controller.js`) is the one
  status-guarded route: a pre-submit visit redirects to the start page.
  The reference is deterministic, so refresh re-renders identically.
- **Resume** (`features/resume/controller.js`) recovers the current
  user's journey by identity and returns to the hub. The stub has a
  single global user and **no auth** — copy the shape, never the auth
  gap.

## 7. shared/kit.js: a library, never a framework

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

| Verb                                  | Use                                                  |
| ------------------------------------- | ---------------------------------------------------- |
| `state.get(request, h)`               | Read `{ journey, answers, scope }`                   |
| `state.commit(request, h, patch)`     | Save scalar answers; applies scope wipes             |
| `state.appendEntry` / `appendEntryAt` | Add a collection entry (mints its identity)          |
| `state.updateEntry` / `updateEntryAt` | Replace a collection entry                           |
| `state.removeEntry` / `removeEntryAt` | Remove an entry; applies scope wipes                 |
| `state.collectionView(answers, path)` | Structural facts for a loop, any depth               |
| `state.submitJourney(request, h)`     | Finalise — the one-way status flip                   |
| `state.resume(request, h)`            | Recover the user's journey by identity (resume page) |
| `state.makeScope(answers)`            | Rebuild scope from raw answers                       |

Two verbs live outside the barrel on purpose:

- `startJourney` (`engine/journey.js`) — mints a fresh journey; only
  the start page uses it
- `configureReadyForQuote` (`engine/read.js`) — boot-only injection of
  the flow's readiness roll-up; controllers never touch it

There is deliberately no `setScope` and no per-key delete. Scope is
always derived from answers, and out-of-scope data is wiped by the
engine — a page cannot hand-roll either. The engine docs (via the
[index](README.md)) cover the scope, reconcile and wipe model.
