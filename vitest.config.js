import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./test/setup-obligation-set.js'],
    // The service default is real mode; the unit suite opts into stub, the same
    // way the Playwright suite does. Tests that exercise real mode set the flag
    // themselves and restore it.
    env: { LIVE_ANIMALS_MODE: 'stub' },
    // Playwright E2E specs are run by Playwright, not vitest.
    exclude: [
      ...configDefaults.exclude,
      'e2e/**',
      'src/server/app/sets/*/journeys/linear/features/**/*.e2e.spec.js'
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
