# Prototype E2E suite

One Playwright config ([`playwright.config.js`](../../playwright.config.js)),
with separate journey and accessibility projects.

- `prototype` — every journey spec, against a stub-mode server on port `3000`.
- `a11y` — the accessibility spec against the same server.

## The demo project

Tests whose purpose is to **demo** the prototype journeys, not just assert on
them. One test per variant walks the whole journey end to end — start to
confirmation — exercising the claims loop, the per-option add-on subtasks and
every input type along the way.

Each run records a **video per test** (`video: 'on'` on the project), so after
every iteration of the prototypes there is a fresh playback of each journey.

## Run it

```bash
npx playwright install chromium   # one-off: download the browser
npm run test:prototype            # builds assets, boots the server, runs the journeys
npx playwright show-report        # open the report — videos are attached per test
```

The `webServer` entry boots a stable pre-built server (`prototype:start`). The
assets are built once by the npm script before Playwright starts. Videos land
in `test-results/` and the HTML report in `playwright-report/` — both gitignored.

The demo server refuses to reuse an existing one — if a dev server is already
holding port 3000, kill it first:

```bash
lsof -ti:3000 | xargs kill
```

## Run one project

```bash
npm run test:prototype:journeys   # demo project only
npm run test:a11y                 # accessibility project only
```

## Pacing the demo

`npm run test:prototype` runs as fast as possible (no pauses) for a quick
pass/fail. `npm run test:prototype:demo` slows the demo project so the videos are
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
