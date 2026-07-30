import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the live-animals feature coverage and journey smoke.
 */
const port = Number(process.env.PORT ?? 3000)

export default defineConfig({
  testDir: './e2e',
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
      testMatch: '**/journey-smoke.spec.js',
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
      testDir: './src/server/live-animals/features',
      testMatch: '**/*.e2e.spec.js',
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
      command: 'npm run e2e:start',
      url: `http://localhost:${port}/health`,
      // The service default is real mode; the canned journey suite runs against
      // stub data, so it opts in explicitly here.
      env: { PORT: String(port), LIVE_ANIMALS_MODE: 'stub' },
      timeout: 180_000,
      reuseExistingServer: false
    }
  ]
})
