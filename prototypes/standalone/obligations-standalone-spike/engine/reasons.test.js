import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { reason, reasonCodes, humaniseName, scopeAnswered } from './reasons.js'

/**
 * The lockstep contract: the reason-code registry and the message catalogue
 * are the same key set, both ways. Adding a code without copy (or copy
 * without a code) fails here before it can leak a raw code to the DOM.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const { messages } = JSON.parse(
  fs.readFileSync(path.join(dirname, '..', 'model', 'messages.en.json'), 'utf8')
)

describe('engine/reasons — the dotted reason-code registry', () => {
  it('stays in lockstep with model/messages.en.json (both directions)', () => {
    expect(reasonCodes).toEqual(Object.keys(messages).sort())
  })

  it('builds coded records carrying a developer-facing explanation', () => {
    const record = reason('mandate.fullName.missing')
    expect(record.code).toBe('mandate.fullName.missing')
    expect(typeof record.explanation).toBe('string')
    expect(record.explanation.length).toBeGreaterThan(0)
    expect(record.values).toBeUndefined()
  })

  it('never embeds user-facing copy in explanations (locale-agnostic)', () => {
    for (const code of reasonCodes) {
      expect(reason(code).explanation).not.toBe(messages[code])
    }
  })

  it('passes interpolation values through', () => {
    const record = reason('scope.answered', {
      answer: 'yes',
      field: 'Had claims'
    })
    expect(record.values).toEqual({ answer: 'yes', field: 'Had claims' })
  })

  it('throws on codes outside the registry', () => {
    expect(() => reason('mandate.fullName.wrong')).toThrow(
      'Unknown reason code "mandate.fullName.wrong"'
    )
  })

  it('humanises obligation names into display form', () => {
    expect(humaniseName('hadClaims')).toBe('Had claims')
    expect(humaniseName('voluntaryExcess')).toBe('Voluntary excess')
    expect(humaniseName('email')).toBe('Email')
    expect(humaniseName('addons')).toBe('Addons')
  })

  it('authors scope provenance with exactly the tokens the message interpolates', () => {
    const record = scopeAnswered('yes', 'hadClaims')
    expect(record.code).toBe('scope.answered')
    const tokens = [...messages['scope.answered'].matchAll(/\{([a-zA-Z]+)\}/g)]
      .map((match) => match[1])
      .sort()
    expect(Object.keys(record.values).sort()).toEqual(tokens)
    expect(record.values).toEqual({ answer: 'yes', field: 'Had claims' })
  })
})
