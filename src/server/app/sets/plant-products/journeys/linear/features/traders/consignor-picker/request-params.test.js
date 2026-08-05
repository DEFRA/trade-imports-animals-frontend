import { describe, expect, it } from 'vitest'

import { isSearchAction, pageNumber } from './request-params.js'

describe('consignor picker request params', () => {
  it.each([
    { name: 'a numeric string', value: '3', expected: 3 },
    { name: 'a missing value', expected: 1 },
    { name: 'an empty string', value: '', expected: 1 },
    { name: 'a non-numeric string', value: 'abc', expected: 1 }
  ])('reads $name as $expected', ({ value, expected }) => {
    expect(pageNumber(value)).toBe(expected)
  })

  // Out-of-range numbers come back untouched: clamping a page to the number of
  // pages needs the result count, which only the address book's search knows.
  it.each([
    { value: '0', expected: 0 },
    { value: '-1', expected: -1 }
  ])('returns $value unclamped as $expected', ({ value, expected }) => {
    expect(pageNumber(value)).toBe(expected)
  })

  it('treats only the exact search action as a search', () => {
    expect(isSearchAction({ action: 'search' })).toBe(true)
    for (const payload of [
      { action: 'save' },
      { action: 'Search' },
      { action: 'searching' },
      {}
    ]) {
      expect(isSearchAction(payload)).toBe(false)
    }
  })
})
