# How to add a set

Use this recipe to add a whole obligation set — a new L3 manifest, a new L4
journey, a new L1 gateway and its own mount prefix — to the co-resident
application. Use [`../sets/live-animals/docs/add-a-page.md`](../sets/live-animals/docs/add-a-page.md),
[`add-a-field.md`](../sets/live-animals/docs/add-a-field.md),
[`add-a-section.md`](../sets/live-animals/docs/add-a-section.md) or
[`add-a-collection.md`](../sets/live-animals/docs/add-a-collection.md) instead
when you are working inside a set that already boots.

This is a platform-level procedure. It changes L1 composition, the URL
namespace, dependency rules, the test matrix and a second repository. Do not
treat any step as optional.

Run every command from the frontend repo root. Paths in this recipe are
relative to `src/server/app/` unless stated otherwise. `<set-id>` is the
kebab-case set id you choose in step 1 — for example `plant-products`.
`<setId>` is the same id in camelCase — `plant-products` gives `plantProducts`.

Set-specific rulings, migration lists and section numbers cited as `§x.y` live
in the set's own plan. For CHED-PP that is
`workareas/shared/plant-products-ched-pp/frontend-plan/SIBLING-SET-PLAN.md` in
the workspace. Cite the plan for the set's domain decisions; do not copy them
here.

## Read these files first

The live-animals set is the only complete worked example. Read it in this
order:

- [`../routes-live-animals.js`](../routes-live-animals.js) — the worked gateway
  body that step 4 reproduces for your set; `routes.js` is now only the gateway
  export barrel
- [`../../router.js`](../../router.js) — where gateways are registered and
  where the server-wide routes live
- [`../sets/live-animals/obligations/index.js`](../sets/live-animals/obligations/index.js)
  — the manifest, and the derived `groups` formula you copy verbatim
- [`../sets/live-animals/journeys/linear/config.js`](../sets/live-animals/journeys/linear/config.js)
  — `TEMPLATES`, `LAYOUT` and the three set-prefixed cookie names
- [`../sets/live-animals/journeys/linear/flow/flow.js`](../sets/live-animals/journeys/linear/flow/flow.js),
  [`task-rows.js`](../sets/live-animals/journeys/linear/flow/task-rows.js),
  [`run.js`](../sets/live-animals/journeys/linear/flow/run.js),
  [`entry-guard.js`](../sets/live-animals/journeys/linear/flow/entry-guard.js)
  — the four flow modules and their exact exports
- [`../sets/live-animals/journeys/linear/features/index.js`](../sets/live-animals/journeys/linear/features/index.js)
  and [`evaluation.js`](../sets/live-animals/journeys/linear/features/evaluation.js)
  — the two registries a gateway reads
- [`../shared/paths.js`](../shared/paths.js) — route-shape builders against
  link builders, the distinction the mount depends on
- [`architecture.md`](architecture.md) — the L1–L4 layering and the boundaries
  Dependency Cruiser enforces
- [`test-ownership.md`](test-ownership.md) — which repository owns which test

## 1. Choose the set name and its mount prefix

Pick one kebab-case set id. It names the `sets/<set-id>/` directory, the Hapi
plugin, the Nunjucks `TEMPLATES` root, the cookie-name prefix, the npm scripts,
the Playwright projects, the dependency-cruiser regexes and the key of every
per-set registry.

**The co-residency contract.** Every set's gateway registers in one Node
process. Both sets are live at the same time, in the same server, for the same
browser. Nothing selects a set at boot. Every `configure*` seam is keyed by set
id, and a request resolves its set from the owning plugin realm — each gateway
installs a realm-scoped `server.ext('onPreAuth', …)` that enters its own set
context, so Hapi's routing decides the set. Never resolve a set by parsing the
URL. (Plan FD-1, FD-14, FD-15.)

Plugin ownership alone does not scope a lifecycle extension: an extension
registered without options is server-wide. Every set-owned lifecycle
extension, including `onPreAuth` context entry and the `onPreHandler` entry
guard, must pass `{ sandbox: 'plugin' }` as the third argument to `server.ext`.
That makes Hapi store it in the plugin realm and apply it only to routes from
that realm.

