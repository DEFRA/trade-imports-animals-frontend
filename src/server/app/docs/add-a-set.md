# How to add a set

A **set** is one whole obligation set: an L3 manifest, an L4 journey, an L1
gateway and its own mount prefix. This is the recipe for adding one alongside
the sets already running.

Use it only when you are adding a whole set. To work inside a set that already
boots, use that set's own recipes under `sets/<set-id>/docs/` instead.

This is a platform-level procedure. It changes L1 composition, the URL
namespace, the dependency rules, the test matrix and — because the URLs move —
the `trade-imports-animals-tests` repository. No step here is optional.

Paths are relative to `src/server/app/` unless stated otherwise. `<set-id>` is
the kebab-case id you choose in step 1.

## Read these first

`live-animals` is the worked example. Read it in this order:

- [`../routes-live-animals.js`](../routes-live-animals.js) — the gateway body
  step 4 reproduces for your set. [`../routes.js`](../routes.js) is only the
  export barrel.
- [`../../router.js`](../../router.js) — where gateways are mounted and where
  the server-wide routes live.
- [`../sets/live-animals/set.js`](../sets/live-animals/set.js) — the set's
  identity, kept apart from its gateway.
- [`../shared/set-context.js`](../shared/set-context.js) — how a request
  resolves its set.
- [`../shared/paths.js`](../shared/paths.js) — route-shape builders against
  link builders. The mount depends on that distinction.
- [`architecture.md`](architecture.md) — the L1–L4 layering Dependency Cruiser
  enforces.

## The co-residency contract

Every gateway registers into one Node process. All sets are live at the same
time, in the same server, for the same browser. Nothing selects a set at boot.

Four rules hold that together. Breaking any of them is silent while one set is
mounted and only surfaces when a second arrives, which is why each is pinned by
[`../no-set-singletons.test.js`](../no-set-singletons.test.js) and
[`../co-residency.test.js`](../co-residency.test.js).

**1. Every `configure*` seam takes the set id first.** Each stores its value
per set behind `setKeyed`, and each read accessor resolves through
`currentSetId()`. A seam that kept one module-level variable would let the
second registration overwrite the first. The nine seams are
`configureObligationSet`, `configureFulfilmentRegistry`,
`configureCommodityReference`, `configureAnswersForRead`,
`configureReadyForCheckYourAnswers`, `configureJourneyFlow`, `buildDispatch`,
`configureRecords` and `configureSession`.

**2. A request resolves its set from the owning plugin realm, never from the
URL.** Each gateway installs an `onPreAuth` extension that calls
`enterSetContext(setId)`, so Hapi's own routing decides the set. Do not parse
the path to work out which set you are in.

**3. Every set-owned lifecycle extension passes `{ sandbox: 'plugin' }`.**
Plugin ownership alone does **not** scope an extension. An extension registered
without that option is server-wide and runs on every other set's routes, and
the last registration wins. This applies to the `onPreAuth` context entry and
to the `onPreHandler` entry guard alike.

**4. Async boundaries are wrapped.** Authentication and payload processing
cross asynchronous boundaries after `onPreAuth`. Run the gateway's registration
inside `withSetContext(setId, …)` and pass every route through
`routeWithSetContext(setId, route)`, which wraps the handler and any
route-owned lifecycle extension. Server-wide routes stay outside every set
context.

## The mount prefix is not a choice

**It is `'/' + setId`.** Every set mounts under its own prefix, and no set is
registered at the root. `registerSetMount` throws on an empty prefix.

Two reasons, and they are the whole argument:

- The set id is already the key for every other per-set fact — `setKeyed`, the
  plugin name, the cookie names, the `sets/<set-id>/` directory, the Nunjucks
  `TEMPLATES` root. Deriving the mount from the same id means one fact per set
  and no mount table to drift out of step with the routes.
- With every set prefixed, a doubled prefix and a dropped prefix both fail
  visibly on the first request. If one set sat at the root, both bugs would
  produce the same correct-looking string for that set and stay hidden until
  somebody opened another set.

