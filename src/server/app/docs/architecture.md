# Architecture: layers and composition

The application separates reusable platform machinery from obligation-set data and
journey presentation. Dependency Cruiser enforces the boundaries in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

## L1: composition and registry

The files directly under `src/server/app/` compose the application.
[`src/server/app/routes.js`](../routes.js) is only the export barrel; the per-set
gateways it re-exports — today
[`routes-live-animals.js`](../routes-live-animals.js) — are the only production
modules outside a set that import `sets/**`.
[`src/server/router.js`](../../router.js) mounts each gateway under its own
prefix and redirects `/` to the default set.

At boot, `routes-live-animals.js` registers its mount and, inside its own set
context:

- gives the live-animals manifest to
  [`configureObligationSet()`](../model/obligations/manifest.js)
- gives feature bindings to
  [`configureFulfilmentRegistry()`](../bridge/fulfilment-registry.js)
- gives journey sections, task rows, navigation and layout policy to
  [`configureJourneyFlow()`](../flow/journey-flow.js)
- builds the obligation-to-page dispatch index with
  [`buildDispatch()`](../flow/dispatch.js)
- injects records and session adapters through
  [`configureRecords()`](../engine/persistence/records.js) and
  [`configureSession()`](../engine/persistence/session.js)
- registers the journey cookies, entry guard and Hapi routes

The purity and binding-coverage assertions run after those registrations and before
routes are added to the server.

## L2: set-agnostic platform

The reusable code lives in these directories:

- `model/` — pure obligation evaluation, state queries and helper metadata
- `bridge/` — the translation between obligations and page-shaped fulfilments
- `engine/` — stateful reads, writes and abstract persistence ports
- `flow/` — dispatch, gates, prerequisites, navigation and injected journey policy
- `services/` — IO adapters and reference-data services
- `lib/` — small generic helpers, including validation
- `shared/` — common controller and template support
- `analysis/` — journey simulation and reachability tooling

Production L2 code does not import a set. Set and journey data arrive through L1
configuration.

## L3: obligation sets

Each set owns its manifest and section declarations under
`sets/<set>/obligations/`. An obligation set may use L2 model helpers,
but it does not import a journey.

The live-animals manifest is
[`src/server/app/sets/live-animals/obligations/index.js`](../sets/live-animals/obligations/index.js).
The generic manifest accessors remain in
[`src/server/app/model/obligations/manifest.js`](../model/obligations/manifest.js).

## L4: journeys

A journey owns page identity, controllers, templates, copy, bindings, section order,
task rows and opening-run policy. Journeys may use their own set and L2 APIs. They do
not import another journey or another set.

The live-animals linear journey uses two Nunjucks roots configured in
[`src/config/nunjucks/nunjucks.js`](../../../config/nunjucks/nunjucks.js):

- `src/server/app` resolves shared views such as `shared/layout.njk`
- `src/server/app/sets` resolves journey views

Its configuration is
[`src/server/app/sets/live-animals/journeys/linear/config.js`](../sets/live-animals/journeys/linear/config.js):

```js
export const TEMPLATES = 'live-animals/journeys/linear'
export const LAYOUT = 'shared/layout.njk'
```

## Enforced boundaries

Dependency Cruiser scans all of `src/server/app`. Its error-level rules prevent:

- L2 production imports from `sets/**`
- set imports outside `routes.js` and the per-set `routes-<set-id>.js` gateways
- obligations importing journeys
- one journey importing a sibling journey
- one set importing another set
- engine imports from services or higher runtime layers
- model, bridge and flow imports that cross their allowed boundaries
- circular dependencies

The bridge reaches nothing in `flow`: the journey's flow-only keys are held in
[`bridge/flow-only-keys.js`](../bridge/flow-only-keys.js) and forwarded there by
`configureJourneyFlow`, and the check-your-answers readiness roll-up reaches
[`bridge/readiness-config.js`](../bridge/readiness-config.js) by injection from
the set's gateway, `routes-live-animals.js`. Unconfigured, that seam is
fail-closed.

Tests may compose real layers, but production code cannot use test exemptions.

## Feature folders

A feature's production controllers do not share controller logic with another
feature's controllers. The rule covers production controllers only, never test
support. Importing a sibling feature's helper — a page identity, a view-model
function or a test helper — is fine.

## Shared controller support: `shared/kit.js`

[`shared/kit.js`](../shared/kit.js) holds what every journey page does the same
way:

- page chrome: `base()`, `setlessBase()`, `journeyStrip()` and `SURFACES`
- errors: `errorSummary()`, `fieldError()` and `logRefusal()`
- where a POST goes next: `hubExitTarget()`, `exitTarget()`, `nextTarget()`
  and `amendReviewTarget()`, which follow the save choice of the request, or
  one passed to them
