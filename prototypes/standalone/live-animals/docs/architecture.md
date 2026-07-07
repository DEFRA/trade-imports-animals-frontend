# Architecture: pages as the spine

This spike inverts the v1 design. v1 made a config engine the spine: a central
catalogue plus a flow tree owned every page's copy, rendered through one
generic template. v2 makes the pages the spine. Each page is an ordinary Hapi
GET/POST pair with its own template, owning its copy, validation and
view-model. What survives from v1 is a deliberately thin state layer.

Read this file first. Then use the [index](README.md) to find the topic you
need.

## The paradigm in three claims

### 1. Features are the spine

Every feature under [`features/`](../features/) is a vertical slice: one or
more controllers, a template, a `page.js` identity leaf and (for collecting
pages) an `obligations.js` model. The slice owns its copy, its validation and
its rendering. Nothing central projects a page for it.

### 2. A central engine over an assembling model barrel

The model is inert plain-JS data. Each feature's `obligations.js` describes
identity, structure (`collection`, `item`, `system`, `renderOnly`), mandate
facts (`required`, `requiredAtLeastOne`) and activation and wipe relationships
(`activatedBy`, `wipeOnExit`). Relationships are data literals over real JS
references to other obligations — never strings, never closures.

[`registry.js`](../registry.js) assembles those slices into one catalogue
(`all`, `byId`, `byPath`, `walkObligations()`, `walk(answers)`). It defines
nothing. The [`engine/`](../engine/) evaluates the catalogue: scope, wipe,
completeness and status are all derived from the answers, never authored.

### 3. The seam is one-directional and derived

Each collecting page declares the obligations it `collects`. At boot,
[`flow/dispatch.js`](../flow/dispatch.js) inverts those declarations into an
obligation-to-page index, so the hub and Check your answers can ask "which
page owns obligation X" without the model ever naming a page.

Data crosses the seam in one direction only. Pages write answers down
(`state.commit`, `state.appendEntry` and friends). The engine derives scope,
wipe and status and hands them up as read-only facts. There is no `setScope`
and no per-key delete anywhere in the stack — a page physically cannot
hand-roll a wipe. See [scope, reconcile and wipe](scope-and-wipe.md).

## Three layers, one dependency direction

```
features/  →  flow/  →  engine/
```

