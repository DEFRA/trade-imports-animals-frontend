import { describe, expect, it } from 'vitest'

import { allRoutes } from './sets/plant-products/journeys/linear/features/index.js'

// Every URL-shaped value below is a route shape. It is deliberately prefix-free;
// Hapi supplies /plant-products through the gateway registration.
describe('promoted plant-products route authentication', () => {
  it('Should leave every promoted route prefix-free and inheriting the server default strategy', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options ?? {}).not.toHaveProperty('auth')
      expect(route.path).not.toMatch(/^\/plant-products(?:\/|$)/)
    }
  })
})
