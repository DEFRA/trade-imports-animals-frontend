import { describe, expect, it } from 'vitest'
import { isObject } from './object.js'

describe('isObject', () => {
  it('Should return true for a plain object', () => {
    expect(isObject({ line1: 'a', line2: 'b' })).toBe(true)
  })

  it('Should return true for an empty object', () => {
    expect(isObject({})).toBe(true)
  })

  it('Should return false for primitive strings', () => {
    expect(isObject('a')).toBe(false)
    expect(isObject('')).toBe(false)
  })

  it('Should return false for other primitives', () => {
    expect(isObject(0)).toBe(false)
    expect(isObject(false)).toBe(false)
    expect(isObject(true)).toBe(false)
  })

  it('Should return false for undefined', () => {
    expect(isObject(undefined)).toBe(false)
  })

  it('Should return false for null', () => {
    expect(isObject(null)).toBe(false)
  })

  it('Should return false for arrays', () => {
    expect(isObject([])).toBe(false)
    expect(isObject(['a', 'b'])).toBe(false)
  })
})
