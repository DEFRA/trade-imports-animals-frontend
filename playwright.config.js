import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the prototype demo suite. Its purpose is to *demo* the
 * throwaway prototype journeys — each test walks a whole journey end to end and
 * records a video, so after every iteration there is a fresh playback of each
 * journey. Run with `npm run test:prototype`.
 */
export default defineConfig({
  testDir: './prototypes/e2e',
  testMatch: '**/*.spec.js',
  // Journeys are independent (each owns its own quote id) and the JSON store is
  // synchronous, so they can run in parallel even though each is slow.
  fullyParallel: true,
  workers: 4,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
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
    trace: 'on',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // A stable, pre-built one-shot server (not the watch-mode dev server, which
    // answers before assets are built and can restart under test load).
    command: 'npm run prototype:serve',
    url: 'http://localhost:3000/prototype',
    timeout: 180_000,
    reuseExistingServer: false
  }
})
