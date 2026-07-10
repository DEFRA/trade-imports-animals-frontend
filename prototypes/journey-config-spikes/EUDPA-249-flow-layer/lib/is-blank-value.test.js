import { describe, it, expect } from 'vitest'

import { isBlankValue } from './is-blank-value.js'

describe('isBlankValue', () => {
  it('treats undefined and null as blank', () => {
    expect(isBlankValue(undefined)).toBe(true)
    expect(isBlankValue(null)).toBe(true)
  })

  it('treats empty string as blank; non-empty as filled', () => {
    expect(isBlankValue('')).toBe(true)
    expect(isBlankValue('a')).toBe(false)
    // Whitespace-only is NOT trimmed at this layer — that's a
    // widget/validation concern. Contract.validatePagePayload does
    // its own trim() before calling us so we don't double-trim.
    expect(isBlankValue(' ')).toBe(false)
  })

  it('treats empty array as blank; non-empty as filled', () => {
    expect(isBlankValue([])).toBe(true)
    expect(isBlankValue(['a'])).toBe(false)
  })

  it('treats empty object as blank (Fix #5 regression)', () => {
    // isBlankLeaf used to gate the composite branch on
    // `Object.keys(value).length > 0`, so `{}` fell through to
    // `return false` and was mis-classified as filled.
    expect(isBlankValue({})).toBe(true)
  })

  it('treats a composite with every sub-field blank as blank (Fix #4/#6/#7 regression)', () => {
    // Address block after the user cleared every input: this must
    // roll back to Not started, not stay Fulfilled.
    expect(
      isBlankValue({
        name: '',
        addressLine1: '',
        town: '',
        postcode: ''
      })
    ).toBe(true)
    expect(isBlankValue({ name: null, addressLine1: undefined })).toBe(true)
  })

  it('treats a composite with any non-blank sub-field as filled', () => {
    expect(
      isBlankValue({
        name: '',
        addressLine1: '10 High St',
        town: '',
        postcode: ''
      })
    ).toBe(false)
  })

  it('treats primitives other than string as filled', () => {
    // 0 is filled (`numberOfAnimals: 0` is an intentional value, not
    // an "I haven't answered yet"). Same for false, though we don't
    // have boolean widgets today.
    expect(isBlankValue(0)).toBe(false)
    expect(isBlankValue(false)).toBe(false)
  })
})
