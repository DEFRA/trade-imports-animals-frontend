import { describe, expect, it } from 'vitest'

import { allRoutes } from './sets/live-animals/journeys/linear/features/index.js'

describe('promoted live-animals route authentication', () => {
  it('Should name the session strategy on every promoted route', () => {
    expect(allRoutes).not.toHaveLength(0)

    for (const route of allRoutes) {
      expect(route.options).toMatchObject({ auth: 'session' })
    }
  })
})
