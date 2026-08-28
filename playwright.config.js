import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the live-animals feature coverage and journey smoke.
 * Fully self-contained - STUB_MODE=true is set for the webServer below, which
 * serves stub data and skips the Defra ID OIDC exchange, so no other service
 * needs to be running.
 */
const port = Number(process.env.PORT ?? 3000)

export default defineConfig({
  testDir: './fit',
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
      name: 'journeys',
      testMatch: '**/journey-smoke.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        // Slow each action down so the recorded journey is watchable. Override with
        // DEMO_SLOWMO (e.g. DEMO_SLOWMO=0 for a fast run).
        launchOptions: {
          slowMo:
            process.env.DEMO_SLOWMO !== undefined
              ? Number(process.env.DEMO_SLOWMO)
              : 600
        },
        // Retain a video for every run, not just failures.
        video: 'on',
        trace: 'on'
      }
    },
    {
      name: 'features',
      testDir: './src/server/app/sets/live-animals/journeys/linear/features',
      testMatch: '**/*.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    },
    // Evidence capture for the findings report in the workspace. It exists only
    // when FIT_CAPTURE is set, which only `npm run test:fit:capture` does, so
    // `test:fit`, `test:fit:features` and CI never run it and never pay for it.
    //
    // Everything here is about two runs at the same commit producing the same
    // bytes: a fixed viewport, 2x so the image is legible on a Retina display,
    // and motion stopped. Without that a no-op re-capture drifts every screen
    // and the report's changed-since-curation panel becomes noise.
    ...(process.env.FIT_CAPTURE
      ? [
          {
            name: 'evidence',
            testMatch: '**/evidence-capture.fit.spec.js',
            use: {
              ...devices['Desktop Chrome'],
              baseURL: `http://localhost:${port}`,
              viewport: { width: 1280, height: 1200 },
              deviceScaleFactor: Number(process.env.FIT_CAPTURE_DSF ?? 2),
              reducedMotion: 'reduce',
              video: 'off',
              trace: 'retain-on-failure'
            }
          }
        ]
      : [])
  ],
  webServer: [
    {
      command: 'npm run fit:start',
      url: `http://localhost:${port}/health`,
      // The service default is real; this suite runs against stub data and a
      // locally signed session, so it opts in explicitly here. Auth stays
      // enforced either way (see server/auth/stub-sign-in.js).
      env: { PORT: String(port), STUB_MODE: 'true' },
      timeout: 180_000,
      reuseExistingServer: false
    }
  ]
})
