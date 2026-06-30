import { describe, it, expect } from 'vitest'
import { machine } from './runtime/model.js'
import {
  transition,
  realizedPath,
  reverseIndex,
  prevState,
  incomingGuard
} from './runtime/interpreter.js'

describe('spike-b interpreter (pure, no journey knowledge)', () => {
  it('takes the guarded transition to claims when the guard holds', () => {
    expect(transition(machine, 'driving-history', { hadClaims: 'yes' })).toBe(
      'claims'
    )
  })

  it('falls through to the default transition when the guard fails', () => {
    expect(transition(machine, 'driving-history', { hadClaims: 'no' })).toBe(
      'cover-type'
    )
  })

  it('walks the realised path including claims only when reachable', () => {
    expect(realizedPath(machine, { hadClaims: 'yes' })).toContain('claims')
    expect(realizedPath(machine, { hadClaims: 'no' })).not.toContain('claims')
  })

  it('resolves prev deterministically when two sources target one state', () => {
    const index = reverseIndex(machine)
    expect(prevState(machine, 'cover-type', { hadClaims: 'yes' }, index)).toBe(
      'claims'
    )
    expect(prevState(machine, 'cover-type', { hadClaims: 'no' }, index)).toBe(
      'driving-history'
    )
  })

  it('exposes the guard on the realised transition as provenance', () => {
    expect(incomingGuard(machine, 'claims', { hadClaims: 'yes' })).toEqual({
      field: 'hadClaims',
      eq: 'yes'
    })
    expect(
      incomingGuard(machine, 'cover-type', { hadClaims: 'no' })
    ).toBeUndefined()
  })

  it('returns null at the final state', () => {
    expect(transition(machine, 'addons', {})).toBe('summary')
    expect(transition(machine, 'summary', {})).toBeNull()
  })
})
