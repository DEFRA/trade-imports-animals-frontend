# Prototype E2E suite

One Playwright config ([`playwright.config.js`](../../playwright.config.js)), two
projects, one command. `npm run test:prototype` runs **both**.

- `prototype` — every spec except the parity compare, against a stub-mode server
  on port `3000`. The demo journeys.
- `parity` — `skeleton-vs-prototype-mongo.spec.js` only, against a **real**-mode
  server on port `3001` (`PORT + 1`).

## The demo project

Tests whose purpose is to **demo** the prototype journeys, not just assert on
them. One test per variant walks the whole journey end to end — start to
confirmation — exercising the claims loop, the per-option add-on subtasks and
every input type along the way.

Each run records a **video per test** (`video: 'on'` on the project), so after
every iteration of the prototypes there is a fresh playback of each journey.

## The parity project

`skeleton-vs-prototype-mongo.spec.js` drives BOTH journeys this frontend serves —
the production skeleton (`src/server`) and the live-animals prototype — against
the SAME real backend, then compares the two persisted notifications
field-by-field. It therefore needs a `LIVE_ANIMALS_MODE=real` server, which the
config starts on its own port so it can sit beside the stub-mode demo server.

It runs in the normal suite deliberately: when the compare had a config and a
command of its own, it was easy to forget — and a persistence bug hid behind two
green suites.

## The workspace stack is required

The real-mode server persists through the workspace stack: the backend on
`:8085`, Mongo behind it, Redis for the session cache. Start the stack before you
run the suite:

```bash
scripts/stack/run-stack.sh        # from the trade-imports-animals workspace
```

`npm run test:prototype` probes the backend first
(`prototypes/e2e/check-workspace-stack.js`) and exits in a second with that
instruction if the stack is down — rather than dying in a 180-second web-server
timeout.

## Run it

```bash
npx playwright install chromium   # one-off: download the browser
npm run test:prototype            # builds assets, boots both servers, runs both projects
npx playwright show-report        # open the report — videos are attached per test
```

Both `webServer` entries boot a stable pre-built server (`prototype:start` and
`prototype:real:start`). The assets are built **once** by the npm script before
Playwright starts, so the two servers cannot race each other over the same
webpack output. Videos land in `test-results/` and the HTML report in
`playwright-report/` — both gitignored.

The demo server refuses to reuse an existing one — if a dev server is already
holding port 3000, kill it first:

```bash
lsof -ti:3000 | xargs kill
```

The real-mode server on port 3001 **is** reused if one is already answering.

## One project at a time

```bash
npm run test:prototype:journeys   # demo project only
npm run test:prototype:parity     # parity project only
```

Both still need the stack: Playwright starts every `webServer` in the config
whatever project you select.

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
