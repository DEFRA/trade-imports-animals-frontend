import neostandard from 'neostandard'

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true,
    noStyle: true
  }),
  {
    // page.evaluate callbacks in Playwright specs run in the browser
    files: ['**/*.e2e.spec.js'],
    languageOptions: { globals: { Option: 'readonly' } }
  }
]
