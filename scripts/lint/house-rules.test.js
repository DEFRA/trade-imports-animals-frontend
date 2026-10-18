import { join } from 'node:path'
import { Linter, RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'

import { houseRules, restrictedSyntax } from './house-rules.js'
import { templateCommentFindings } from './template-comments.js'

const ruleTester = new RuleTester()

ruleTester.run('no-tracking-ids', houseRules.rules['no-tracking-ids'], {
  valid: [
    '// Shows the review once every card is complete',
    "it('Should refuse a blank declaration', () => {})",
    "const id = 'c-201'",
    "const id = 'eudpa-573-ghost-obligation'",
    "const uuid = 'c3d0a1e2-0b1c-4d2e-9f3a-123456789abc'",
    '// Unruled transporters carry no status'
  ],
  invalid: [
    { code: '// See EUDPA-523', errors: [{ messageId: 'found' }] },
    {
      code: '/* c-201: opens with no errors */',
      errors: [{ messageId: 'found' }]
    },
    { code: '// keeps inc-104 working', errors: [{ messageId: 'found' }] },
    {
      code: '// as Design release 1 shows it',
      errors: [{ messageId: 'found' }]
    },
    { code: '// DR2.1 layout', errors: [{ messageId: 'found' }] },
    { code: '// Ruled by the team', errors: [{ messageId: 'found' }] },
    {
      code: '// Save and return goes to the real service change page',
      errors: [{ messageId: 'found' }]
    },
    {
      code: "test('Should word the hint as Design release 1 does', () => {})",
      errors: [{ messageId: 'found' }]
    },
    {
      code: `test.describe(\`EUDPA-389 \${name}\`, () => {})`,
      errors: [{ messageId: 'found' }]
    },
    {
      code: "it.each([1])('Should hold d-049 for %s', () => {})",
      errors: [{ messageId: 'found' }]
    }
  ]
})

const SET_TERMS = ['live-animals', 'GBN-AG']

ruleTester.run('no-set-vocabulary', houseRules.rules['no-set-vocabulary'], {
  valid: [
    {
      code: "const setId = 'plants-high-risk'",
      options: [{ terms: SET_TERMS }]
    }
  ],
  invalid: [
    {
      code: "const setId = 'live-animals'",
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'found' }]
    },
    {
      code: 'const liveAnimalsCodes = []',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'found' }]
    },
    {
      code: 'const mode = process.env.LIVE_ANIMALS_IT',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'found' }]
    },
    {
      code: '// a GBN-AG reference',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'found' }]
    },
    {
      code: 'const block = `GBNAG_SPS_EX`',
      options: [{ terms: SET_TERMS }],
      errors: [{ messageId: 'found' }]
    }
  ]
})

describe('restricted syntax', () => {
  const linter = new Linter()
  const messagesFor = (code) =>
    linter.verify(code, {
      rules: { 'no-restricted-syntax': ['error', ...restrictedSyntax] }
    })

  it.each([
    'record().catch(() => undefined)',
    'record().catch(() => {})',
    'record().catch(function () {})',
    "try { run() } catch (error) { logger.error('Run failed') }",
    `try { run() } catch (error) { request.logger.warn(\`Run failed \${error}\`) }`
  ])('Should refuse %s', (code) => {
    expect(messagesFor(code)).toHaveLength(1)
  })

  it.each([
    "record().catch((err) => logger.warn({ err }, 'Could not record'))",
    "try { run() } catch (err) { logger.error({ err }, 'Run failed') }",
    "logger.error('Catbox Memory is for local development only')"
  ])('Should accept %s', (code) => {
    expect(messagesFor(code)).toEqual([])
  })
})

describe('#templateCommentFindings', () => {
  it('Should name each template comment that carries a tracking id', () => {
    const fixture = join(import.meta.dirname, 'fixtures/comments.njk')

    expect(templateCommentFindings([fixture])).toEqual([
      `${fixture}:2 a backlog or ruling id ("c-030")`
    ])
  })
})
