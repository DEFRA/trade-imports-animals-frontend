import { describe, expect, test } from 'vitest'
import {
  nextRouteAfterArrivalDetails,
  requiresTransitedCountries
} from './transport-routing.js'

describe('transport-routing', () => {
  describe('requiresTransitedCountries', () => {
    test.each([
      ['RAILWAY', true],
      ['ROAD_VEHICLE', true],
      ['AIRPLANE', false],
      ['VESSEL', false],
      [undefined, false]
    ])('returns %s when means is %s', (means, expected) => {
      expect(requiresTransitedCountries(means)).toBe(expected)
    })
  })

  describe('nextRouteAfterArrivalDetails', () => {
    test('routes road and rail to transited countries', () => {
      expect(nextRouteAfterArrivalDetails('RAILWAY')).toBe(
        '/transited-countries'
      )
      expect(nextRouteAfterArrivalDetails('ROAD_VEHICLE')).toBe(
        '/transited-countries'
      )
    })

    test('routes air and vessel to transporters', () => {
      expect(nextRouteAfterArrivalDetails('AIRPLANE')).toBe('/transporters')
      expect(nextRouteAfterArrivalDetails('VESSEL')).toBe('/transporters')
    })
  })
})