Authentication and Hapi's payload processing may cross asynchronous boundaries
after `onPreAuth`. Run the gateway's entry-guard call inside
`withSetContext(setId, …)`, and pass every route through
`routeWithSetContext(setId, route)`. That helper wraps both the handler and any
route-owned lifecycle extension, including an `onPreResponse` that handles a
payload error before the handler runs. Those boundary wrappers keep every async
continuation in the owning set without threading set ids through controllers or
parsing URLs. Server-wide routes remain outside every set context.

**The mount prefix is not a choice. It is `'/' + setId`.** Every set mounts
under its own prefix. No set is registered at an empty prefix, and
`registerSetMount` throws if you pass one.
[`../no-set-singletons.test.js`](../no-set-singletons.test.js) fails the build
if a set is registered at `''` or at anything other than `'/' + setId`.

Two reasons, and they are the whole argument:

- The set id is already the key for every other per-set fact — `setKeyed`,
  `withSetContext`, the plugin name, the cookie-name prefix, the
  `sets/<set-id>/` directory, the Nunjucks `TEMPLATES` root, the dep-cruiser
  regexes, the npm scripts and the Playwright project names. Deriving the mount
  from the same id means one fact per set and no mount table to drift out of
  step with the routes.
- With every set prefixed, a doubled prefix and a dropped prefix both fail
  visibly on the first request. If one set sat at the server root, both bugs
  would produce the same correct-looking string for that set and stay hidden.

Two consequences follow, and you must plan for them now rather than discover
them later:

- **`/` belongs to no set.** It is a server-wide 302 — never a 301 — to the
  default set's dashboard. Declare it with `server.route` in
  [`../../router.js`](../../router.js), behind a single `DEFAULT_SET_BASE`
  constant, outside every gateway. It therefore never enters a set context and
  never appears in any set's `allRoutes`. (Plan FD-18.)
- **`/health`, `/signout`, the `/auth/*` OIDC routes and the static-asset route
  (`${assetPath}/{param*}`) are server-wide.** They must never sit inside a
  prefixed `server.register` call. Signout is the live trap: it registers
  perfectly well at `/<set-id>/signout` and nothing fails until a user tries to
  sign out. Give it its own unprefixed register call and its own assertion.
  (Plan FD-19.)

The resulting mount table, with two sets in the tree:

| Set            | Prefix            | Dashboard         | Create                          | Hub                                         | Page                                               |
| -------------- | ----------------- | ----------------- | ------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| live-animals   | `/live-animals`   | `/live-animals`   | `/live-animals/notifications`   | `/live-animals/notifications/{journeyId}`   | `/live-animals/notifications/{journeyId}/{slug}`   |
| plant-products | `/plant-products` | `/plant-products` | `/plant-products/notifications` | `/plant-products/notifications/{journeyId}` | `/plant-products/notifications/{journeyId}/{slug}` |

Route shapes are declared prefix-free and are byte-identical between sets;
Hapi's `routes.prefix` supplies the mount. A route registered as `/` under
prefix `/<set-id>` is served at `/<set-id>`, with no trailing slash.

That is why [`../shared/paths.js`](../shared/paths.js) has two families of
export, and why confusing them is the bug this step exists to prevent:

- **Route-shape builders** — `pageRoutePath(slug)`, `hubRoutePath()`,
  `dashboardRoutePath()`, `createRoutePath()`. Evaluated at module load, when
  controllers build their route tables and long before any set context exists.
  They are prefix-free.
- **Link builders** — `pagePath(journeyId, slug)`, `hubPath(journeyId)`,
  `dashboardPath()`, `createPath()`, `breadcrumbs(journeyId, title)`. Evaluated
  per request, so they carry the prefix via `setBase()`, which reads
  `currentSetBase()`.

Use a link builder in a route table and every URL loses its prefix. Use a route
builder in a template and every link does. Both fail visibly under symmetric
mounts, which is the point.

[`../shared/set-context.test.js`](../shared/set-context.test.js) rejects an
empty or non-absolute mount, while [`../shared/paths.test.js`](../shared/paths.test.js)
proves the symmetric live-animals and plant-products URL shapes in one process.
Read both before you choose a name, not after.

