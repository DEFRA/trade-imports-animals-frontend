import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  journeyScopeRegistry,
  createJourneyScopeRegistry,
  ENGINE_MANDATORY_ALWAYS
} from './journey-rules.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const { obligations } = JSON.parse(
  fs.readFileSync(
    path.join(dirname, '..', '..', 'model', 'obligations.json'),
    'utf8'
  )
)

/** Minimal name view over a plain name -> value fixture. */
const view = (values = {}) => ({ valueOf: (name) => values[name] })

const fire = (obligationName, values) => {
  const outcomes = journeyScopeRegistry
    .rulesFor(obligationName)
    .map(({ when }) => when(view(values), {}))
    .filter(Boolean)
  expect(outcomes.length).toBeLessThanOrEqual(1)
  return outcomes[0] ?? null
}

describe('engine/scope/journey-rules — the canonical engine-mandatory set', () => {
  it('pins the unconditionally mandatory obligations (parity ruling c)', () => {
    expect(ENGINE_MANDATORY_ALWAYS).toEqual([
      'email',
      'fullName',
      'registration',
      'hadClaims',
      'coverType',
      'extras',
      'addons'
    ])
  })

  it('targets only real obligations, and exactly the expected fifteen', () => {
    journeyScopeRegistry.assertCoverage(
      obligations.map((obligation) => obligation.name)
    )
    expect([...journeyScopeRegistry.obligationNames()].sort()).toEqual(
      [
        'addons',
        'claimAmount',
        'claimType',
        'coverType',
        'driverDob',
        'driverName',
        'email',
        'excessAmount',
        'extras',
        'fullName',
        'hadClaims',
        'modDescription',
        'modValue',
        'ncdYears',
        'registration',
        'relationship'
      ].sort()
    )
  })

  it('fires the always-mandatory rules on empty state with their mandate codes', () => {
    const codes = {
      email: 'mandate.email.missing',
      fullName: 'mandate.fullName.missing',
      registration: 'mandate.registration.missing',
      hadClaims: 'mandate.hadClaims.missing',
      coverType: 'mandate.coverType.missing',
      extras: 'mandate.extras.missing',
      addons: 'mandate.addons.finishSelected'
    }
    for (const name of ENGINE_MANDATORY_ALWAYS) {
      const outcome = fire(name, {})
      expect(outcome.status, name).toBe('mandatory')
      expect(outcome.reasons.map((reason) => reason.code)).toEqual([
        codes[name]
      ])
    }
  })

  it('scopes excessAmount by the voluntaryExcess answer, stacking provenance', () => {
    expect(fire('excessAmount', {})).toBeNull()
    expect(fire('excessAmount', { voluntaryExcess: 'no' })).toBeNull()
    const outcome = fire('excessAmount', { voluntaryExcess: 'yes' })
    expect(outcome.status).toBe('mandatory')
    expect(outcome.reasons.map((reason) => reason.code)).toEqual([
      'scope.answered',
      'mandate.excessAmount.missing'
    ])
    expect(outcome.reasons[0].values).toEqual({
      answer: 'yes',
      field: 'Voluntary excess'
    })
  })

  it('scopes the claims collection by hadClaims: mandatory type, optional amount', () => {
    expect(fire('claimType', { hadClaims: 'no' })).toBeNull()
    expect(fire('claimAmount', {})).toBeNull()
    const claimType = fire('claimType', { hadClaims: 'yes' })
    expect(claimType.status).toBe('mandatory')
    expect(claimType.reasons.map((reason) => reason.code)).toEqual([
      'scope.answered',
      'mandate.claimType.atLeastOne'
    ])
    expect(claimType.reasons[0].values).toEqual({
      answer: 'yes',
      field: 'Had claims'
    })
    const claimAmount = fire('claimAmount', { hadClaims: 'yes' })
    expect(claimAmount.status).toBeUndefined()
    expect(claimAmount.reasons.map((reason) => reason.code)).toEqual([
      'scope.answered'
    ])
  })

  it('scopes addon follow-ups by selection with finishSelected mandates', () => {
    const selected = { addons: ['named-driver', 'protected-ncd'] }
    for (const name of ['driverName', 'relationship', 'ncdYears']) {
      const outcome = fire(name, selected)
      expect(outcome.status, name).toBe('mandatory')
      expect(outcome.reasons.map((reason) => reason.code)).toEqual([
        'scope.answered',
        'mandate.addons.finishSelected'
      ])
    }
    expect(fire('modDescription', selected)).toBeNull()
    expect(fire('modValue', selected)).toBeNull()
    const modOutcome = fire('modDescription', { addons: ['modifications'] })
    expect(modOutcome.status).toBe('mandatory')
    expect(modOutcome.reasons[0].values).toEqual({
      answer: 'modifications',
      field: 'Addons'
    })
  })

  it('keeps driverDob in scope but optional when named-driver is selected', () => {
    expect(fire('driverDob', {})).toBeNull()
    const outcome = fire('driverDob', { addons: ['named-driver'] })
    expect(outcome.status).toBeUndefined()
    expect(outcome.reasons.map((reason) => reason.code)).toEqual([
      'scope.answered'
    ])
  })

  it('ignores non-array addons answers (no scope until a real selection exists)', () => {
    expect(fire('driverName', { addons: 'named-driver' })).toBeNull()
  })

  it('builds independent registries for fixtures', () => {
    const fresh = createJourneyScopeRegistry()
    expect(fresh).not.toBe(journeyScopeRegistry)
    expect(fresh.obligationNames()).toEqual(
      journeyScopeRegistry.obligationNames()
    )
  })
})
