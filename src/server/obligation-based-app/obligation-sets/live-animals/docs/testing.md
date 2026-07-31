# Testing

The live-animals tests have two browser projects and one Vitest suite. Keep a
test near the code that owns the behaviour.

## Unit and contract tests

`npm test` runs Vitest for the whole frontend with coverage. It builds the
frontend first. `npm run test:live-animals` runs only
`src/server/obligation-based-app/obligation-sets/live-animals` without coverage.

Vitest uses the Node environment and sets `LIVE_ANIMALS_MODE=stub`. It excludes
`e2e/` and every `*.e2e.spec.js`.

Use colocated `*.test.js` files for pure functions, controllers, templates,
copy, adapters and engine behaviour. Controller tests use the stub records and
session ports with the helpers in `engine/test-support.js`.

Shared contract tests cover seams that one feature test cannot own:

- `contract.test.js` checks that each controller commits exactly its
  `meta.collects`
- `copy-parity.test.js` checks English and Welsh copy bundle shape
- `bridge/fulfilment-registry.test.js` checks binding ownership
- model coverage tests check IDs, names, gates and reachability
- persistence adapter tests check the stub and real port shapes

The default suite skips live backend and Redis checks. Set
`LIVE_ANIMALS_IT=real` for the real records integration test. Set
`LIVE_ANIMALS_IT=testcontainer` for the Redis session test, or `all` for both.

## Playwright projects

`playwright.config.js` defines two projects. Both start one local server in
stub mode and wait for `/health`.

### `journeys`

Run it with:

```bash
npm run test:e2e
```

It runs only `e2e/journey-smoke.spec.js`. This suite owns journey glue:
entry guards, the opening run, task-to-task movement and change context across
collection pages.

The project uses Desktop Chrome. It records video and trace for every run.
`test:e2e` sets the demo delay values to zero.

### `features`

Run it with:

```bash
npm run test:features
```

It finds `*.e2e.spec.js` under `features/`. A small feature keeps the spec next
to its controller. A larger feature, such as addresses or commodities, keeps
several specs in `features/<name>/e2e/`.

Feature specs own page copy, controls, validation, focus, save and reload,
links, conditional behaviour and page-level accessibility. They retain a trace
only when a test fails.

Do not add feature detail to the journey smoke test. Do not put cross-page
journey glue into a single page's spec.

## Journey helpers

Reuse `e2e/live-animals-journey.js`. It provides:

- notification start and journey-scoped URL helpers
- the checked-in happy-path values
- country, port, species and date helpers
- reusable section completion and document upload steps

Use role, label and visible-copy locators. Import feature copy or service
options when the assertion should track the same public source as the page.
Give each test its own notification so the fully parallel runner stays
isolated.

## Boot guards

Plugin registration runs these checks before routes are mounted:

1. `assertObligationPurity()` rejects display keys in the model.
2. `assertFulfilmentBindingCoverage()` rejects missing, duplicate or invalid
   feature bindings.
3. `buildDispatch(dispatchPages)` rejects unsafe names, duplicate page owners
   and uncovered obligations.

Keep their unit tests green. Do not replace a boot guard with browser coverage.

## Cross-repo tests

The frontend workflow delegates deployed system E2E to the workspace
repository. See [test-ownership.md](test-ownership.md) for the ownership
boundary.
