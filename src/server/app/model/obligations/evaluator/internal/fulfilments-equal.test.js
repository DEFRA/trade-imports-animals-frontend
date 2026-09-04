import { describe, it, expect } from 'vitest'
import { fulfilmentsEqual } from './fulfilments-equal.js'

describe('fulfilmentsEqual', () => {
  it('is true for referentially identical snapshots', () => {
    const snapshot = { a: 'x', b: { line1: 'y' } }
    expect(fulfilmentsEqual(snapshot, snapshot)).toBe(true)
  })

  it('is false when the two snapshots have a different number of top-level keys', () => {
    expect(fulfilmentsEqual({ a: 'x' }, { a: 'x', b: 'y' })).toBe(false)
  })

  it('is false when a top-level key present in one snapshot is missing from the other', () => {
    expect(fulfilmentsEqual({ a: 'x' }, { b: 'x' })).toBe(false)
  })

  it('is true when unindexed top-level values match by reference / primitive equality', () => {
    expect(fulfilmentsEqual({ a: 'x' }, { a: 'x' })).toBe(true)
  })

  it('is false when a top-level unindexed value differs', () => {
    expect(fulfilmentsEqual({ a: 'x' }, { a: 'y' })).toBe(false)
  })

  it('is true when indexedFulfilments maps have the same keys and values (fresh objects — purge replays produce this shape)', () => {
    const a = { commodityCode: { line0: 'Cow', line1: 'Horse' } }
    const b = { commodityCode: { line0: 'Cow', line1: 'Horse' } }
    expect(fulfilmentsEqual(a, b)).toBe(true)
  })

  it('is false when two indexedFulfilments maps have different key sets', () => {
    const a = { commodityCode: { line0: 'Cow' } }
    const b = { commodityCode: { line1: 'Cow' } }
    expect(fulfilmentsEqual(a, b)).toBe(false)
  })

  it('is false when two indexedFulfilments maps share keys but differ in a value', () => {
    const a = { commodityCode: { line0: 'Cow' } }
    const b = { commodityCode: { line0: 'Horse' } }
    expect(fulfilmentsEqual(a, b)).toBe(false)
  })

  it('is false when two indexedFulfilments maps have different key counts', () => {
    const a = { commodityCode: { line0: 'Cow' } }
    const b = { commodityCode: { line0: 'Cow', line1: 'Horse' } }
    expect(fulfilmentsEqual(a, b)).toBe(false)
  })
})