Two consequences follow:

- **`/` belongs to no set.** It is a server-wide 302 — never a 301 — to
  `DEFAULT_SET_BASE`, declared with `server.route` in
  [`../../router.js`](../../router.js), outside every gateway. It takes the
  server's default auth strategy, so signing in with no stored redirect lands
  on the default set's dashboard.
- **`/health`, the `/auth/*` routes (including `/auth/sign-out`) and the
  static-asset route are server-wide.** They must never sit inside a prefixed
  `server.register` call. `/auth/sign-out` is the live trap: it registers
  perfectly happily at `/<set-id>/auth/sign-out` and nothing fails until a user
  tries to sign out.

The resulting mount table with two sets in the tree:

| Set            | Dashboard       | Create                        | Hub                                       | Page                                             |
| -------------- | --------------- | ----------------------------- | ----------------------------------------- | ------------------------------------------------ |
| `live-animals` | `/live-animals` | `/live-animals/notifications` | `/live-animals/notifications/{journeyId}` | `/live-animals/notifications/{journeyId}/{slug}` |
| `<set-id>`     | `/<set-id>`     | `/<set-id>/notifications`     | `/<set-id>/notifications/{journeyId}`     | `/<set-id>/notifications/{journeyId}/{slug}`     |

## Route builders against link builders

[`../shared/paths.js`](../shared/paths.js) exports two families, and using one
where the other belongs is the defect this split exists to prevent.

| Family       | Members                                                                  | Carries the prefix?                     | Evaluated                                                |
| ------------ | ------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| Route shapes | `dashboardRoutePath`, `createRoutePath`, `hubRoutePath`, `pageRoutePath` | No — Hapi's `routes.prefix` supplies it | At module load, when a controller builds its route table |
| Links        | `dashboardPath`, `createPath`, `hubPath`, `pagePath`                     | Yes, from `setBase()`                   | Per request, inside the set context                      |

A link builder used as a route shape gives Hapi a path that already carries the
prefix, which Hapi then prefixes again. A route builder used as a link drops
the prefix. Both now fail on the first request.

Anything that reads `request.path` sees the prefix too. Derive such a prefix
from a function, not a module-load constant — see
`sets/live-animals/journeys/linear/flow/entry-guard.js`.

## 1. Choose the set id

Pick one kebab-case id. It names the `sets/<set-id>/` directory, the Hapi
plugin, the Nunjucks `TEMPLATES` root, the cookie-name prefix and the mount.

## 2. Declare the set's identity

Create `sets/<set-id>/set.js`, mirroring
[`../sets/live-animals/set.js`](../sets/live-animals/set.js):

```js
export const SET_ID = '<set-id>'
export const SET_BASE = `/${SET_ID}`
```

It is kept apart from the gateway so the router, the gateway and the tests can
name the set without importing the whole composition root.

## 3. Build the set's own layers

Create `sets/<set-id>/` with its obligations manifest, its journey config, its
flow modules and its features, following the `live-animals` tree. Its cookie
names must be its own — all four of them. The prefix is the camelCase form of
the kebab-case `<set-id>` from step 1, so `live-animals` gives
`liveAnimalsKnownJourneys`. The shipped values are in
[`../sets/live-animals/journeys/linear/config.js`](../sets/live-animals/journeys/linear/config.js):

```js
export const SESSION_COOKIE_NAMES = {
  knownJourneys: 'liveAnimalsKnownJourneys',
  openingRun: 'liveAnimalsOpeningRun',
  flowOnlyAnswers: 'liveAnimalsFlowOnlyAnswers',
  addressHandshakeTokens: 'liveAnimalsAddressHandshakeTokens'
}
```

Two sets sharing a cookie name would share the draft list behind it.

## 4. Write the gateway

Create `routes-<set-id>.js` following
[`../routes-live-animals.js`](../routes-live-animals.js) exactly: register the
mount, open the set context, install the sandboxed `onPreAuth`, configure every
seam this set uses with `SET_ID` first, register the journey cookies, install
the sandboxed entry guard, and wrap every route.