Cite plan §4.3 for the mount scheme and the rejected alternatives, and §4.6 for
the enumerated migration a mount change costs an existing set.

## 2. Create the L3 skeleton

Create `sets/<set-id>/obligations/index.js`. At this stage it holds no
obligations and exports three things:

```js
export const obligations = []

export const groups = obligations.filter((obligation) =>
  obligations.some((other) => other.within === obligation)
)

export const policy = {
  systemPopulated: [],
  enforcedAtContinue: [],
  maxEntriesFrom: {},
  systemAnswerKeys: ['referenceNumber']
}
```

Copy the `groups` formula verbatim from
[`../sets/live-animals/obligations/index.js`](../sets/live-animals/obligations/index.js).
It is derived from `obligations`; never hand-maintain the list.

`policy` is the set's own obligation-source vocabulary, injected through
[`configureObligationSet()`](../model/obligations/manifest.js). It is how the
platform stays free of one set's obligation names.

Obligation names are camelCase and path-safe. A name containing a dot or a
bracket makes [`buildDispatch()`](../flow/dispatch.js) throw at boot.
Obligations carry no display text — no labels, no hints, no titles. Copy lives
in the feature's `.njk` and `copy/` files.

Add `sets/<set-id>/obligations/sections/` as an empty directory. Section files
land with the increments that need them. Git does not track an empty directory,
so do not add a placeholder file solely to represent it; the directory enters
the repository with its first section module.

Add `sets/<set-id>/obligations/coverage.test.js` by transposing the
live-animals structural suite
([`../sets/live-animals/obligations/coverage.test.js`](../sets/live-animals/obligations/coverage.test.js)).
It is trivially green on an empty manifest, which is the point: it is green
from the first commit and stays green.

## 3. Create the L4 skeleton

Create `sets/<set-id>/journeys/linear/`. Each file below must export exactly
the names listed, or [`configureJourneyFlow()`](../flow/journey-flow.js) and
[`buildDispatch()`](../flow/dispatch.js) reject it at boot.

`config.js` — `TEMPLATES`, `LAYOUT`, `SESSION_COOKIE_NAMES`:

```js
export const TEMPLATES = '<set-id>/journeys/linear'
export const LAYOUT = 'shared/layout.njk'

export const SESSION_COOKIE_NAMES = {
  knownJourneys: '<setId>KnownJourneys',
  openingRun: '<setId>OpeningRun',
  flowOnlyAnswers: '<setId>FlowOnlyAnswers'
}
```

`TEMPLATES` is prefixed because journey views resolve from the
`src/server/app/sets` Nunjucks root. `LAYOUT` is unprefixed because
`shared/layout.njk` resolves from the `src/server/app` root. Both roots are
already configured; you do not edit the Nunjucks config.

The three cookie names are load-bearing, not cosmetic. Under co-residency both
sets' cookies are live in the same browser at the same time, so a shared name
would let one set read the other's session. Compare
[`../sets/live-animals/journeys/linear/config.js`](../sets/live-animals/journeys/linear/config.js),
whose names are `liveAnimalsKnownJourneys`, `liveAnimalsOpeningRun` and
`liveAnimalsFlowOnlyAnswers`.

`flow/flow.js` — `FLOW_ONLY_KEYS`, `sections`, and the derived `allFlowPages`,
`sectionOfPage` and `answerSections`. Copy the derivation formulas from
[`../sets/live-animals/journeys/linear/flow/flow.js`](../sets/live-animals/journeys/linear/flow/flow.js).
Open `sections` with a `start` section holding the dashboard page and the entry
filter page; `start` is a flow section, not a hub spoke.

`flow/task-rows.js` — `taskRows` (empty at this stage) and
`rowStatus(row, answers, inScope, evaluation)`, delegating to the L2 bridge
status ([`../bridge/status/index.js`](../bridge/status/index.js)) exactly as
live-animals does.

`flow/run.js` — `RUN_STEPS` and `nextRunTarget(stepId, scope, journeyId)`.

`flow/entry-guard.js` — `entryGuardTarget(request, h)`.

`features/index.js` — `dispatchPages` and `allRoutes`.

`features/evaluation.js` — `featureEvaluationBindings = Object.freeze([])`. It
gains one `feature()` binding per feature area as pages land.

