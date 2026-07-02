import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { createResolver, resolveMessage, resolveReason } from './resolve.js'
import { reasonCodes } from '../engine/reasons.js'
import { formatCodesFor } from '../validation/format-checks.js'
import { mandateMissingCode } from '../validation/save-check.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const readModel = (file) =>
  JSON.parse(fs.readFileSync(path.join(dirname, '..', 'model', file), 'utf8'))

const { messages } = readModel('messages.en.json')
const { obligations } = readModel('obligations.json')

/** Dummy interpolation values for every token a template names. */
const valuesFor = (template) =>
  Object.fromEntries(
    [...template.matchAll(/\{([a-zA-Z]+)\}/g)].map((match) => [match[1], 'x'])
  )

describe('i18n/resolve — the throwing reason-code resolver (graft 7)', () => {
  const fixture = createResolver({
    'demo.plain': 'A plain message',
    'demo.tokens': 'You answered "{answer}" for {field}'
  })

  it('resolves a plain code to its copy', () => {
    expect(fixture('demo.plain')).toBe('A plain message')
  })

  it('interpolates values into {token} placeholders', () => {
    expect(fixture('demo.tokens', { answer: 'yes', field: 'Had claims' })).toBe(
      'You answered "yes" for Had claims'
    )
  })

  it('throws on a code outside the catalogue', () => {
    expect(() => fixture('demo.unknown')).toThrow(
      'Unknown message code "demo.unknown"'
    )
  })

  it('throws on an unresolved placeholder rather than leaking it', () => {
    expect(() => fixture('demo.tokens', { answer: 'yes' })).toThrow(
      'Unresolved placeholder "{field}" in "demo.tokens"'
    )
  })

  it('binds the journey resolver to model/messages.en.json verbatim', () => {
    expect(resolveMessage('mandate.fullName.missing')).toBe(
      'Full name is required'
    )
    expect(
      resolveMessage('scope.answered', { answer: 'yes', field: 'Had claims' })
    ).toBe('You answered "yes" for Had claims')
  })

  it('resolves engine reason records directly', () => {
    expect(resolveReason({ code: 'mandate.claimType.atLeastOne' })).toBe(
      'Add at least one claim'
    )
  })
})

describe('the rank-14 no-leaked-codes gate (build-time half of graft 7)', () => {
  it('resolves every engine reason code', () => {
    for (const code of reasonCodes) {
      const copy = resolveMessage(code, valuesFor(messages[code]))
      expect(copy.length).toBeGreaterThan(0)
      expect(copy).not.toMatch(/\{[a-zA-Z]+\}/)
    }
  })

  it('resolves every validation format code over the real catalogue', () => {
    const codes = obligations.flatMap((record) => formatCodesFor(record))
    expect(codes.length).toBeGreaterThan(0)
    for (const code of codes) {
      expect(resolveMessage(code).length).toBeGreaterThan(0)
    }
  })

  it('resolves the hard page-mandate code for fullName (Rulings item 3)', () => {
    expect(resolveMessage(mandateMissingCode('fullName'))).toBe(
      'Full name is required'
    )
  })
})
