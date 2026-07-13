import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // The EUDPA-249 flow-layer spike ships a Playwright suite under
    // `prototypes/journey-config-spikes/EUDPA-249-flow-layer/e2e/` that
    // imports `@playwright/test`. That folder must not be picked up by
    // vitest — it is run via `npm run test:prototype` instead. See
    // `playwright.config.js` at the repo root.
    exclude: [
      ...configDefaults.exclude,
      'prototypes/journey-config-spikes/EUDPA-249-flow-layer/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        '.public',
        'coverage',
        'postcss.config.js',
        'stylelint.config.js',
        'vitest.config.js',
        '.sonarlint',
        'babel.config.cjs'
      ]
    }
  }
})
