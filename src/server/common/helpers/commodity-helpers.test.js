import { describe, expect, test } from 'vitest'

import { toCommodityDetails } from './commodity-helpers.js'

describe('#commodityHelpers', () => {
  describe('#toCommodityDetails', () => {
    test('Returns the first entry of a non-empty array', () => {
      const first = { commodityCode: '0101' }
      const second = { commodityCode: '0102' }

      expect(toCommodityDetails([first, second])).toBe(first)
    })

    test('Returns null for an empty array', () => {
      expect(toCommodityDetails([])).toBeNull()
    })

    test('Returns the object as-is for a non-empty plain object', () => {
      const details = { commodityCode: '0101' }

      expect(toCommodityDetails(details)).toBe(details)
    })

    test('Returns null for an empty object', () => {
      expect(toCommodityDetails({})).toBeNull()
    })

    test('Returns null for null input', () => {
      expect(toCommodityDetails(null)).toBeNull()
    })

    test('Returns null for undefined input', () => {
      expect(toCommodityDetails(undefined)).toBeNull()
    })
  })
})
