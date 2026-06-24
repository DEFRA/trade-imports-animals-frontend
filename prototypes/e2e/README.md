# Prototype demo suite

Playwright tests whose purpose is to **demo** the prototype journeys, not just
assert on them. One test per variant walks the whole journey end to end — start
to confirmation — exercising the claims loop, the per-option add-on subtasks and
every input type along the way.

- `linear.spec.js`
- `task-list.spec.js`
- `task-list-with-linear-tasks.spec.js`

Each run records a **video per test** (`video: 'on'` in
[`playwright.config.js`](../../playwright.config.js)), so after every iteration
of the prototypes there is a fresh playback of each journey.

## Run it

```bash
npx playwright install chromium   # one-off: download the browser
npm run test:prototype            # boots the prototype server, runs the suite
npx playwright show-report        # open the report — videos are attached per test
```

The config's `webServer` boots a stable pre-built server (`npm run
prototype:serve`) automatically. Videos land in `test-results/` and the HTML
report in `playwright-report/` — both gitignored.

## Pacing the demo

The runs are deliberately slowed so the videos are watchable (~45s each):

- `DEMO_SLOWMO` — ms before each action (default `600`)
- `DEMO_PACE_MS` — ms to dwell on each page (default `1500`)

```bash
DEMO_SLOWMO=1000 DEMO_PACE_MS=2500 npm run test:prototype   # slower
DEMO_SLOWMO=0 DEMO_PACE_MS=0 npm run test:prototype          # fast (no pauses)
```
