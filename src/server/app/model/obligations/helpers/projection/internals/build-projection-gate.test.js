import { describe, it, expect } from 'vitest'

import { buildProjectionGate } from './build-projection-gate.js'

const gateObligation = { id: 'gate' }

const alwaysAdmits = () => true
const neverAdmits = () => false

describe('#buildProjectionGate', () => {
  describe('metadata', () => {
    it('stamps the type, obligation id, projection id, and reasons', () => {
      const projectionGroup = { id: 'group' }
      const reasons = ['because']
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => ['a'],
        admits: alwaysAdmits,
        projectionGroup,
        reasons
      })
      expect(fn.metadata.type).toBe('testKind')
      expect(fn.metadata.obligation).toBe('gate')
      expect(fn.metadata.projection).toBe('group')
      expect(fn.metadata.reasons).toEqual(['because'])
    })

    it('sets projection to null when no projection group is supplied', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        projectionGroup: null
      })
      expect(fn.metadata.projection).toBeNull()
    })

    it('exposes values via a getter that calls currentValues each time', () => {
      let call = 0
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [`call-${++call}`],
        admits: alwaysAdmits,
        projectionGroup: null
      })
      expect(fn.metadata.values).toEqual(['call-1'])
      expect(fn.metadata.values).toEqual(['call-2'])
    })

    it('defaults reasons to null when not supplied', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        projectionGroup: null
      })
      expect(fn.metadata.reasons).toBeNull()
    })
  })

  describe('applyTo call', () => {
    it('returns { inScope: false } when the predicate admits no stored values', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: neverAdmits,
        projectionGroup: null
      })
      expect(fn({ gate: { k1: 'x', k2: 'y' } }, undefined)).toEqual({
        inScope: false
      })
    })

    it('returns { inScope: true, records } for a depth-1 gate whose keys pass', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'x',
        projectionGroup: null
      })
      expect(fn({ gate: { k1: 'x', k2: 'y' } }, undefined)).toEqual({
        inScope: true,
        fulfilmentIndexes: ['k1']
      })
    })

    it('folds reasons into the returned decision when in scope', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        projectionGroup: null,
        reasons: ['r1']
      })
      const decision = fn({ gate: { k1: 'x' } }, undefined)
      expect(decision).toEqual({
        inScope: true,
        fulfilmentIndexes: ['k1'],
        reasons: ['r1']
      })
    })

    it('does not fold reasons in when out of scope', () => {
      const fn = buildProjectionGate({
        type: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: neverAdmits,
        projectionGroup: null,
        reasons: ['r1']
      })
      expect(fn({ gate: {} }, undefined)).toEqual({ inScope: false })
    })
  })
})
