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

  it('is true when indexedFulfilments maps are distinct objects with the same keys and values', () => {
    const previousSnapshot = { commodityCode: { line0: '0102', line1: '0101' } }
    const nextSnapshot = { commodityCode: { line0: '0102', line1: '0101' } }
    expect(fulfilmentsEqual(previousSnapshot, nextSnapshot)).toBe(true)
  })

  it('is false when two indexedFulfilments maps have different key sets', () => {
    const previousSnapshot = { commodityCode: { line0: '0102' } }
    const nextSnapshot = { commodityCode: { line1: '0102' } }
    expect(fulfilmentsEqual(previousSnapshot, nextSnapshot)).toBe(false)
  })

  it('is false when two indexedFulfilments maps share keys but differ in a value', () => {
    const previousSnapshot = { commodityCode: { line0: '0102' } }
    const nextSnapshot = { commodityCode: { line0: '0101' } }
    expect(fulfilmentsEqual(previousSnapshot, nextSnapshot)).toBe(false)
  })

  it('is false when two indexedFulfilments maps have different key counts', () => {
    const previousSnapshot = { commodityCode: { line0: '0102' } }
    const nextSnapshot = { commodityCode: { line0: '0102', line1: '0101' } }
    expect(fulfilmentsEqual(previousSnapshot, nextSnapshot)).toBe(false)
  })
})
