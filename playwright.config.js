import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the prototype suites. Two projects, two servers, one
 * command (`npm run test:prototype`):
 *
 *   - `prototype` — the demo suite. Each test walks a whole prototype journey
 *     end to end against a STUB-mode server and records a video, so after every
 *     iteration there is a fresh playback of each journey.
 * The server is a stable pre-built one-shot server (not the watch-mode dev
 * server, which answers before assets are built and can restart under test
 * load). The `test:prototype*` scripts build the assets once before Playwright
 * starts.
 */
const port = Number(process.env.PORT ?? 3000)

// Forward the retrofit model flag (MODEL=a|b) to the prototype servers the
// E2E launches. Unset → default (a), byte-identical to today. MODEL=b boots
// the servers on B's obligation model so the journeys + Mongo parity exercise
// the retrofit end-to-end.
const modelEnv = process.env.MODEL ? { MODEL: process.env.MODEL } : {}

// The axe accessibility scans are CPU-heavy; running them inside the fully-parallel
// journey suite (which records video+trace for every test) overloads the machine.
// They get their own lightweight project (no video/trace), run with capped workers
// via the test:a11y script, and are excluded from the main journey run.
const a11y = '**/a11y.spec.js'

export default defineConfig({
  testDir: './prototypes/e2e',
  testMatch: '**/*.spec.js',
  // Journeys are independent (each owns its own quote id) and the JSON store is
  // synchronous, so they can run in parallel even though each is slow.
  fullyParallel: true,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'prototype',
      testIgnore: a11y,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        // Slow each action down so the demo video is watchable. Override with
        // DEMO_SLOWMO (e.g. DEMO_SLOWMO=0 for a fast run).
        launchOptions: {
          slowMo:
            process.env.DEMO_SLOWMO !== undefined
              ? Number(process.env.DEMO_SLOWMO)
              : 600
        },
        // Retain a video for every run (not just failures) — these are the demo.
        video: 'on',
        trace: 'on'
      }
    },
    {
      name: 'a11y',
      testMatch: a11y,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    }
  ],
  webServer: [
    {
      command: 'npm run prototype:start',
      url: `http://localhost:${port}/prototype`,
      env: { PORT: String(port), ...modelEnv },
      timeout: 180_000,
      reuseExistingServer: false
    }
  ]
})