Then re-export it from [`../routes.js`](../routes.js), which is only a barrel.

`registerJourneyCookie(server)` takes neither a base nor cookie names: it reads
the path back from the registered mount and the names back from the configured
session seam, so the cookies Hapi registers and the ones the set actually uses
cannot drift apart. Call it inside the set context, after `registerSetMount`
and `configureSession` — it throws if the session seam is not configured yet.

## 5. Mount it

In [`../../router.js`](../../router.js):

```js
await server.register(yourSet, { routes: { prefix: YOUR_SET_BASE } })
```

Leave the server-wide routes where they are. Do not move `/` — it stays a 302
to `DEFAULT_SET_BASE`.

## 6. Check the dependency rules

`routes-<set-id>.js` is matched by the existing `routes-[a-z0-9-]+\.js`
alternatives in both rules that name the gateways in `.dependency-cruiser.cjs` —
`routes-is-the-gateway`, which lets a gateway import `sets/**`, and
`sets-not-l1`, which stops a set importing a gateway back. A conventionally
named gateway needs no change to either. Run `npm run lint:arch` and leave
`.dependency-cruiser-known-violations.json` untouched.

## 7. Prove it

`npm test` runs both co-residency suites. They read your gateway's source and
boot the real router, so a set wired wrongly fails here rather than in
production:

- [`../no-set-singletons.test.js`](../no-set-singletons.test.js) checks every
  gateway for setId-first seams, the mount registration, the `withSetContext`
  wrapper, the sandboxed extensions, the route wrapping and the cookie base.
- [`../co-residency.test.js`](../co-residency.test.js) boots the production
  router with a second set and checks that each set answers with its own
  configuration, that interleaved requests keep their own set, that cookies are
  scoped per set, and that the server-wide surface stays unprefixed.

The second set in those suites is `test/fixtures/second-set.js`, a fixture
rather than a real journey. If you are adding a real set, the fixture stays:
the suites are about the platform, not about any one set.

Do **not** register your set in `test/setup-obligation-set.js`, the vitest
global setup file. That file mounts exactly one set, and the whole unit suite
leans on that: with one mount, `shared/set-context.js`'s `soleSetId()` fallback
resolves `currentSetId()` for a test that never enters a request's context. A
second mount there retires the fallback and makes `currentSetId()` throw across
the suite.

Your set's own unit tests mount their set and enter its context themselves, the
way [`../co-residency.test.js`](../co-residency.test.js) does —
`registerSetMount(SET_ID, SET_BASE)` in the suite, then `withSetContext(SET_ID,
...)` around anything that resolves set-owned configuration.

## 8. Add the set to the test matrix

Three config files name each set's directories literally, so a new set has to be
added to each by hand:

- `playwright.config.js` — a per-set project whose `testDir` is that set's
  features directory (today
  `./src/server/app/sets/live-animals/journeys/linear/features`). Skip it and
  Playwright never discovers your set's `.fit.spec.js` files, so the suite goes
  green having run none of them.
- `vitest.config.js` — a per-set `exclude` entry for that set's
  `**/*.fit.spec.js`. Skip it and vitest tries to run the Playwright specs as
  unit tests, and the unit suite fails on `test` not being defined.
- `webpack.config.js` — a per-set client entry, for a set that ships
  client-side JS. Skip it and the set's pages render without their
  progressive enhancement, with no build error to say so.

## 9. Move the tests with the URLs

A new set does not move existing URLs, but adding the FIRST prefix to a set did
— and any change to a set's mount does. The `trade-imports-animals-tests`
repository builds journey URLs from `page-objects/base/sets.ts`. Add your set's
base there and use it; do not spell the prefix out in a spec.

The frontend's own FIT specs build URLs from `BASE` in
`fit/live-animals-journey.js`, which re-exports `SET_BASE`. Give your set the
same single seam rather than literals in specs.

Cross-repo changes share one branch name across every affected repository, and
the frontend and tests changes land together — a split landing breaks the E2E
suite.
