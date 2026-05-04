import { describe, expect, test } from 'vitest'

import { toCommodityDetails } from './commodity-helpers.js'

describe('#commodityHelpers', () => {
  describe('#toCommodityDetails', () => {
    test('returns the first entry of a non-empty array', () => {
      const first = { commodityCode: '0101' }
      const second = { commodityCode: '0102' }

      expect(toCommodityDetails([first, second])).toBe(first)
    })

    test('returns null for an empty array', () => {
      expect(toCommodityDetails([])).toBeNull()
    })

    test('returns null when first element is falsy even if later elements are present', () => {
      expect(toCommodityDetails([null, { commodityCode: '0101' }])).toBeNull()
    })

    test('returns the object as-is for a non-empty plain object', () => {
      const details = { commodityCode: '0101' }

      expect(toCommodityDetails(details)).toBe(details)
    })

    test('returns null for an empty object', () => {
      expect(toCommodityDetails({})).toBeNull()
    })

    test('returns null for null input', () => {
      expect(toCommodityDetails(null)).toBeNull()
    })

    test('returns null for undefined input', () => {
      expect(toCommodityDetails(undefined)).toBeNull()
    })
  })
})
