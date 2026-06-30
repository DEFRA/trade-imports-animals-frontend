import { describe, it, expect } from 'vitest'
import { contract } from './index.js'
import { grouped } from '../journey.js'

const complete = {
  email: 'alex@example.com',
  fullName: 'Alex Driver',
  postcode: 'SW1A 1AA',
  dateOfBirth: { day: '27', month: '3', year: '1985' },
  registration: 'AB12 CDE',
  estimatedValue: '8000',
  hadClaims: 'yes',
  claims: [{ claimType: 'accident', claimAmount: '500' }],
  claimsDone: true,
  coverType: 'comprehensive',
  voluntaryExcess: 'yes',
  excessAmount: '250',
  extras: ['breakdown'],
  selectedAddons: []
}

describe('spike-d contract — applicability from the active if/then', () => {
  it('includes claims only when hadClaims = yes', () => {
    expect(contract.applicableSteps({ hadClaims: 'yes' })).toContain('claims')
    expect(contract.applicableSteps({ hadClaims: 'no' })).not.toContain(
      'claims'
    )
  })

  it('navigates around the conditional step', () => {
    expect(
      contract.next({ hadClaims: 'yes' }, 'driving-history', grouped)
    ).toBe('claims')
    expect(contract.next({ hadClaims: 'no' }, 'driving-history', grouped)).toBe(
      'cover-type'
    )
  })

  it('strips claims when the if-condition flips (applyAnswer)', () => {
    const after = contract.applyAnswer(
      { hadClaims: 'yes', claims: [{ claimType: 'theft' }], claimsDone: true },
      'driving-history',
      { hadClaims: 'no' }
    )
    expect(after.claims).toEqual([])
    expect(after.claimsDone).toBe(false)
  })
})

describe('spike-d assembleQuote', () => {
  it('validates the full schema, transforms, and passes business rules', () => {
    const result = contract.assembleQuote(complete)
    expect(result.ok).toBe(true)
    expect(result.quote.dateOfBirth).toBe('1985-03-27')
    expect(result.quote.hadClaims).toBe(true)
  })

  it('fires the adapter-side business rule JSON Schema cannot express', () => {
    const result = contract.assembleQuote({
      ...complete,
      estimatedValue: '100'
    })
    expect(result.ok).toBe(false)
    expect(
      result.errors.some((error) => error.fieldId === 'excessAmount')
    ).toBe(true)
  })
})
