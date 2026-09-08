import { describe, expect, it } from 'vitest'

import { journeyIdFromLocation, pathFromLocation } from './seed-notification.js'

describe('pathFromLocation', () => {
  it('normalises a relative redirect', () => {
    expect(
      pathFromLocation('/notifications/GBN-AG-26-TN3BJ3/import-reason')
    ).toBe('/notifications/GBN-AG-26-TN3BJ3/import-reason')
  })

  it('strips query strings from a redirect', () => {
    expect(
      pathFromLocation('/notifications/GBN-AG-26-TN3BJ3/origin?staleAction=1')
    ).toBe('/notifications/GBN-AG-26-TN3BJ3/origin')
  })

  it('reads the pathname from an absolute redirect', () => {
    expect(
      pathFromLocation(
        'http://localhost:3000/notifications/GBN-AG-26-TN3BJ3/import-reason'
      )
    ).toBe('/notifications/GBN-AG-26-TN3BJ3/import-reason')
  })
})

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
