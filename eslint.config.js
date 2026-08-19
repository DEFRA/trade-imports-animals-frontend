import neostandard from 'neostandard'
import sonarjs from 'eslint-plugin-sonarjs'

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true,
    noStyle: true
  }),
  {
    // page.evaluate callbacks run in the browser, so they reach browser
    // globals this project otherwise has no business touching. Listed one by
    // one rather than switching the whole file to a browser environment, so
    // the surrounding Node code stays honest about what it can use.
    files: ['**/*.fit.spec.js', 'fit/evidence/page-model.js'],
    languageOptions: {
      globals: {
        Option: 'readonly',
        getComputedStyle: 'readonly',
        CSS: 'readonly',
        location: 'readonly'
      }
    }
  },
  {
    // mirrors the SonarCloud quality-gate rules that have local equivalents
    files: ['src/server/**/*.js'],
    plugins: { sonarjs },
    rules: {
      curly: ['error', 'all'],
      'default-param-last': 'error',
      'max-params': ['error', 7],
      'no-shadow': 'error',
      'prefer-object-has-own': 'error',
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/concise-regex': 'error',
      'sonarjs/cyclomatic-complexity': 'error',
      'sonarjs/elseif-without-else': 'error',
      'sonarjs/function-return-type': 'error',
      'sonarjs/max-lines-per-function': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-undefined-assignment': 'error',
      'sonarjs/no-unused-function-argument': 'error',
      'sonarjs/prefer-regexp-exec': 'error',
      'sonarjs/prefer-specific-assertions': 'error',
      'sonarjs/single-character-alternation': 'error',
      'sonarjs/super-linear-regex': 'error',
      'sonarjs/too-many-break-or-continue-in-loop': 'error'
    }
  },
  {
    files: ['src/server/**/*.js'],
    ignores: ['**/*.test.js', '**/*.spec.js', '**/*.cy.js'],
    rules: {
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreDefaultValues: true,
          ignoreArrayIndexes: true
        }
      ]
    }
  }
]
