import { describe, it, expect } from 'vitest'

import { buildIndexedGate } from './build-indexed-gate.js'

const gateObligation = { id: 'gate' }

const alwaysAdmits = () => true
const neverAdmits = () => false

describe('#buildIndexedGate', () => {
  describe('metadata', () => {
    it('stamps the gateType, obligationId, gatedParentGroupId, and reasons', () => {
      const gatedParentGroup = { id: 'group' }
      const reasons = ['because']
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => ['a'],
        admits: alwaysAdmits,
        gatedParentGroup,
        reasons
      })
      expect(fn.metadata.gateType).toBe('testKind')
      expect(fn.metadata.obligationId).toBe('gate')
      expect(fn.metadata.gatedParentGroupId).toBe('group')
      expect(fn.metadata.reasons).toEqual(['because'])
    })

    it('sets gatedParentGroupId to null when no gatedParentGroup is supplied', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        gatedParentGroup: null
      })
      expect(fn.metadata.gatedParentGroupId).toBeNull()
    })

    it('exposes values via a getter that calls currentValues each time', () => {
      let call = 0
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [`call-${++call}`],
        admits: alwaysAdmits,
        gatedParentGroup: null
      })
      expect(fn.metadata.values).toEqual(['call-1'])
      expect(fn.metadata.values).toEqual(['call-2'])
    })

    it('defaults reasons to null when not supplied', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        gatedParentGroup: null
      })
      expect(fn.metadata.reasons).toBeNull()
    })
  })

  describe('applyTo call', () => {
    it('returns { inScope: false } when the predicate admits no stored values', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: neverAdmits,
        gatedParentGroup: null
      })
      expect(fn({ gate: { k1: 'x', k2: 'y' } }, undefined)).toEqual({
        inScope: false
      })
    })

    it('returns { inScope: true, fulfilmentIndexes } for a depth-1 gate whose keys pass', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'x',
        gatedParentGroup: null
      })
      expect(fn({ gate: { k1: 'x', k2: 'y' } }, undefined)).toEqual({
        inScope: true,
        fulfilmentIndexes: ['k1']
      })
    })

    it('folds reasons into the returned decision when in scope', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: alwaysAdmits,
        gatedParentGroup: null,
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
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: neverAdmits,
        gatedParentGroup: null,
        reasons: ['r1']
      })
      expect(fn({ gate: {} }, undefined)).toEqual({ inScope: false })
    })
  })

  // The gate's stored value can be a single stored value (an unindexed
  // obligation as the gate source) rather than an indexedFulfilments map.
  // `runGate` routes those through `runGateUnindexed` — no
  // per-key iteration; the predicate either admits the value or it doesn't.
  describe('applyTo call — unindexed gate value', () => {
    it('returns { inScope: false } when the predicate rejects the value', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'yes',
        gatedParentGroup: null
      })
      expect(fn({ gate: 'no' }, undefined)).toEqual({ inScope: false })
    })

    it('returns { inScope: true } when the predicate admits the value and no gatedParentGroup is set', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'yes',
        gatedParentGroup: null
      })
      expect(fn({ gate: 'yes' }, undefined)).toEqual({ inScope: true })
    })

    it('fans the yes verdict out across every instance of a gatedParentGroup when the value passes', () => {
      const gatedParentGroup = { id: 'commodityLines' }
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'yes',
        gatedParentGroup
      })
      const indexes = new Map([['commodityLines', ['line0', 'line1']]])
      expect(fn({ gate: 'yes' }, indexes)).toEqual({
        inScope: true,
        fulfilmentIndexes: ['line0', 'line1']
      })
    })

    it('returns { inScope: false } when the value passes but the gatedParentGroup has no instances', () => {
      const gatedParentGroup = { id: 'commodityLines' }
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value === 'yes',
        gatedParentGroup
      })
      const indexes = new Map([['commodityLines', []]])
      expect(fn({ gate: 'yes' }, indexes)).toEqual({ inScope: false })
    })

    it('treats a missing (undefined) fulfilment as an absent value the predicate can reject', () => {
      const fn = buildIndexedGate({
        gateType: 'testKind',
        gateObligation,
        currentValues: () => [],
        admits: (value) => value !== undefined,
        gatedParentGroup: null
      })
      // No `gate` key in fulfilments — runGate falls back to `{}`,
      // which is an indexed-shape branch. Passing an unindexed value via a
      // nullish check would be a separate arrangement; this ensures the
      // wrapper doesn't blow up on missing storage.
      expect(fn({}, undefined)).toEqual({ inScope: false })
    })
  })
})