## 4. Write the L1 gateway

Create `routes-<set-id>.js` at the `src/server/app/` root. It exports one Hapi
plugin whose name is the set id. Reproduce
[`../routes-live-animals.js`](../routes-live-animals.js)'s body call for call,
omitting only the explicitly optional set-owned seams below. **The order is
load-bearing**: mount → context → config → assertions → dispatch → persistence
→ cookies → guard → priming → routes.

| #   | Call                                                                                                                                                         | Notes                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 0   | `registerSetMount(setId, '/' + setId)`, then `server.ext('onPreAuth', (request, h) => { enterSetContext(setId); return h.continue }, { sandbox: 'plugin' })` | Write the mount that way, so the symmetry lives in the code and not in a convention                  |
| 1   | `configureObligationSet(setId, obligationSet)`                                                                                                               | Namespace import of `sets/<set-id>/obligations/index.js` — carries `obligations`, `groups`, `policy` |
| 2   | `configureFulfilmentRegistry(setId, featureEvaluationBindings)`                                                                                              | From `features/evaluation.js`                                                                        |
| 3   | `configureJourneyFlow(setId, { sections, taskRows, rowStatus, nextRunTarget, flowOnlyKeys: FLOW_ONLY_KEYS, entryGuardTarget, layout: LAYOUT })`              | From the four `flow/` modules plus `config.js`                                                       |
| 4   | `assertObligationPurity()`                                                                                                                                   | Boot gate; reads the active set context                                                              |
| 5   | `assertFulfilmentBindingCoverage()`                                                                                                                          | Boot gate; reads the active set context                                                              |
| 6   | `buildDispatch(setId, dispatchPages)`                                                                                                                        | From `features/index.js`                                                                             |
| 7   | `configureRecords(setId, records)`                                                                                                                           | The set-owned records impl of step 8                                                                 |
| 8   | `configureSession(setId, session, SESSION_COOKIE_NAMES)`                                                                                                     | L2 session impl, set-owned cookie names                                                              |
| 9   | `registerJourneyCookie(server, { base: '/' + setId, cookieNames: SESSION_COOKIE_NAMES })`                                                                    | Path-scopes the three session cookies to the set's own subtree                                       |
| 10  | `server.ext('onPreHandler', …, { sandbox: 'plugin' })` entry-guard wrapper                                                                                   | Sandbox it, and call the injected guard inside `withSetContext(setId, …)`                            |
| 11  | `server.route(allRoutes.map((route) => routeWithSetContext(setId, route)))`                                                                                  | Keep paths prefix-free; wrap handlers and route lifecycle extensions across Hapi's async boundaries  |

Wrap the whole register body in
`await withSetContext(setId, async () => { … })`. `assertObligationPurity()`,
`assertFulfilmentBindingCoverage()` and `buildDispatch()` read through
`currentSetId()` but run outside any request, so without the wrapper they have
no context to read.

`setId` is the first argument of `configureObligationSet`,
`configureFulfilmentRegistry`, `configureJourneyFlow`, `buildDispatch`,
`configureRecords` and `configureSession`. Read accessors keep their existing
signatures and resolve through `currentSetId()`; you change no read call site.
[`../no-set-singletons.test.js`](../no-set-singletons.test.js) enforces this for
every `configure*` set seam with an allow-list that is empty by design. A new
seam that cannot take `setId` is a co-residency decision to raise, not a test to
exempt.

Write `registerJourneyCookie(server, { base: '/' + setId, cookieNames })` with
the derivation visible for the same reason as the mount: one fact per set. Each
set's three cookies are then scoped to its own subtree and one set's draft is
invisible to another.

Two seams are optional:

- `configureCommodityReference` — its only consumer is the L2 live-animals
  notification mapper
  ([`../services/persistence/records/notification-mapper/commodity-reference.js`](../services/persistence/records/notification-mapper/commodity-reference.js)).
  A set that owns its own records service never calls it, and its slot is
  provably absent rather than overwritten. Assert the absence; do not fill the
  slot to keep a symmetry that means nothing.
- Reference-data priming — `countries.prime()` and `ports.prime()` are
  live-animals-mode machinery. A fixture-backed set primes nothing.

