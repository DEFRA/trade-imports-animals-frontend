# Architecture: the layers and how a request flows

Read this file first. Then use the [index](README.md) to find the topic you
need.

The live-animals journey is one Hapi plugin ([`routes.js`](../routes.js), export
`liveAnimals`). It is built on an **obligation model** with a **page-owned
spine**: each page is an ordinary Hapi GET/POST pair that owns its copy,
validation and template, while a single pure model owns what data is owed, when
each field is in scope, and what a partly-filled journey's status is.

## The four layers

```
features/  →  flow/            (page spine + sequencing)
           →  engine/          (the state facade pages call)
                 └─ bridge/     (the seam)
                       └─ model/  (identity, scope, legality, derivation)
services/  supplies option lists and the persistence ports
```

Dependencies point inward. Pages depend on the flow and the engine facade; the
facade depends on the bridge; the bridge depends on the model. The model depends
on nothing in the frontend — it never imports a controller, a template or a
request.

### model/ — the pure core

The model is plain data plus pure functions. It has four parts:

- **Obligations** — [`model/obligations/obligations.js`](../model/obligations/obligations.js)
  is the manifest: one object per data requirement, each with a UUID `id`, a
  `name`, an optional parent `within` group, a `status` and an optional `applyTo`
  scope closure built by [`model/obligations/helpers.js`](../model/obligations/helpers.js).
  [`model/obligations/evaluator.js`](../model/obligations/evaluator.js) exports
  `createObligationEvaluator`, whose `evaluate(fulfilments)` runs the scope
  fixpoint, purges out-of-scope data and returns
  `{ fulfilments, obligations: implicationsByObligation }`. See
  [obligation-model.md](obligation-model.md).
- **Domain** — [`model/domain/index.js`](../model/domain/index.js) holds value
  legality: enums, integer/string/date predicates and address blocks, keyed by
  obligation id. Enum options are delegated to the MDM services under
  `services/`; the domain carries no display copy.
- **State queries** — [`model/obligations/state-queries.js`](../model/obligations/state-queries.js)
  holds small pure functions over evaluator output: `effectiveStatus` (the
  per-record mandate) and `groupInvariantErrors` (the five `requires` rule
  shapes). The 5-way status classification lives in the bridge (`status.js`).
- **Analysis** — [`model/analysis/reachability.js`](../model/analysis/reachability.js)
  proves every obligation's scope gate can fire. See [analysis.md](analysis.md).

The model carries **no display copy** — no `label`, `title`, `hint`, `legend`
or `widget` on any obligation or domain entry. This is enforced at boot by
[`model/no-display-keys.js`](../model/no-display-keys.js) (called through
[`obligation-purity.js`](../obligation-purity.js)): a display key on the model
fails the boot, not just a test. Copy lives in the `.njk` templates; value
options come from the services.

### bridge/ — the seam

The evaluator speaks in **fulfilments**: a flat map keyed by obligation UUID,
with grouped values held as `{ fulfilmentId: value }` maps under composite keys
(`line0`, `line0/unit1`). Controllers and templates speak in **answers**: a
nested POJO (`answers.commodityLines[0].animalIdentifiers[1]…`). The bridge is
the only door between the two.

- [`bridge/fulfilments.js`](../bridge/fulfilments.js) —
  `answersToFulfilments` / `projectAnswers`: nested answers ⇄ flat
  fulfilments, including composite-key ↔ positional-path conversion. Values
  pass through unchanged except for numeric animal-count coercion.
- [`bridge/scope.js`](../bridge/scope.js) — `makeScopeFromB(answers)`
  returns `{ inScope: Set<pathKey>, has(id), answered(id),
readyForCheckYourAnswers }`. It runs the evaluator and projects every in-scope
  implication back into the positional path grammar the controllers use.
- [`bridge/status.js`](../bridge/status.js) — `statusOfFromB` is the
  sole runtime source of task-list and section status (the 5-way alphabet).
- [`bridge/purge.js`](../bridge/purge.js) — `wipeSetFromB(answers)`
  lists the answer paths the evaluator's purge destroys; the write path feeds
  this to `destroyWiped`.
- [`bridge/collection-complete.js`](../bridge/collection-complete.js)
  — per-instance completeness for the collection views.

