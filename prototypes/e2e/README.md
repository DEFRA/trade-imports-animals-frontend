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

The config's `webServer` boots `npm run prototype` automatically (flag on, auth
off) and reuses an already-running server if you have one up. Videos land in
`test-results/` and the HTML report in `playwright-report/` — both gitignored.