The keyed-seam cases in [`../shared/seam-keying.test.js`](../shared/seam-keying.test.js)
and the mount/path cases above are the tripwires for this file. Read them before
you write the gateway, so you meet both rules first time.

## 5. Register the gateway

Add the export to the `routes.js` barrel:

```js
export { liveAnimals } from './routes-live-animals.js'
export { plantProducts } from './routes-plant-products.js'
```

Then register it in [`../../router.js`](../../router.js). This is the whole
block, not just the line you are adding:

```js
import { liveAnimals, plantProducts } from './app/routes.js'

const DEFAULT_SET_BASE = '/live-animals'

// …

await server.register(liveAnimals, { routes: { prefix: '/live-animals' } })
await server.register(plantProducts, { routes: { prefix: '/plant-products' } })

if (authEnabled) {
  await server.register([signout])
}

server.route({
  method: 'GET',
  path: '/',
  handler: (_request, h) => h.redirect(DEFAULT_SET_BASE)
})
```

Each part is the way it is for a reason:

- **One prefixed register call per set.** `routes.prefix` applies to a whole
  `server.register` call, so two sets can never share one.
- **`signout` is not in an array with a set gateway.** Put it there and
  `/signout` silently becomes `/<set-id>/signout`. Nothing fails until a user
  signs out.
- **The `/` redirect uses `server.route`, not a gateway.** It stays out of every
  set context and out of every set's `allRoutes`.
- **`DEFAULT_SET_BASE` is a named constant**, so changing the default set is a
  one-line edit rather than a hunt for a repeated literal.

## 6. Edit dependency-cruiser

