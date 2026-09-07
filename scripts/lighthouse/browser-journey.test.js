import { describe, expect, it } from 'vitest'

import { stepPath } from './browser-journey.js'

describe('stepPath', () => {
  it('builds the notification path for a single-segment slug', () => {
    expect(stepPath('GBN-AG-26-TN3BJ3', 'import-purpose')).toBe(
      '/notifications/GBN-AG-26-TN3BJ3/import-purpose'
    )
  })

  it('builds the notification path for a nested slug', () => {
    expect(stepPath('GBN-AG-26-TN3BJ3', 'commodities/identification')).toBe(
      '/notifications/GBN-AG-26-TN3BJ3/commodities/identification'
    )
  })
})
