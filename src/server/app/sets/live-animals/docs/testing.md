# Testing the live-animals set and journey

## Set-focused Vitest run

`npm run test:live-animals` runs Vitest under
`src/server/app/sets/live-animals` without coverage. It covers obligation-set tests,
controllers, copy, bindings, flow policy and journey behaviour.

It does not run L1 or L2 tests. Run `npm test` for route composition, dispatch,
fulfilment-registry, copy-convention and controller contract checks.

## Feature browser tests

`PORT=3050 npm run test:fit:features` builds the frontend and runs co-located
`*.fit.spec.js` (frontend integration test — see
[Browser-test projects](../../../docs/testing.md#browser-test-projects))
files under `src/server/app/sets/live-animals/journeys/linear/features`.

Each feature test starts its own notification. Use Playwright role, label and
visible-copy locators, locator assertions and auto-waiting. Do not use sleeps or a
page-object layer.

Every changed page needs happy-path and validation coverage. Axe checks cover the
initial page and its validation-error state, failing on serious or critical WCAG 2 A
or AA violations.

## Whole-journey browser tests

`npm run test:fit:journeys` runs the `journeys` Playwright project under `fit/`. Its
live-animals helper uses
[`src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json`](../journeys/linear/flow/fixtures/happy-path.json).

## Required checks for a journey change

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or shared
FIT helpers.
