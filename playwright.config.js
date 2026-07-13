import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the EUDPA-249 flow-layer spike's browser suite.
 *
 * Purpose: prove the V4 journey works end-to-end in a real browser and
 * record a demo video of each walk. The vitest suite already exercises
 * every controller via `server.inject` — this suite adds real form
 * events, real navigation, real tag rendering, and (in :demo mode) a
 * watchable playback for stakeholder reviews.
 *
 * Shape mirrors the parent-layouts branch (`spike/EUDPA-249-prototype-
 * layouts`) so the two harnesses look familiar side-by-side. A
 * `JOURNEYS` array shape is retained even though this branch has one
 * variant — future variants (e.g. a Joi-adopted rerun or a
 * server-rendered-only comparison) can be added by declaring a new
 * entry, no per-spec churn.
 *
 * See `prototypes/journey-config-spikes/EUDPA-249-flow-layer/e2e/README.md`
 * for run instructions.
 */
export default defineConfig({
  testDir: './prototypes/journey-config-spikes/EUDPA-249-flow-layer/e2e',
  testMatch: '**/*.spec.js',
  // Each test resets its yar session via POST /reset before doing
  // anything, so parallel runs don't clobber each other's state.
  fullyParallel: true,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Slow every action down so the recorded video is watchable. Turn
    // it off (`DEMO_SLOWMO=0`) for a fast CI-style pass/fail run.
    launchOptions: {
      slowMo:
        process.env.DEMO_SLOWMO !== undefined
          ? Number(process.env.DEMO_SLOWMO)
          : 600
    },
    // Retain video + trace for every run (not just failures) — these
    // ARE the demo artefacts.
    video: 'on',
    trace: 'on',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A one-shot server (not the watch-mode dev server, which answers
    // before assets are built and can restart under test load). The
    // spike env gate defaults off in production; `prototype:serve`
    // forces it on for the duration of the run.
    command: 'npm run prototype:serve',
    url: 'http://localhost:3000/prototype/eudpa-249/task-list',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI
  }
})