- the save choice a request carries: `requestSaveChoice()`, and for a form the
  upload service returns the browser with, `returnedSaveChoice()`
- where a page's Back link goes: `runBackLink()`
- saving: `recoverableSave()` and `pageRoutes()`
- date fields: `readDate()`, `dateTextOf()` and `dateField()`

A helper belongs in `kit.js` only when every journey page could use it and it
names no feature, set or page. Validation rules go in
[`lib/validate/`](../lib/validate/index.js), copy in the feature's `copy/`
folder, and backend calls in `services/`.

## How this repo does common things

### Concurrency token

Every journey page carries the journey's `concurrencyToken`: `kit.base()` puts
it on the view and the template posts it back in a hidden field. A save whose
token is stale throws `STALE_CONCURRENCY_TOKEN`. `kit.pageRoutes()` turns that
into a redirect to the same page with `?staleAction=1`, and logs it. The
declaration is the exception: it posts the token the review was rendered with,
so it declares exactly what the trader reviewed. Every page carries the
current token, so a posted token alone cannot prove the post came from the
review: the review also records the token it rendered in the session, and the
declaration refuses a token the session has not recorded.

### POST redirects

A POST that saves redirects (post, redirect, get): to `kit.nextTarget()` on
success, or to the page a refusal names. A POST that fails validation
re-renders the page with status 400 and does not redirect. Two pages render
from a POST on purpose:

- the declaration renders straight from the review's `step=review` post, so it
  can carry the reviewed token
- the transit countries page re-renders after Add and Remove, because it holds
  its working list in hidden fields until Continue

### Page title

A controller passes the page's own title to `kit.base()`.
[`shared/layout.njk`](../shared/layout.njk) builds the `<title>` from it: the
error prefix when the page shows an error summary, then the page title, the
service name and GOV.UK. A page never builds its own `<title>`.

The closing word is `layout.govukSuffix` in the shared copy. It is the GOV.UK
brand name, not translated text, so [`shared/copy.cy.js`](../shared/copy.cy.js)
carries the same `GOV.UK` value as [`shared/copy.en.js`](../shared/copy.en.js),
and [`copy-parity.test.js`](../copy-parity.test.js) allowlists it as identical.

### Backend HTTP clients

Each backend or reference-data call lives in its own module under `services/`,
for example [`services/ports/client.js`](../services/ports/client.js) and
[`services/persistence/records/real/http/`](../services/persistence/records/real/http/put.js).
A controller calls the service, never `fetch`. Call counting and metrics
helpers wrap a client; they do not hold one.

## Logging

A branch that changes what a request does — a refusal, a redirect away from the
normal next page, a retry or a fallback — logs once through `request.logger`,
so the line carries the request's trace id. Log the ids support searches by:
`journeyId` always, plus the reason and any token or code the decision turned
on. Log a caught error as `{ err }`, never only its message.

A refusal of the user's own input logs nothing: one the user can correct on the
form as rendered (a blank answer, a typed value that fails its rule, or a
choice the form offers that the page then refuses, such as a country already
added). Every other refusal that shows the page again (a state refusal, a
tampered post or an id the page does not hold, a bare 400, another service
refusing what this one accepted) calls `kit.logRefusal(request, { ...details })`
once, before it renders, whatever status code it answers with. The line is
info, carries `journeyId`, the route and the error codes, and takes any named
reason or ids the branch decided on as further keys of the options.

`fieldErrors` is an optional map of field key to the message the page shows; it
fills `errorCodes` (the keys, never the messages). The
[documents page](../sets/live-animals/journeys/linear/features/documents/controller.js)
passes it when scans are not cleared, because the user cannot correct that on
the page. The
[consignment-details removal](../sets/live-animals/journeys/linear/features/commodities/consignment-details/remove/post-remove.js)
of a line that is not there is the example of a refusal that passes its reason.

`kit.recoverableSave()` takes the request and logs every save fallback once at
warn, with `journeyId` and the caught error as `err`, plus any ids the page
passes it. `recoverableSave` writes that line; a page's fallback callback only
builds the response.

A refusal answered by a redirect logs its own named line with the journey id
and the reason.

The canonical example is the declaration refusal in
[`declaration/controller.js`](../sets/live-animals/journeys/linear/features/declaration/controller.js):

```js
request.logger.info(
  {
    journeyId: journey.journeyId,
    refusal,
    concurrencyToken: journey.concurrencyToken,
    postedConcurrencyToken: postedConcurrencyToken(request.payload ?? {})
  },
  'Declaration refused'
)
```

`refusal` is one of the `DECLARATION_REFUSAL` values, so support can search for
each reason by name.

Nothing logs a request or response body at INFO.