Each bridge instantiates its own evaluator and runs the answers through it, so
the frontend never touches the evaluator directly. See
[scope-and-wipe.md](scope-and-wipe.md).

### engine/ — the state facade

[`engine/index.js`](../engine/index.js) is the barrel controllers import as
`import * as state`. It exposes:

- **Read** — `get` and `makeScope` ([`engine/read.js`](../engine/read.js)).
  `makeScope` dispatches straight to the bridge's `makeScopeFromB`.
- **Write** — `commit`, `appendEntryAt`, `updateEntryAt`, `removeEntryAt`,
  `reconcileEntriesAt` and `submitJourney` ([`engine/write.js`](../engine/write.js)).
- **Collection views** — `collectionView`, `collectionCapAt`.
- **Journey lifecycle** — [`engine/journey.js`](../engine/journey.js) owns the
  cookie, load-or-create, and the dashboard verbs (list, select, amend a known
  journey), with a per-request memo.
- **Persistence ports** — [`engine/persistence/records.js`](../engine/persistence/records.js)
  and [`engine/persistence/session.js`](../engine/persistence/session.js) are
  configurable ports, wired at boot to the implementations under
  `services/persistence/`. See [persistence.md](persistence.md).

Data crosses the seam in one direction only. Pages write answers down (`commit`
and the entry verbs); the model derives scope, status and wipe and hands them
back as read-only facts. There is no `setScope` and no per-key delete: a page
cannot hand-roll a wipe. The write path applies the wipe itself, in `purge`,
using the bridge's `wipeSetFromB`.

### flow/ — the page spine and sequencing

- [`flow/flow.js`](../flow/flow.js) — the ordered `sections` array (each an `id`
  plus its `pages`, and an optional `gate`). The `review` section carries the one
  authored gate: `(scope) => scope.readyForCheckYourAnswers`.
- [`flow/dispatch.js`](../flow/dispatch.js) — `buildDispatch(pages)` inverts each
  page's `collects` array into an obligation-to-page index. It throws if two
  pages collect the same obligation, if an id contains a path metacharacter, or
  if any non-system obligation is collected by no page.
- [`flow/gates.js`](../flow/gates.js) — a page or section with no authored gate
  is reachable exactly when its prerequisites are answered and at least one
  obligation it collects is in scope.
- [`flow/task-rows.js`](../flow/task-rows.js) and
  [`flow/section-status.js`](../flow/section-status.js) — the hub rows and the
  section roll-ups, both resolving through `statusOfFromB`.
  `readyForCheckYourAnswers` is true when every task row is fulfilled, not
  applicable or optional.
- [`flow/entry-guard.js`](../flow/entry-guard.js) — the deep-link guard, run as an
  `onPreHandler` extension.

### features/ — the pages

Each feature under [`features/`](../features/) is a vertical slice. A page has a
`page.js` (id and slug), a `controller.js` that exports `meta` (the page plus its
`collects` list), GET/POST handlers and `routes` (via `kit.pageRoutes`), and a
`template.njk`. Multi-page features (commodities, transport, addresses) hold
several controller/template pairs. [`features/index.js`](../features/index.js)
aggregates `dispatchPages` (the `meta`s that feed `buildDispatch`) and
`allRoutes`. Validation is in-controller, via [`lib/validate/`](../lib/validate/).
See [features.md](features.md) and [validation.md](validation.md).

### services/ — reference data and persistence

Each service under [`services/`](../services/) supplies option lists from the
reference-data (MDM) services — `countries`, `ports`, `commodities`,
`document-types`, `certification-purposes`, `import-reason-purpose`,
`transport-reference` — plus `address-book`, `document-uploads`, and the
`records` and `session` persistence implementations. A `stub` mode and a `real`
mode are selected by `LIVE_ANIMALS_MODE` ([`services/mode.js`](../services/mode.js)).
See [services.md](services.md).

## How a request flows

A **GET** for a collecting page:

1. The route (from `kit.pageRoutes`) runs the entry-guard `onPreHandler`, then
   the controller's `get`.
