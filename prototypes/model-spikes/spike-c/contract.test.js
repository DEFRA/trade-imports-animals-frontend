import { describe, it, expect } from 'vitest'
import { contract } from './runtime/contract.js'
import { SHAPES } from '../shared/nav.js'

const complete = {
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

describe('spike-c contract — navigation + status', () => {
  it('routes around the conditional claims step', () => {
    expect(
      contract.next({ hadClaims: 'yes' }, 'driving-history', SHAPES.linear)
    ).toBe('claims')
    expect(
      contract.next({ hadClaims: 'no' }, 'driving-history', SHAPES.linear)
    ).toBe('cover-type')
  })

  it('derives status from currently-required fields', () => {
    expect(contract.status({}, 'cover-type', SHAPES.linear)).toBe('not-started')
    expect(
      contract.status(
        { coverType: 'comprehensive' },
        'cover-type',
        SHAPES.linear
      )
    ).toBe('complete')
  })
})

describe('spike-c validation', () => {
  it('enforces the within-page conditional from the require rule', () => {
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

  it('assembleQuote transforms a valid quote and fires business rules', () => {
    const ok = contract.assembleQuote(complete)
    expect(ok.ok).toBe(true)
    expect(ok.quote.dateOfBirth).toBe('1985-03-27')

    const bad = contract.assembleQuote({ ...complete, estimatedValue: '100' })
    expect(bad.ok).toBe(false)
  })
})
