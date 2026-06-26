import { describe, it, expect } from 'vitest'
import { contract } from './runtime/contract.js'
import { SHAPES } from '../shared/nav.js'

const grouped = SHAPES.grouped

describe('spike-b contract — navigation falls out of the machine', () => {
  it('routes driving-history to claims when a claim was declared', () => {
    expect(
      contract.next({ hadClaims: 'yes' }, 'driving-history', grouped)
    ).toBe('claims')
  })

  it('skips claims when none declared', () => {
    expect(contract.next({ hadClaims: 'no' }, 'driving-history', grouped)).toBe(
      'cover-type'
    )
  })

  it('prev uses the reverse index (claims vs driving-history into cover-type)', () => {
    expect(contract.prev({ hadClaims: 'yes' }, 'cover-type', grouped)).toBe(
      'claims'
    )
    expect(contract.prev({ hadClaims: 'no' }, 'cover-type', grouped)).toBe(
      'driving-history'
    )
  })

  it('grouped navigation stops at the group boundary', () => {
    expect(contract.next({ hadClaims: 'no' }, 'your-vehicle', grouped)).toEqual(
      {
        terminal: 'hub'
      }
    )
  })
})

describe('spike-b contract — status, cascade, provenance', () => {
  it('derives status from the required fields of a reachable state', () => {
    expect(contract.status({}, 'about-you', grouped)).toBe('not-started')
    expect(contract.status({ fullName: 'Alex' }, 'about-you', grouped)).toBe(
      'complete'
    )
  })

  it('marks an unreachable state not-applicable', () => {
    expect(contract.status({ hadClaims: 'no' }, 'claims', grouped)).toBe(
      'not-applicable'
    )
  })

  it('clears claims when the guard input flips and the state drops out', () => {
    const after = contract.applyAnswer(
      { hadClaims: 'yes', claims: [{ claimType: 'theft' }], claimsDone: true },
      'driving-history',
      { hadClaims: 'no' }
    )
    expect(after.claims).toEqual([])
    expect(after.claimsDone).toBe(false)
  })

  it('attaches the guard chain as provenance on a missing conditional step', () => {
    const claims = contract
      .missingRequired({ hadClaims: 'yes' })
      .find((entry) => entry.stepId === 'claims')
    expect(claims.because).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'hadClaims', eq: 'yes' })
      ])
    )
  })
})
