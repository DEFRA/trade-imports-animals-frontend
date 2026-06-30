import { describe, it, expect } from 'vitest'
import { contract } from './runtime/selectors.js'
import { grouped } from './journey.js'

describe('spike-a runtime contract — navigation', () => {
  it('routes driving-history to the claims loop when a claim was declared', () => {
    expect(
      contract.next({ hadClaims: 'yes' }, 'driving-history', grouped)
    ).toBe('claims')
  })

  it('skips the claims loop when no claim was declared', () => {
    expect(contract.next({ hadClaims: 'no' }, 'driving-history', grouped)).toBe(
      'cover-type'
    )
  })

  it('returns to the hub at the end of a task group', () => {
    expect(contract.next({ hadClaims: 'no' }, 'your-vehicle', grouped)).toEqual(
      {
        terminal: 'hub'
      }
    )
  })

  it('returns to the hub before the first step of a task group', () => {
    expect(contract.prev({}, 'about-you', grouped)).toEqual({
      terminal: 'hub'
    })
  })
})

describe('spike-a runtime contract — status', () => {
  it('is not-started with no answers', () => {
    expect(contract.status({}, 'about-you', grouped)).toBe('not-started')
  })

  it('is complete once the required field is satisfied', () => {
    expect(contract.status({ fullName: 'Alex' }, 'about-you', grouped)).toBe(
      'complete'
    )
  })

  it('is partial when an optional field is answered but a required one is not', () => {
    expect(
      contract.status({ phone: '07700 900123' }, 'about-you', grouped)
    ).toBe('partial')
  })

  it('is not-applicable for a conditional step that does not apply', () => {
    expect(contract.status({ hadClaims: 'no' }, 'claims', grouped)).toBe(
      'not-applicable'
    )
  })

  it('treats the claims loop as complete only once it is marked done', () => {
    const withClaim = { hadClaims: 'yes', claims: [{ claimType: 'accident' }] }
    expect(contract.status(withClaim, 'claims', grouped)).toBe('partial')
    expect(
      contract.status({ ...withClaim, claimsDone: true }, 'claims', grouped)
    ).toBe('complete')
  })
})

describe('spike-a runtime contract — applyAnswer cascade', () => {
  it('clears the claims loop and its data when hadClaims flips to no', () => {
    const before = {
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      claimsDone: true
    }
    const after = contract.applyAnswer(before, 'driving-history', {
      yearsNoClaims: '5',
      hadClaims: 'no',
      penaltyPoints: '0'
    })
    expect(after.hadClaims).toBe('no')
    expect(after.claims).toEqual([])
    expect(after.claimsDone).toBe(false)
  })

  it('does not touch claims when hadClaims stays yes', () => {
    const before = {
      hadClaims: 'yes',
      claims: [{ claimType: 'theft' }],
      claimsDone: true
    }
    const after = contract.applyAnswer(before, 'driving-history', {
      hadClaims: 'yes'
    })
    expect(after.claims).toEqual([{ claimType: 'theft' }])
  })
})

describe('spike-a runtime contract — provenance', () => {
  it('reports why a conditional step is still required', () => {
    const missing = contract.missingRequired({ hadClaims: 'yes' })
    const claims = missing.find((entry) => entry.stepId === 'claims')
    expect(claims).toBeDefined()
    expect(claims.because).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'hadClaims', eq: 'yes' })
      ])
    )
  })

  it('reports why a within-page conditional field is required', () => {
    const missing = contract.missingRequired({ voluntaryExcess: 'yes' })
    const excess = missing.find((entry) => entry.fieldId === 'excessAmount')
    expect(excess).toBeDefined()
    expect(excess.because).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'voluntaryExcess', eq: 'yes' })
      ])
    )
  })
})

describe('spike-a runtime contract — applicable steps', () => {
  it('includes the claims loop only when a claim was declared', () => {
    expect(contract.applicableSteps({ hadClaims: 'yes' })).toContain('claims')
    expect(contract.applicableSteps({ hadClaims: 'no' })).not.toContain(
      'claims'
    )
  })
})
