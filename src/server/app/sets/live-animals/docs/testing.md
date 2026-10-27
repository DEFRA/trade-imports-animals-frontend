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

`setUploadFile` hands the file to the input with a 60 second action timeout.
`test.slow()` does not extend one action's own deadline. An oversize-file test
has to send a file genuinely over the cap, because the page reads the limit
once at load. Writing a file that large through the browser can outlast the
default deadline when every worker runs at once.

## Whole-journey browser tests

`npm run test:fit:journeys` runs the `journeys` Playwright project under `fit/`. Its
live-animals helper uses
[`src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json`](../journeys/linear/flow/fixtures/happy-path.json).

## Type-ahead style tests

The type-ahead style tests (typography, focus indicator, error border) compare
the enhanced input with a plain GOV.UK input and with GOV.UK colour tokens read
at run time.

`expectStyle`, which asserts a set of CSS properties on an element, is shared
from `fit/live-animals-journey.js`. The other helpers live in
`type-ahead.fit.spec.js` because only that spec uses them. When a second spec
needs one, move it to `fit/live-animals-journey.js` in the same change and
delete every local copy.

| Helper                    | What it does                                                            |
| ------------------------- | ----------------------------------------------------------------------- |
| `govukColourOf`           | Reads a GOV.UK colour token in the browser.                             |
| `govukInputStyleOf`       | Reads computed properties of a plain GOV.UK input, optionally focused.  |
| `measureReferenceElement` | Creates a reference element, reads its computed properties, removes it. |
| `shadowInColour`          | Rewrites the colour in a shadow value.                                  |

The type-ahead style tests prove appearance by position, size relative to
another element, a GOV.UK colour token read at run time, or comparison with a
plain GOV.UK element. The typography test adds one guard: the enhanced input's
font family names GDS Transport. Without it the test would pass when the GOV.UK stylesheet failed to
load, because both inputs would fall back to the browser default.

The screenshot tests in `trade-imports-ins-tests`
(`tests/animals/e2e/visual/origin-of-import.visual.spec.ts`) capture the
type-ahead on first load and with a chosen country and the region box showing.
No screenshot captures its focused or error state, so those two states are
proved by the type-ahead style tests.

## Appearance

The screenshot specs live in `trade-imports-ins-tests` under
`tests/animals/e2e/visual/`.

Do not add fixed `rgb()` values, `box-shadow` strings, pixel sizes or font
weights to a fit spec; prove appearance by position, relative size or a colour
read at run time, or with a screenshot.

## Required checks for a journey change

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or shared
FIT helpers.
