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

## Browser-test drivers

`fit/live-animals-journey.js` is the one set of drivers the browser tests share.

- `selectSpecies` takes a stored-line shape and ticks the box, inside the
  group for its commodity code, named by the label the page offers that
  species under. A species can sit under several codes (`Gallus gallus` is
  under `01051111` and `01059400`), so the code is part of the choice and the
  result order never decides it.
- The shared species rows (`BOS_TAURUS_ROW`, `FELIS_CATUS_ROW` and so on) live in
  `features/commodities/search/test-support.js`, carrying the Latin name
  and the common name the stub serves; `fit/live-animals-journey.js` imports and
  re-exports them under their own `_ROW` names. Specs import them rather than
  declaring their own. The spelled-out label for each row lives beside them in
  `test-support.js`, for a driver or a spec that holds a row and needs its label.
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
- The means of transport is save-blocking, so a driver that reaches past
  arrival details chooses one.
- Ferrets are identified by microchip in law, so a chip number on its own is
  enough to save a ferret.

These steps are shared because more than one spec uses them:

- `measureReferenceElement` reads computed properties of an element made only
  from GOV.UK classes and inline styles, then removes it.
- `govukColourOf` reads a GOV.UK colour token through it.
- `govukVisuallyHiddenStyleOf` reads the values GOV.UK gives hidden text.
- `govukPrimaryButtonStyleOf` reads the background colour GOV.UK gives its
  primary button.
- `expectStyle` asserts a set of CSS properties on an element.
- `errorSummary` finds the page's error summary by its alert role.
- `errorSummaryLinks` finds the error summary's links, narrowed to one named
  link when a name is passed, and matches the whole accessible name when
  given `{ exact: true }`. It serves both a click on one link and an
  assertion over the whole list.
- `expectCaptionAboveHeading` proves a section caption sits above the level 1
  heading.

When a second spec needs a local step, move it to
`fit/live-animals-journey.js` in the same change and delete every local copy.
A step only one spec uses stays in that spec.

## Type-ahead style tests

The type-ahead style tests (typography, focus indicator, error border) compare
the enhanced input with a plain GOV.UK input and with GOV.UK colour tokens read
at run time.

`type-ahead.fit.spec.js` keeps the helpers only it uses:

| Helper              | What it does                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| `govukInputStyleOf` | Reads computed properties of a plain GOV.UK input, optionally focused. |

The type-ahead style tests prove appearance by position, size relative to
another element, a GOV.UK colour token read at run time, or comparison with a
plain GOV.UK element.

The focus test compares the enhanced input's outline with GOV.UK's focus token
and width, and its whole inset shadow, colour included, with the plain GOV.UK
focused input's as read.

The typography test adds one guard: the enhanced input's font family names GDS
Transport. Without it the test would pass when the GOV.UK stylesheet failed to
load, because both inputs would fall back to the browser default.

The screenshot tests in `trade-imports-ins-tests`
(`tests/animals/e2e/visual/origin-of-import.visual.spec.ts`) capture the
type-ahead on first load, which shows the search button's colours and the
absent dropdown arrow, and with a chosen country and the region box showing.
No screenshot captures its focused or error state, so those two states are
proved by the type-ahead style tests.

Each type-ahead is also proved to offer a name when the trader's search differs
from it only by accents, with the matching letters in bold.

## Appearance

The screenshot specs live in `trade-imports-ins-tests` under
`tests/animals/e2e/visual/`. They show the arrival details question labels at
their medium size, the Upload documents actions column right-aligned, and the
Overview's two commodity total boxes with their captions.

Do not add fixed `rgb()` values, `box-shadow` strings, pixel sizes, font
weights, text alignment or class lists to a fit spec. Prove a look without a
screenshot by comparing it with a GOV.UK value read at run time or with another
element's size, and find elements by role, accessible name or heading, not by
class.

## Required checks for a journey change

```bash
npm run test:live-animals
npm test
PORT=3050 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or shared
FIT helpers.
