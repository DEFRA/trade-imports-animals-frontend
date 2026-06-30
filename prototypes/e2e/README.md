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

`npm run test:prototype` runs as fast as possible (no pauses) for a quick
pass/fail. `npm run test:prototype:demo` slows the runs so the videos are
watchable for recording. Both pin their pacing via two env vars:

- `DEMO_SLOWMO` — ms before each action (`test:prototype` `0`, `:demo` `600`)
- `DEMO_PACE_MS` — ms to dwell on each page (`test:prototype` `0`, `:demo` `1500`)

```bash
npm run test:prototype                                       # fast (no pauses)
npm run test:prototype:demo                                  # recording pace (600 / 1500)
DEMO_SLOWMO=1000 DEMO_PACE_MS=2500 npx playwright test       # custom pacing
```

The two npm scripts set `DEMO_*` inline, so to override the pacing run
`playwright` directly (as above) rather than prefixing the npm script — an
inline assignment in the script shadows a command-line env prefix. With no
`DEMO_*` set, the code defaults are `600` / `1500`.
