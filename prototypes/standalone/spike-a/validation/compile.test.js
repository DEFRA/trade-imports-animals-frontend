import { describe, it, expect } from 'vitest'
import { validateStep } from './compile.js'

describe('spike-a page-slice validation (derived from the model)', () => {
  it('rejects a missing required field with a field-anchored error', () => {
    const result = validateStep('about-you', {})
    expect(result.ok).toBe(false)
    expect(result.errors.fullName).toBeDefined()
    expect(result.errorSummary[0].href).toBe('#fullName')
  })

  it('rejects a malformed formatted string (postcode pattern)', () => {
    const bad = validateStep('about-you', {
      fullName: 'Alex',
      postcode: 'NOPE'
    })
    expect(bad.ok).toBe(false)
    expect(bad.errors.postcode).toBeDefined()
  })

  it('accepts a valid postcode', () => {
    const good = validateStep('about-you', {
      fullName: 'Alex',
      postcode: 'SW1A 1AA'
    })
    expect(good.ok).toBe(true)
  })

  it('enforces a number range from the model', () => {
    const bad = validateStep('driving-history', {
      hadClaims: 'yes',
      penaltyPoints: '50'
    })
    expect(bad.ok).toBe(false)
    expect(bad.errors.penaltyPoints).toBeDefined()
  })

  it('requires excessAmount only when voluntaryExcess is yes (within-page conditional)', () => {
    const missing = validateStep('cover-type', {
      coverType: 'comprehensive',
      voluntaryExcess: 'yes'
    })
    expect(missing.ok).toBe(false)
    expect(missing.errors.excessAmount).toBeDefined()

    const provided = validateStep('cover-type', {
      coverType: 'comprehensive',
      voluntaryExcess: 'yes',
      excessAmount: '250'
    })
    expect(provided.ok).toBe(true)

    const notNeeded = validateStep('cover-type', {
      coverType: 'comprehensive',
      voluntaryExcess: 'no'
    })
    expect(notNeeded.ok).toBe(true)
  })
})
