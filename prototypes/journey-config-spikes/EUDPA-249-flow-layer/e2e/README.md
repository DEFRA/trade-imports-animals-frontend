# EUDPA-249 flow-layer — Playwright browser suite

Real-browser walks of the V4 journey. Complements the vitest suite
(`e2e-walk.test.js`, `e2e-commodity-lines.test.js`, `e2e-units.test.js`)
which drive the same shape via `server.inject`. The Playwright suite
exists for two reasons:

1. **Real form events, real navigation, real tag rendering.** The
   vitest suite proves controllers; this suite proves the browser
   integration on top.
2. **Recorded demos.** Every run captures a video per test. In
   `:demo` mode the actions are paced so the video is watchable for
   stakeholder walkthroughs.

## Shape

The suite is data-driven off a `JOURNEYS` array in [`journey.js`](./journey.js)
— same idiom as the parent-layouts branch. There's one variant today
(`v4-flow-layer`); adding a future variant is a single entry in the
array plus (if the variant's page copy diverges) small guards inside
the fill helpers.

## Run it

```bash
npm install                        # one-off: pulls in @playwright/test
npx playwright install chromium    # one-off: downloads the browser
npm run test:prototype             # fast pass/fail (no pauses)
npm run test:prototype:demo        # recording pace (600ms per action)
npx playwright show-report         # open the HTML report — videos attached per test
```

`playwright.config.js` at the repo root boots `npm run prototype:serve`
(a one-shot server with `PROTOTYPE_EUDPA249_ENABLED=true`,
`NODE_ENV=development`) before the tests run, and reuses the same
server across parallel tests.

## Pacing

Two env vars drive the demo pace:

- `DEMO_SLOWMO` — ms before each action (fast `0`, demo `600`)
- `DEMO_PACE_MS` — ms to dwell on each page (fast `0`, demo `1500`)

The two npm scripts set these inline. To override, run
`playwright test` directly:

```bash
DEMO_SLOWMO=1000 DEMO_PACE_MS=2500 npx playwright test
```

## Coverage

Two specs per variant in [`walk.spec.js`](./walk.spec.js):

- Internal-market happy path (fills accompanying-documents) → 13
  Completed + 1 Optional.
- Transit happy path (skips accompanying-documents + internal-
  reference) → 12 Completed + 2 Optional. Also asserts the Optional
  tag renders with the `govuk-tag--turquoise` class.

The counts mirror the vitest e2e-walk cases exactly. If the browser
counts diverge from the HTTP-inject counts, that's evidence of
template drift — worth chasing.

## Not covered (deliberate)

- The commodity-line **delete** flow — covered in vitest
  (`e2e-commodity-lines.test.js`).
- The per-unit **units** UX at depth 2 — covered in vitest
  (`e2e-units.test.js`).
- Every page's error path (blank submit, invalid values, etc.) —
  covered in vitest (`routes.test.js`).

Anything the vitest suite covers well doesn't need re-covering here
just because Playwright's available. The rule for what belongs in
this folder: does it prove something a browser can prove that
`server.inject` can't? If not, keep it in vitest.
