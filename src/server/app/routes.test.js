import { describe, expect, it } from 'vitest'

import { allRoutes } from './sets/live-animals/journeys/linear/features/index.js'

describe('promoted live-animals route authentication', () => {
  it('Should leave every promoted route to inherit the server default strategy', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options ?? {}).not.toHaveProperty('auth')
    }
  })
})
