import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

/**
 * Pins the message-catalogue contract: dotted-key discipline, obligation-name
 * anchoring, verbatim parity error strings (lifted from spike-a) and
 * well-formed interpolation tokens. The key list is the reason-code contract
 * engine/reasons.js and validation/ must emit against.
 */
const dirname = path.dirname(fileURLToPath(import.meta.url))
const load = (file) =>
  JSON.parse(fs.readFileSync(path.join(dirname, file), 'utf8'))

const { messages } = load('messages.en.json')
const { obligations } = load('obligations.json')

const obligationNames = new Set(obligations.map((record) => record.name))
const keys = Object.keys(messages)
const TOKEN = /\{[a-z][a-zA-Z0-9]*\}/g
const BRACES_PER_TOKEN = 2

describe('model/messages.en.json — reason-code catalogue', () => {
  it('keys every message with a dotted locale-agnostic code', () => {
    for (const key of keys) {
      expect(key).toMatch(
        /^(mandate|format|rule)\.[a-zA-Z]+\.[a-zA-Z]+$|^scope\.[a-zA-Z]+$/
      )
    }
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('anchors mandate/format/rule codes to real obligation names (no orphans)', () => {
    for (const key of keys) {
      const [prefix, middle] = key.split('.')
      if (prefix !== 'scope') {
        expect(obligationNames, `${key} names an unknown obligation`).toContain(
          middle
        )
      }
    }
  })

  it('carries the verbatim spike-a parity strings', () => {
    expect(messages['mandate.fullName.missing']).toBe('Full name is required')
    expect(messages['mandate.email.missing']).toBe('Email is required')
    expect(messages['mandate.registration.missing']).toBe(
      'Registration is required'
    )
    expect(messages['mandate.hadClaims.missing']).toBe('Had claims is required')
    expect(messages['mandate.excessAmount.missing']).toBe(
      'Excess amount is required'
    )
    expect(messages['mandate.extras.missing']).toBe('Extras is required')
    expect(messages['mandate.claimType.atLeastOne']).toBe(
      'Add at least one claim'
    )
    expect(messages['mandate.addons.finishSelected']).toBe(
      'Finish every add-on you selected'
    )
    expect(messages['format.email.invalid']).toBe('Enter a valid Email')
    expect(messages['format.registration.invalid']).toBe(
      'Enter a valid Registration'
    )
    expect(messages['format.postcode.invalid']).toBe('Enter a valid Postcode')
    expect(messages['format.dateOfBirth.notRealDate']).toBe(
      'Date of birth must be a real date'
    )
    expect(messages['format.claimAmount.invalid']).toBe(
      'Claim amount must be a whole number of pounds greater than 0, like 1500'
    )
    expect(messages['format.modValue.invalid']).toBe(
      'Modification value must be a whole number of pounds greater than 0, like 1500'
    )
    expect(messages['rule.dateOfBirth.minAge']).toBe(
      'The main driver must be at least 17 years old'
    )
    expect(messages['rule.excessAmount.withinValue']).toBe(
      "Voluntary excess cannot be more than the vehicle's estimated value"
    )
  })

  it('interpolates only through well-formed {camelCase} tokens', () => {
    for (const [key, message] of Object.entries(messages)) {
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
      const braces = message.match(/[{}]/g) ?? []
      const tokens = message.match(TOKEN) ?? []
      expect(braces.length, `${key} has malformed braces`).toBe(
        tokens.length * BRACES_PER_TOKEN
      )
    }
  })

  it('reserves interpolation for the scope provenance code', () => {
    expect(messages['scope.answered']).toBe(
      'You answered "{answer}" for {field}'
    )
    for (const [key, message] of Object.entries(messages)) {
      if (key !== 'scope.answered') {
        expect(message.match(TOKEN), `${key} interpolates`).toBeNull()
      }
    }
  })

  it('never embeds a raw reason code in user-facing copy', () => {
    for (const message of Object.values(messages)) {
      expect(message).not.toMatch(/\b(mandate|format|rule|scope)\.[a-zA-Z]/)
    }
  })
})
