import { describe, expect, it } from 'vitest'

import { admitsValue } from './helper-internals.js'
import { anyNotInUnionOf } from './helpers/any-not-in-union-of.js'
import { notInUnionOf } from './helpers/not-in-union-of.js'

const codeObl = { id: 'code' }
const whenTrue = { inScope: true }
const whenFalse = { inScope: false }

describe('#admitsValue', () => {
  it('Should admit a value its allowlist holds', () => {
    expect(
      admitsValue({ gateType: 'allowListed', values: ['0102'] }, '0102')
    ).toBe(true)
    expect(
      admitsValue({ gateType: 'allowListed', values: ['0102'] }, '01063300')
    ).toBe(false)
  })

  it('Should invert for a notInUnionOf complement gate', () => {
    const gate = { gateType: 'notInUnionOf', values: ['0102'] }
    expect(admitsValue(gate, '01063300')).toBe(true)
    expect(admitsValue(gate, '0102')).toBe(false)
  })

  it('Should invert for an anyNotInUnionOf complement gate', () => {
    const gate = { gateType: 'anyNotInUnionOf', values: ['0101', '01061900'] }
    expect(admitsValue(gate, '0103')).toBe(true)
    expect(admitsValue(gate, '0101')).toBe(false)
  })

  it('Should admit a blank value on neither complement gate', () => {
    for (const gateType of ['notInUnionOf', 'anyNotInUnionOf']) {
      const gate = { gateType, values: ['0101'] }
      expect(admitsValue(gate, undefined)).toBe(false)
      expect(admitsValue(gate, '')).toBe(false)
    }
  })

  it('Should admit nothing without gate metadata', () => {
    expect(admitsValue(undefined, '0102')).toBe(false)
    expect(admitsValue({}, '0102')).toBe(false)
  })

  it('Should answer a blank value as the complement gates themselves do', () => {
    const anyGate = anyNotInUnionOf(codeObl, ['0101'], whenTrue, whenFalse)
    const indexedGate = notInUnionOf(codeObl, ['0101'])
    expect(anyGate({ [codeObl.id]: { k1: '' } })).toEqual(whenFalse)
    expect(indexedGate({ [codeObl.id]: { k1: '' } })).toEqual({
      inScope: false
    })
    expect(admitsValue(anyGate.metadata, '')).toBe(false)
    expect(admitsValue(indexedGate.metadata, '')).toBe(false)
  })
})
