import { join } from 'node:path'
import { RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'

import { codeQuality } from './code-quality.js'
import { templateCommentFindings } from './template-comments.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' }
})

ruleTester.run(
  'no-tracking-references',
  codeQuality.rules['no-tracking-references'],
  {
    valid: [
      '// Shows the review once every card is complete',
      "it('Should refuse a blank declaration', () => {})",
      "describe('address lookup', () => {})",
      "test('saves the draft', { tag: ['@smoke', '@journeys'] }, () => {})",
      "const id = 'EUDPA-123'",
      "const id = 'c-201'",
      "const reference = 'inc-104'",
      "const uuid = 'c3d0a1e2-0b1c-4d2e-9f3a-123456789abc'",
      '// Unruled transporters carry no status'
    ],
    invalid: [
      {
        code: '// EUDPA-390: decide the search mode',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// see eudpa-523',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '/* c-201: opens with no errors */',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// keeps inc-104 working',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// as Design release 1 shows it',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// DR2.1 layout',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// DR21 parity',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// matches parity-DR1',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// Ruled by the team',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// as the team ruled',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: '// Save and return goes to the real service change page',
        errors: [{ messageId: 'inComment' }]
      },
      {
        code: "test('Should word the hint as Design release 1 does', () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "describe('#router EUDPA-390 gating', () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "test.describe('inc-113 outstanding items', () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: `test.describe(\`EUDPA-389 \${name}\`, () => {})`,
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "it.each([1])('Should hold d-049 for %s', () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: 'it.each([1])(`req-001 case %s`, () => {})',
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "suite('q-012 answers', () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "test('saves the draft', { tag: '@EUDPA-12' }, () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      },
      {
        code: "test('saves the draft', { tag: ['@smoke', '@inc-104'] }, () => {})",
        errors: [{ messageId: 'inTestTitle' }]
      }
    ]
  }
)

ruleTester.run('no-silent-catch', codeQuality.rules['no-silent-catch'], {
  valid: [
    "promise.catch((err) => logger.warn({ err }, 'Could not record'))",
    'promise.catch(handleFailure)'
  ],
  invalid: [
    {
      code: 'promise.catch(() => undefined)',
      errors: [{ messageId: 'silent' }]
    },
    {
      code: 'promise.catch(() => {})',
      errors: [{ messageId: 'silent' }]
    },
    {
      code: 'promise.catch(function () {})',
      errors: [{ messageId: 'silent' }]
    },
    {
      code: 'promise.catch((err) => {})',
      errors: [{ messageId: 'silent' }]
    },
    {
      code: 'promise.catch(async (err) => undefined)',
      errors: [{ messageId: 'silent' }]
    }
  ]
})

ruleTester.run(
  'no-message-only-error-log',
  codeQuality.rules['no-message-only-error-log'],
  {
    valid: [
      "try { run() } catch (err) { logger.error({ err }, 'Run failed') }",
      "try { run() } catch (err) { request.logger.warn({ err, id }, 'Run failed') }",
      "logger.error('Started without a key')",
      "logger.error('Catbox Memory is for local development only')",
      "try { run() } catch { logger.warn('Run failed') }",
      "try { run() } catch (err) { console.info('Run failed') }",
      "promise.catch(() => logger.error('Run failed'))"
    ],
    invalid: [
      {
        code: "try { run() } catch (err) { logger.error('Run failed') }",
        errors: [{ messageId: 'stringOnly', data: { name: 'err' } }]
      },
      {
        code: "try { run() } catch (error) { log.warn('Run failed') }",
        errors: [{ messageId: 'stringOnly', data: { name: 'error' } }]
      },
      {
        code: `try { run() } catch (error) { request.logger.warn(\`Run failed: \${error.message}\`) }`,
        errors: [{ messageId: 'stringOnly' }]
      },
      {
        code: "try { run() } catch ({ message }) { logger.error('Run failed') }",
        errors: [{ messageId: 'stringOnly', data: { name: 'err' } }]
      },
      {
        code: "promise.catch((err) => h.logger.error('Run failed'))",
        errors: [{ messageId: 'stringOnly' }]
      }
    ]
  }
)

const SET_TERMS = ['blue-set', 'BS-01']

ruleTester.run('no-set-vocabulary', codeQuality.rules['no-set-vocabulary'], {
  valid: [
    {
      code: "const setId = 'red-set'",
      options: [{ terms: SET_TERMS }]
    },
    {
      code: "const setId = 'blue-set'"
    }
  ],
  invalid: [
    {
      code: "const setId = 'blue-set'",
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'setName' }]
    },
    {
      code: 'const blueSetCodes = []',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'setName' }]
    },
    {
      code: 'const mode = process.env.BLUE_SET_IT',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'setName' }]
    },
    {
      code: '// a BS-01 reference',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'setName' }]
    },
    {
      code: 'const block = `BS01_SPS_EX`',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'setName' }]
    }
  ]
})

describe('#templateCommentFindings', () => {
  it('Should name each template comment that carries a tracking reference', () => {
    const fixture = join(import.meta.dirname, 'fixtures/comments.njk')

    expect(templateCommentFindings([fixture])).toEqual([
      `${fixture}:2 a backlog or ruling id ("c-030")`
    ])
  })
})
