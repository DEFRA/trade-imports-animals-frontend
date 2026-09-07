import { describe, expect, it } from 'vitest'

import { journeyIdFromLocation } from './seed-notification.js'

describe('journeyIdFromLocation', () => {
  it('reads the reference from a relative redirect', () => {
    expect(
      journeyIdFromLocation('/notifications/GBN-AG-26-TN3BJ3/origin')
    ).toBe('GBN-AG-26-TN3BJ3')
  })

  it('reads the reference from an absolute redirect', () => {
    expect(
      journeyIdFromLocation(
        'http://localhost:3000/notifications/GBN-AG-26-TN3BJ3/origin'
      )
    ).toBe('GBN-AG-26-TN3BJ3')
  })

  it('returns undefined when the location has no notification segment', () => {
    expect(journeyIdFromLocation('/')).toBeUndefined()
  })
})
