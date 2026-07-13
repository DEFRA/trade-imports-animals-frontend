import { defineConfig, devices } from '@playwright/test'

/**
 * Config for the cross-journey persistence-parity compare
 * (skeleton-vs-prototype-mongo.spec.js). Unlike the demo suite this needs a
 * REAL-mode server — one app serving both journeys, persisting to the local
 * backend — so it reuses a running `npm run prototype:real` or starts one.
 */
const port = Number(process.env.PORT ?? 3000)

export default defineConfig({
  testDir: './prototypes/e2e',
  testMatch: '**/skeleton-vs-prototype-mongo.spec.js',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run prototype:real',
    url: `http://localhost:${port}/prototype-standalone/live-animals/home`,
    timeout: 180_000,
    reuseExistingServer: true
  }
})