2. `get` calls `state.get(request, h)`. `engine/read.js` loads the journey's
   answers through the session port (`currentJourney`) and builds the read view
   `{ journey, answers, scope: makeScope(answers) }`.
3. `makeScope(answers)` runs `answersToFulfilments`, evaluates the model, and
   projects the in-scope implications into the `scope` object.
4. The controller renders its template with the answers and the scope-derived
   facts. Enum options come from the services.

A **POST**:

1. The controller validates the payload with `lib/validate/`. On error it
   re-renders with a GDS error summary.
2. On success it calls `state.commit(request, h, values)`.
   [`engine/write.js`](../engine/write.js) merges the patch into the answers,
   runs `purge` (which asks the bridge for `wipeSetFromB` and calls
   `destroyWiped`), saves through the session port, and returns the fresh scope.
3. The controller asks the flow where to go next (`kit.nextTarget`), which
   consults the gates, and redirects.

The **hub** and **Check your answers** read status the same way: they call the
flow's `rowStatus` / `sectionStatus`, which run through `statusOfFromB`. Nothing
derived is stored — scope and status are rebuilt from the answers on every read,
so a days-later resume self-heals to the current rules.

**Submit** is a pure status flip: `submitJourney` checks
`scope.readyForCheckYourAnswers` and, if ready, finalises the record through the
records port.

## Boot sequence

At plugin registration, [`routes.js`](../routes.js) runs, in order:

1. `assertObligationPurity()` — fails the boot if the model carries any display
   key.
2. `buildDispatch(dispatchPages)` — builds the obligation-to-page index and
   coverage-asserts every non-system obligation is collected by exactly one
   page.
3. `configureRecords(records)` and `configureSession(session)` — wire the
   persistence ports to their `services/persistence/` implementations.
4. `registerJourneyCookie(server)` — defines the journey cookie.
5. `onPreHandler` — installs the entry-guard redirect.
6. In real mode only, `countries.prime()` and `ports.prime()` warm the MDM
   caches.
7. `server.route(allRoutes)` — registers every route.

The guards fail loud. So does a gate consulted before `buildDispatch` has run:
an unbuilt index is indistinguishable from "this page collects nothing" and
would silently gate every step out, so `gates.js` throws instead.

## Where things live

```
live-animals/
  routes.js               the Hapi plugin: boot guards, cookie, routes
  obligation-purity.js    boot guard delegating to model/no-display-keys.js
  config.js               shell identity: BASE mount path, template root
  dump.js                 headless state dump for an editable fixture

  model/                  THE PURE CORE — no frontend imports
    obligations/          manifest, gate helpers, evaluator, state queries
    domain/               value legality (enum/predicate/address)
    analysis/             reachability prover
    no-display-keys.js    the purity assertion

  bridge/                 THE SEAM — answers ⇄ fulfilments, scope/status/purge

  engine/                 the state facade pages import (import * as state)
    index.js              the barrel
    read.js               get, makeScope (→ bridge scope)
    write.js              commit + entry verbs + submitJourney
    journey.js            journey lifecycle, cookie, dashboard verbs
    evaluate/             collection-view, cardinality (append cap)
    persistence/          the records + session ports

  flow/                   the page spine + sequencing
    flow.js               ordered sections → pages
    dispatch.js           obligation → owning page index, built at boot
    gates.js              derived-default / authored-override gate seam
    task-rows.js          hub rows → statusOfFromB
    section-status.js     sectionStatus, readyForCheckYourAnswers
    entry-guard.js        deep-link guard (onPreHandler)

  features/               THE PAGE SPINE — one vertical slice per feature
    index.js              assembles dispatchPages (collects) + allRoutes
    <feature>/            page.js, controller.js (meta + routes), template.njk

  services/               reference-data (MDM) + persistence, stub|real
  lib/                    path maths, answered-ness, validate/ (validators)
  shared/                 kit.js (page library), layout + partial templates
  analysis/               flow-reachability, headless simulator
```

For the mechanics, follow the guides: [add a page](add-a-page.md),
[add a field](add-a-field.md) and [add a collection](add-a-collection.md). For
the model, see [obligation-model.md](obligation-model.md); for the state facade,
[engine.md](engine.md); for the gates, [flow-and-gates.md](flow-and-gates.md).
