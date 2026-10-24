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

## Browser-test drivers

`fit/live-animals-journey.js` is the one set of drivers the browser tests share.

- `selectSpecies` takes `{ commodityCode, latinName }` pairs and ticks the box
  inside the group for that code. A species can sit under several codes
  (`Bos taurus` is under `0102` and `01061900`), so the code is part of the
  choice and the result order never decides it.
- The shared species constants (`BOS_TAURUS`, `FELIS_CATUS` and so on) live in
  that file. Specs import them rather than declaring their own.
- `openCommoditySearch` and `openCommodityDetails` take a notification from the
  start to the commodity search page and to the commodity details page.
- Country of origin, port of entry and the other type-aheads enhance a native
  `<select>`. The drivers ask the element what it is after `DOMContentLoaded`,
  so they work with or without JavaScript.
- The driver for the arrival date computes a date inside the moving arrival
  window, and spells the display format out rather than calling
  `formatDisplayDate`, so a format regression fails the assertion instead of
  moving expectation and actual together.
- `startNotification` enters through the set's own base rather than `/`, so the
  driver does not depend on live-animals being the default set. The root
  redirect is covered by the service-navigation spec.
- Origin is the entry page. The entry guard holds a notification there until it
  is answered, so reaching the hub means answering it.
- The animal count is save-blocking, so a driver that reaches past commodity
  details fills it.
- Dogs are identified by microchip in law, so a chip number on its own is enough
  to save a dog.

## Required checks for a journey change

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or shared
FIT helpers.
