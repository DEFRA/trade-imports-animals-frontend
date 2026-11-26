import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    setupFiles: ['./test/setup-obligation-set.js'],
    env: {
      // The service default is real mode; the unit suite opts into stub, the same
      // way the Playwright suite does. Tests that exercise real mode set the flag
      // themselves and restore it.
      STUB_MODE: 'true',
      LOG_FORMAT: 'ecs',
      AWS_EMF_ENVIRONMENT: 'Local'
    },
    // Playwright FIT specs are run by Playwright, not vitest.
    exclude: [
      ...configDefaults.exclude,
      'dev-tools/**',
      'fit/**',
      'src/server/app/sets/live-animals/journeys/linear/features/**/*.fit.spec.js'
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
