import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the prototype suites. Two projects, two servers, one
 * command (`npm run test:prototype`):
 *
 *   - `prototype` — the demo suite. Each test walks a whole prototype journey
 *     end to end against a STUB-mode server and records a video, so after every
 *     iteration there is a fresh playback of each journey.
 *   - `parity` — the cross-journey persistence compare
 *     (`skeleton-vs-prototype-mongo.spec.js`). It needs a REAL-mode server, so
 *     it gets its own one on the next port, persisting through the workspace
 *     stack (backend, Mongo, Redis). It runs as part of the normal suite: a
 *     parity break must not be able to hide behind a green demo run.
 *
 * Both servers are stable pre-built one-shot servers (not the watch-mode dev
 * server, which answers before assets are built and can restart under test
 * load). The `test:prototype*` scripts build the assets ONCE before Playwright
 * starts, so the two servers never race each other over the same webpack output.
 *
 * The real-mode server cannot boot without the workspace stack. The scripts
 * probe the backend first (`npm run check:workspace-stack`), so a stack-down run
 * fails in a second with an actionable message rather than a web-server timeout.
 */
const port = Number(process.env.PORT ?? 3000)
const realPort = port + 1

// Forward the retrofit model flag (MODEL=a|b) to the prototype servers the
// E2E launches. Unset → default (a), byte-identical to today. MODEL=b boots
// the servers on B's obligation model so the journeys + Mongo parity exercise
// the retrofit end-to-end.
const modelEnv = process.env.MODEL ? { MODEL: process.env.MODEL } : {}

const parity = '**/skeleton-vs-prototype-mongo.spec.js'

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
      testIgnore: parity,
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
      name: 'parity',
      testMatch: parity,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${realPort}`,
        video: 'retain-on-failure',
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
    },
    {
      // Sam keeps a real-mode server up alongside the stack, so reuse one on
      // this port if it is already answering — UNLESS a MODEL is pinned
      // (MODEL=b), in which case a fresh server must boot under that model
      // rather than reuse an ambient default-model one.
      command: 'npm run prototype:real:start',
      url: `http://localhost:${realPort}/prototype-standalone/live-animals/home`,
      env: { PORT: String(realPort), ...modelEnv },
      timeout: 180_000,
      reuseExistingServer: !process.env.MODEL
    }
  ]
})
