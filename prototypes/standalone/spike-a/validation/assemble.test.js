import { describe, it, expect } from 'vitest'
import { assembleQuote, toDomain } from './assemble.js'

const completeAnswers = {
  fullName: 'Alex Driver',
  email: 'alex@example.com',
  postcode: 'SW1A 1AA',
  dateOfBirth: { day: '27', month: '3', year: '1985' },
  registration: 'AB12 CDE',
  estimatedValue: '8000',
  yearsNoClaims: '5',
  hadClaims: 'yes',
  claims: [{ claimType: 'accident', claimAmount: '500' }],
  claimsDone: true,
  coverType: 'comprehensive',
  voluntaryExcess: 'yes',
  excessAmount: '250',
  extras: ['breakdown'],
  selectedAddons: []
}

describe('spike-a assembleQuote (full-object validate + transform)', () => {
  it('assembles and transforms a valid quote to the domain shape', () => {
    const result = assembleQuote(completeAnswers)
    expect(result.ok).toBe(true)
    expect(result.quote.dateOfBirth).toBe('1985-03-27')
    expect(result.quote.hadClaims).toBe(true)
    expect(result.quote.excessAmount).toBe(250)
    expect(result.quote.estimatedValue).toBe(8000)
  })

  it('reports missing required fields with step provenance', () => {
    const result = assembleQuote({})
    expect(result.ok).toBe(false)
    const fullName = result.errors.find((e) => e.fieldId === 'fullName')
    expect(fullName.stepId).toBe('about-you')
  })

  it('fires the driver-min-age business rule', () => {
    const tooYoung = {
      ...completeAnswers,
      dateOfBirth: { day: '1', month: '1', year: '2015' }
    }
    const result = assembleQuote(tooYoung)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.message.includes('at least 17'))).toBe(
      true
    )
  })

  it('fires the excess-within-value business rule', () => {
    const overValue = {
      ...completeAnswers,
      estimatedValue: '200',
      excessAmount: '250'
    }
    const result = assembleQuote(overValue)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.fieldId === 'excessAmount')).toBe(true)
  })

  it('reports the claims loop as missing with provenance', () => {
    const noClaim = { ...completeAnswers, claims: [], claimsDone: false }
    const result = assembleQuote(noClaim)
    expect(result.ok).toBe(false)
    const claims = result.errors.find((e) => e.stepId === 'claims')
    expect(claims.because).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'hadClaims', eq: 'yes' })
      ])
    )
  })

  it('toDomain transforms form answers to the domain shape (the two-shape transform)', () => {
    const domain = toDomain(completeAnswers)
    expect(domain.dateOfBirth).toBe('1985-03-27')
    expect(domain.hadClaims).toBe(true)
    expect(domain.voluntaryExcess).toBe(true)
    expect(domain.estimatedValue).toBe(8000)
  })
})
