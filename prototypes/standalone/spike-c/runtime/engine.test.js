import { describe, it, expect } from 'vitest'
import {
  evaluate,
  applicableSteps,
  missingRequired,
  assertionErrors
} from './engine.js'
import { contract } from './contract/index.js'

describe('spike-c rules engine — required-ness is rule-derived', () => {
  it('makes excessAmount required only when voluntaryExcess is yes', () => {
    expect(evaluate({}).requiredByField.has('excessAmount')).toBe(false)
    expect(
      evaluate({ voluntaryExcess: 'yes' }).requiredByField.has('excessAmount')
    ).toBe(true)
  })

  it('makes the claims step live only when hadClaims is yes', () => {
    expect(applicableSteps({ hadClaims: 'yes' })).toContain('claims')
    expect(applicableSteps({ hadClaims: 'no' })).not.toContain('claims')
  })

  it('retracts a requirement when its rule stops firing (cascade)', () => {
    const after = contract.applyAnswer(
      { hadClaims: 'yes', claims: [{ claimType: 'theft' }], claimsDone: true },
      'driving-history',
      { hadClaims: 'no' }
    )
    expect(after.claims).toEqual([])
    expect(after.claimsDone).toBe(false)
  })
})

describe('spike-c provenance — because is AUTHORED, not synthesised', () => {
  it('attaches the rule reason to a conditional requirement', () => {
    const excess = missingRequired({ voluntaryExcess: 'yes' }).find(
      (entry) => entry.fieldId === 'excessAmount'
    )
    expect(excess.because).toEqual([
      { reason: 'You chose to pay a voluntary excess' }
    ])
  })

  it('attaches the rule reason to a live loop step', () => {
    const claims = missingRequired({ hadClaims: 'yes' }).find(
      (entry) => entry.stepId === 'claims'
    )
    expect(claims.because).toEqual([
      { reason: 'You said you have had a claim in the last 5 years' }
    ])
  })

  it('an unconditional requirement has no because reason', () => {
    const fullName = missingRequired({}).find(
      (entry) => entry.fieldId === 'fullName'
    )
    expect(fullName.because).toEqual([])
  })
})

describe('spike-c assertion rules', () => {
  it('fires min-age and lte with their authored reasons', () => {
    const young = assertionErrors({
      dateOfBirth: { day: '1', month: '1', year: '2015' }
    })
    expect(young[0].message).toContain('at least 17')

    const over = assertionErrors({
      voluntaryExcess: 'yes',
      excessAmount: '500',
      estimatedValue: '100'
    })
    expect(over[0].fieldId).toBe('excessAmount')
  })
})