- **features/** — the pages. Controllers import the flow (for navigation) and
  the engine facade (`import * as state` from `engine/index.js`).
- **flow/** — sequence and gating. An ordered `sections` array of ordered page
  lists ([`flow/flow.js`](../flow/flow.js)); it owns no copy, no validation
  and no templates. Gates are derived by default: a page or section with no
  authored `gate` is reachable exactly when some obligation it collects is in
  scope ([`flow/gates.js`](../flow/gates.js)). Four of the five original
  hand-authored gates were bare `inScope.has('<key>')` restatements of the
  model, coupled by a raw string. Divergence meant a ghost Not applicable row
  or a quote deadlock. Deriving the default makes "gate passes exactly when
  section status is not Not applicable" hold by construction. Exactly one authored
  gate remains: get-your-quote's `(scope) => scope.readyForQuote`. The
  flow-aware roll-ups (`sectionStatus`, `readyForQuote`) live in
  [`flow/section-status.js`](../flow/section-status.js) because they need the
  dispatch index and the section list.
- **engine/** — the pure state core. Read, write, reconcile, completeness,
  the four-status roll-up and the persistence ports.

The dependency direction is mechanically checkable: the engine imports zero
`flow/` modules.

```bash
grep -rn "flow/" engine/   # no matches
```

The engine has one flow-shaped need — quote readiness — and it is injected
downward at boot via `configureReadyForQuote` in
[`engine/read.js`](../engine/read.js). The unconfigured default throws, so a
`makeScope` call before boot is a hard, loud failure rather than a silent
wrong answer.

## Boot sequence

The whole journey is one Hapi plugin, [`routes.js`](../routes.js). At
registration it runs, in order:

1. `assertObligationPurity()` — reads every `features/<feature>/obligations.js`
   as source and asserts it imports nothing outward. Only sideways imports of
   another feature's `obligations.js` are allowed. This is the guard that
   co-locating the model beside controllers has not re-coupled it to views or
   requests.
2. `buildDispatch(dispatchPages)` — inverts the page-side `collects`
   declarations and coverage-asserts them: every non-system obligation, at
   every tree depth, must be collected by exactly one page. A forgotten or
   duplicated `collects` is a startup crash, not a silent runtime break.
3. `configureReadyForQuote(readyForQuote)` — hands the flow's readiness
   roll-up into the engine, keeping the engine free of `flow/` imports.
4. `registerJourneyCookie(server)` — defines the journey cookie, path-scoped
   to the spike's base path.
5. `server.route(allRoutes)` — registers every route assembled by
   [`features/index.js`](../features/index.js).

Both guards fail loud. So does the derived-gate seam: a derived gate consulted
before `buildDispatch()` has run throws, because an unbuilt index is
indistinguishable from "this page collects nothing" and would silently gate
every step out.

## Where things live

```
live-animals/
  routes.js               one Hapi plugin: boot guards, cookie, routes
  registry.js             assembling barrel over the feature obligation slices
  obligation-purity.js    per-file model-purity guard (run at boot)
  config.js               shell identity: BASE mount path, template root, breadcrumbs
  dump.js                 headless state dump for an editable fixture
  docs/                   this documentation

  features/               THE SPINE — one vertical slice per feature
    index.js              assembles dispatchPages (collects) + allRoutes
    <feature>/            controller(s), template(s), page.js, obligations.js

  flow/                   sequence and gating
    flow.js               ordered sections -> pages
    gates.js              derived-default / authored-override gate seam
    dispatch.js           obligation -> owning page index, built at boot
    navigation.js         sectionEntry, nextInSection (else back to the hub)
    section-status.js     flow-aware roll-ups: sectionStatus, readyForQuote

  engine/                 the pure state core
    index.js              the facade barrel controllers import (import * as state)
    read.js               get, resume, makeScope (+ configureReadyForQuote)
    write.js              commit, appendEntry(At), updateEntry(At), removeEntry(At), submitJourney
    status.js             the four-status roll-up (engine-pure)
    journey.js            journey-isolation seam: cookie, load-or-create, resume
    store.js              compat shim over the records port (pre-reshape consumers)
    test-support.js       shared fakes for engine and controller specs
    evaluate/             reconcile (scope + wipe), predicate, complete, collection-view
    persistence/          the two ports: records (durable) + session (identity)

  lib/                    context-free helpers: path maths, answered-ness,
                          validate/ (Joi validators), quote.js (premium domain)
  shared/                 kit.js (page library), layout.njk, error-summary.njk
  analysis/               model-level tooling: simulate.js, reachability.js

  *.test.js               spike-root scenario tests that span the whole stack:
                          contract, store-ops, indexed, nested, item-conditional,
                          obligation-purity, t1-currency-persist, t2-hub-copy
```

The root scenario tests earn their place at the root because they cut across
layers. The most important is `contract.test.js`: for each collecting page it
drives the real POST handler and asserts the set of obligation ids the handler
commits equals the page's declared `collects` (minus `renderOnly` and
`system`). It is the safety net that names the file you forgot to wire.

## What survives from v1, and what was dropped

Kept, because it is page-agnostic and the bespoke pages already leaned on it:

- **Scope-exit wipe (the Yes-No-Yes invariant).** Answering yes, filling data,
  then answering no destroys the data — so re-answering yes starts blank.
  Destroyed, not hidden.
- **Activation relationships.** A controlling answer brings other obligations
  into scope. This is the concept the whole state layer exists for.
- **The pure-evaluator / side-effecting-write split.** Evaluation is pure;
  only the write path persists. Keeps state reasoning testable.
- **Nothing derived is stored.** Scope is rebuilt from the answers on every
  read, so a days-later resume self-heals to current scope.
- **The four-status roll-up.** Not applicable / Not started / In progress /
  Fulfilled — exactly what the hub task list and quote gating need.
- **Section grouping.** The journey returns to the hub after each section and
  the hub renders one task per section.

Dropped, because it served the generic engine rather than the journey:

- **UUID identifiers.** With one hand-authored model and no migration story,
  opaque ids are pure overhead. The name is the key.
- **Model-owned copy.** The key inversion: copy, layout and widget choice
  moved into per-page templates and controllers.
- **The generic renderer** (one `page.njk` plus a type-to-widget registry).
  On this journey every interesting page — the claims loop, Check your
  answers, the quote, the hub — had already bypassed it with bespoke code.
  The config engine paid off only on the boring pages.
- **The 21-export contract barrel.** It existed to feed the generic routes.
  Controllers import the small state facade directly.
- **The scope-predicate registry, dotted reason codes, mandate composition
  table and equivalence harness.** Machinery for the paradigm demonstration,
  not the journey. Mandates became ordinary controller validation.
- **The obligation `type` taxonomy and constraint metadata.** A usage trace
  showed no runtime code read them — every widget and value-domain was
  already re-declared page-side. Validation is a controller concern backed by
  [`lib/validate/`](../lib/validate/) (see [validation](validation.md)).

## The honest trade

There is no free rendering and no free Check your answers row. Adding a field
means editing a real template, a real controller and a hand-composed CYA row.
Declaring the obligation buys you only the state-layer behaviour: scope,
wipe, completeness and status.

What you get back: everything is explicit and greppable. There is no
type-to-widget registry to learn, no config schema to satisfy and no generic
engine to bypass the moment a page gets interesting. The cost is more files
per change; the boot assertions and the contract test exist to make each of
those files name itself when you forget one.

For the mechanics, follow the guides: [add a page](add-a-page.md) and
[add a field or obligation](add-a-field.md). For the state layer, see
[scope, reconcile and wipe](scope-and-wipe.md) and
[persistence ports](persistence.md).
