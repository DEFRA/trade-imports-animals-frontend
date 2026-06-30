import { describe, it, expect } from 'vitest'
import { contract } from './contract.js'

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

describe('spike-b page-slice validation (derived from context.fields)', () => {
  it('rejects a malformed postcode and accepts a valid one', () => {
    expect(
      contract.validate('about-you', { fullName: 'A', postcode: 'NOPE' }).ok
    ).toBe(false)
    expect(
      contract.validate('about-you', { fullName: 'A', postcode: 'SW1A 1AA' }).ok
    ).toBe(true)
  })

  it('requires excessAmount only when voluntaryExcess is yes', () => {
    expect(
      contract.validate('cover-type', {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes'
      }).ok
    ).toBe(false)
    expect(
      contract.validate('cover-type', {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes',
        excessAmount: '250'
      }).ok
    ).toBe(true)
  })
})

describe('spike-b assembleQuote — the guard into the final state', () => {
  it('assembles + transforms a valid quote', () => {
    const result = contract.assembleQuote(complete)
    expect(result.ok).toBe(true)
    expect(result.quote.dateOfBirth).toBe('1985-03-27')
    expect(result.quote.hadClaims).toBe(true)
  })

  it('fires the driver-min-age business rule', () => {
    const result = contract.assembleQuote({
      ...complete,
      dateOfBirth: { day: '1', month: '1', year: '2015' }
    })
    expect(result.ok).toBe(false)
    expect(
      result.errors.some((error) => error.message.includes('at least 17'))
    ).toBe(true)
  })
})