In [`../../../../.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs):

- add `^${APP}/routes-<set-id>\.js$` to the `routes-is-the-gateway` rule's
  `pathNot` allowlist, so the new gateway may import `sets/**`
- add the same file to the `sets-not-l1` rule's forbidden-target list, so no set
  can import any `routes-*.js`

These are both required by the completed add-a-set procedure, but a planned
multi-increment scaffold may split them: the new gateway's `pathNot` entry must
land with the gateway so architecture lint can pass, while a separately-owned
convention-harness increment may widen `sets-not-l1` and carry its deliberate
violation probe. Record that split in the set charter; never silently omit the
second half or regenerate the known-violations baseline.

Do **not** regenerate `.dependency-cruiser-known-violations.json` to absorb
anything. The baseline records existing debt; a new file that needs a new
violation is a design error, not a baseline entry.

Verify with `npm run lint:arch`, and prove the rule bites by adding a
deliberate import from your set to a gateway file, watching it fail, then
removing it.

## 7. Add the test scaffolding

In the frontend repo:

- **Set-scoped Vitest script.** Add a `test:<set-id>` script to `package.json`,
  beside `test:live-animals`, running Vitest over `src/server/app/sets/<set-id>`
  with `--no-coverage`. This is the fast inner-loop command for every later
  increment on the set.
- **Per-set Playwright project.** Add a project to
  [`../../../../playwright.config.js`](../../../../playwright.config.js) named
  `features-<set-id>`, with `testDir` pointing at
  `./src/server/app/sets/<set-id>/journeys/linear/features`,
  `testMatch: '**/*.e2e.spec.js'`, and the same `use` block as the existing
  `features` project. The specs navigate under the set's own prefix. Add the
  set's mode variable to the shared `webServer` env block so both sets run on
  their stubs in one server process. Add `test:features:<set-id>` and
  `test:features:all` npm scripts — the second runs both projects against one
  server and is the E2E-level co-residency proof. The generic Vitest exclusion
  means a set's co-located `*.e2e.spec.js` files run nowhere until a Playwright
  project collects that set's feature directory.
- **Vitest discovery boundary.** Keep the co-located Playwright files out of
  Vitest with one set-generic exclusion:
  `src/server/app/sets/*/journeys/linear/features/**/*.e2e.spec.js`. A
  live-animals-only exclusion makes `npm test` execute a new set's Playwright
  specs with the wrong runner before its Playwright project even exists.
- **Cloned app-root suites.** Clone the set-composing suites as
  `*.<set-id>.test.js`: [`../contract.test.js`](../contract.test.js),
  [`../routes.test.js`](../routes.test.js),
  [`../indexed.test.js`](../indexed.test.js),
  [`../store-ops.test.js`](../store-ops.test.js) and
  [`../one-load-per-request.test.js`](../one-load-per-request.test.js) only if
  the new set path executes the L2 real-records adapter against the endpoints
  that suite mocks. Global setup mounts live-animals, so `currentSetId()` does
  not fall back to the set a clone composes. Each clone must enter its own set
  context in its hooks, then read as the original with the set swapped.
- **Empty contract table.** `contract.<set-id>.test.js` lands with the harness
  and zero cases. The table is manual: a controller absent from it does not fail
  the suite, so every later collecting controller must add its own valid-POST
  case.
- **Parameterised convention tests.** [`../copy-convention.test.js`](../copy-convention.test.js)
  and [`../copy-parity.test.js`](../copy-parity.test.js) walk the filesystem and
  loop over set roots in-file. Add the new root to both, so the set gets copy
  completeness and English/Welsh parity enforcement from its first `.njk`.
- **Load-bearing cases in `src/server/app/co-residency.test.js`.** Keep its
  production `router` composition and any foreign-realm probe. On one booted
  server, prove: set-specific dashboard content at both mounts; divergent
  manifest policy through the same accessors; distinct cookie names and mount
  paths; one set's guard never runs in the other realm; a genuinely interleaved
  request pair retains both contexts; records modes remain independent; and
  live-only priming runs once. A two-server comparison is not co-residency
  evidence. Never register a gateway separately in this test after adding it to
  `router.js`, because that creates duplicate routes.

**Then cross the repo boundary. A set is not done when its in-repo tests
pass.** The in-repo `*.e2e.spec.js` suites run against a self-hosted server on
the records stub. Only `repos/trade-imports-animals-tests` runs the same
journeys against the real workspace stack — real backend, real Mongo, real
OIDC. In that repo, **on the same branch name as the frontend work** — the
workspace CLAUDE.md rule 2 requires cross-repo branches to share a name, so cut
that branch there before you edit anything — add:

- page objects under `page-objects/<set-id>/`, extending the set-aware
  `NotificationPage` and taking the set's base from `page-objects/base/sets.ts`
  — the one place a prefix is written down in that repo
- a flow under `flows/<set-id>/`
- per-set specs under `tests/a11y/<set-id>/`, `tests/e2e/features/<set-id>/`,
  `tests/e2e/pages/<set-id>/` and `tests/e2e/journeys/<set-id>/`
- a Playwright project `frontend-<set-id>-chromium` in
  `utils/playwright/shared-config.ts`, `testMatch`-scoped to that subtree and
  mapped to the **same** frontend base URL as every other set

The base URL is host-only. A set-prefixed base URL breaks `/signout`,
`/health`, the static assets and the OIDC callback, and makes every other set
unreachable from that project. The prefix belongs in `page-objects/base/sets.ts`
and nowhere else.

Add the new project name to every `playwright.*.config.ts` project list, to the
`package.json` script flags, and to the CI workflows. Miss one and CI silently
stops running a whole set.

Plan §10 owns this half in detail, and §10.2 gives the layer-by-layer ruling on
what to parameterise and what to clone: one set-aware URL layer, two of
everything above it.

## 8. Stand up the set services

Create `sets/<set-id>/services/`.

`mode.js` — export `mode()` reading `<SET_ID>_MODE` (`stub` or `real`,
defaulting to `real`) and `isRealMode()`. Mirror
[`../services/mode.js`](../services/mode.js).

`records/` — the set's own persistence adapter, injected through
`configureRecords`. It satisfies the engine port pinned by
[`../engine/persistence/records.js`](../engine/persistence/records.js). Write
`index.js` (stub or real switch on `mode()`), `real.js`, `stub.js` and
`mapper/{to-dto.js,from-dto.js}`.

When the first bootable scaffold deliberately lands before its backend
adapter, the scaffold may contain only `index.js` and `stub.js`: every operation
in real mode must throw a named follow-up error. Never let missing real mode
silently select the stub. Add `real.js` and the mapper in the recorded adapter
increment before real-mode delivery.

The port is eleven operations. Map each one to the set's own backend surface,
base `/<set-id>/notifications`:

| Engine port op      | HTTP call                                                                                                                                                                                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`            | `POST /<set-id>/notifications` — blank reference; 201 body carries the minted ref                                                                                                                                                                           |
| `load`              | `GET /<set-id>/notifications/{ref}`                                                                                                                                                                                                                         |
| `list`              | `GET /<set-id>/notifications?page&sort&referenceNumber` — 1-based page                                                                                                                                                                                      |
| `has`               | `GET …/{ref}` — 200 true, 404 false                                                                                                                                                                                                                         |
| `replaceFulfilment` | `PUT /<set-id>/notifications/{ref}` — whole document, plus any sub-resource projection. If the shipped controller requires the body reference to match the path, add it at this transport boundary after mapping; keep it out of the answers-to-DTO mapper. |
| `finalise`          | `PUT …/{ref}/status` `{ status: 'SUBMITTED' }`                                                                                                                                                                                                              |
| `amend`             | `PUT …/{ref}/status` `{ status: 'AMEND' }`                                                                                                                                                                                                                  |
| `cancelAmend`       | `PUT …/{ref}/status` `{ status: 'SUBMITTED', discardChanges: true }`                                                                                                                                                                                        |
| `copy`              | `POST …/{ref}/copies` with an `Idempotency-Key` header — 201, new draft, new ref                                                                                                                                                                            |
| `softDelete`        | `PUT …/{ref}/status` `{ status: 'DELETED' }` — idempotent                                                                                                                                                                                                   |
| `clear`             | Stub-only test hook; the real impl throws                                                                                                                                                                                                                   |

**The `Idempotency-Key` contract for `copy` is mandatory and must be in place
before the set ships a Copy button.** The engine port already carries the key —
`copyJourney(request, h, journeyId, idempotencyKey)` in
[`../engine/journey.js`](../engine/journey.js). The set supplies it end to end:

1. Mint a `randomUUID()` per **rendered** copy action, not per request and not
   per process. Live-animals does this in
   [`../sets/live-animals/journeys/linear/features/dashboard/view-model/row/actions.js`](../sets/live-animals/journeys/linear/features/dashboard/view-model/row/actions.js)
   and in its check-answers controller.
2. Carry it in a hidden input named `idempotencyKey`.
3. Send it as the `Idempotency-Key` request header from `real.js`. The
   live-animals equivalent is
   [`../services/persistence/records/real/lifecycle/create.js`](../services/persistence/records/real/lifecycle/create.js).
4. Mirror it in `stub.js` with a dedupe key, so the stub has the same
   semantics.
5. Pin it with records-port contract tests against the backend's shipped index
   semantics. The current plant-products and live-animals backends use a unique
   partial index on `copyIdempotencyKey` alone, so one key identifies one copy
   globally: repeating it against the same or a different source returns the
   existing copy. Callers avoid accidental cross-source reuse by minting a new
   UUID per rendered copy action.

`stub.js` is an in-memory store with the same semantics as `real.js`, including
status-transition legality, so the self-hosted Playwright ladder needs no
backend.

`reference/` — one fixture module per vocabulary the set needs. Each exports an
options array and a label-for-code lookup. Fixture-backed reference data needs
no priming, which is why the gateway's priming step is absent.

**Mapper omission discipline.** A field with no home in the backend payload
gets an explicit omission assertion in `mapper.test.js`. Never invent a payload
property to give a field somewhere to go.

## 9. Build the minimum usable surfaces

The set is usable when four things exist. Transpose each from the live-animals
feature of the same name, file for file:

- **Dashboard** — lists the signed-in user's notifications for this set, from
  the records service.
- **Hub** — the task list, plus its `GROUPS` export placing each row id under a
  numbered caption, with matching English and Welsh copy.
- **Entry filter** — the pre-journey page that establishes what kind of
  notification this is. Its controller meta collects the flow-only key so
  dispatch owns the page, while the key remains absent from the obligation
  manifest and persists through the flow-only session store.
- **Entry-guard policy** — `entryGuardTarget` in `flow/entry-guard.js`,
  redirecting a fresh deep link to the entry filter.

Derive the entry guard's journey prefix from a **function**, never a
module-load constant:

```js
const journeyPrefix = () => `${setBase()}/notifications/`
```

A module-load constant is captured before any set context exists, so it
resolves to the wrong prefix or to nothing. This is the live-animals
`JOURNEY_PREFIX` bug class, and it fails silently: the guard's `startsWith`
test and its `slice` length both go wrong together, and the deep-link guard is
quietly disabled rather than throwing.

## 10. Verify — the two-sided, co-residency ladder

The bar is not "the new set is green". **Every set already in the tree and the
new set must serve correctly from one running process**, proven in this
repository by `co-residency.test.js` and `test:features:all`, and across the
repo boundary by the tests-repo suite against the real stack.

The earlier bar — "the new set is green and the default set is unchanged under
its own environment" — is retired. It cannot be stated under co-residency,
because there is no per-set environment and no boot-time set selection.

Take a baseline before you edit anything. For the first scaffold, the new
set-scoped script does not exist yet, so use the existing set's fast suite (for
example `npm run test:live-animals`). Once step 7's script exists, later
increments use:

```bash
npm run test:<set-id>
```

Then, in order:

```bash
npm run test:live-animals
npm run test:<set-id>
npm test
npm run lint
npm run lint:arch
npx playwright test --project=features --list
npx playwright test --project=features-<set-id> --list
PORT=3050 npm run test:features
PORT=3050 npm run test:features:<set-id>
PORT=3050 npm run test:features:all
PORT=3050 npm run test:e2e
npm run format
```

`co-residency.test.js` must be green and must have gained a case for the new
set covering:

- `GET /<set-id>` serves the new set's dashboard
- `GET /` still 302s to the default set
- `/signout`, `/health` and the static-asset route still resolve unprefixed now
  that another prefixed register call exists

**Then the tests-repo leg. It is part of the ladder, not an optional extra.**
In `repos/trade-imports-animals-tests`, on the same branch name as the frontend
work (workspace CLAUDE.md rule 2 again), against a co-resident workspace stack:

```bash
npm run test:live-animals
npm run test:<set-id>
```

Then run the full suite. Run every one of these through the repo's own npm
scripts, never a hand-assembled Playwright invocation — the scripts carry the
config, projects and environment the raw command skips.

Finally, list the projects from each Playwright config the repo runs
(`playwright test --list`, via the repo's script). Both frontend projects must
appear in every config. A project that is defined but missing from the config
CI runs is a project CI does not run.

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.

## What this recipe does not cover

Each of these has no recipe anywhere in the corpus. Plan for them explicitly;
do not assume this file covers them.

- **Depth-3 nested collections.** The add-a-collection exemplar is depth 2. A
  third `within` level needs grouped-binding arrays of length 3, parent-index
  validation at two levels before any write, and a characterisation test before
  the first page is built.
- **Creating a hub from scratch.** add-a-section assumes an existing hub and
  adds a row id to `GROUPS`. Building `features/hub/` needs the `GROUPS` shape,
  numbered captions in both locales, the row title and hint copy contract,
  conditional-row hide semantics and the review-spoke unlock wiring.
- **Creating check-answers from scratch.** The recipes extend existing cards.
  Building `features/check-answers/` needs the view-model and cards directory
  contract, obligation-name resolution through dispatch for Change links,
  scope-driven row omission, and the review to declaration to confirmation exit
  spine.
- **Flow-only keys.** Keys that ride the session rather than the manifest have
  recipe fragments but no end-to-end script from key to session store to entry
  filter behaviour to finalise-time inclusion.
- **A CSV or bulk-upload branch.** An alternate collection surface over the same
  obligations has no live exemplar at all.
- **Moving an existing set's mount.** Migrating a live service's URLs is a
  procedure in its own right — telling a route shape from a link, front-anchoring
  every URL regex in every spec, hoisting the server-wide routes, and the cookie
  path consequence. Plan §4.6 is that procedure for the live-animals migration;
  a general recipe does not exist.
- **Authoring cross-repo E2E coverage.** Step 7 states what
  `repos/trade-imports-animals-tests` must gain and plan §10 details it, but that
  repository has no recipe of its own.
