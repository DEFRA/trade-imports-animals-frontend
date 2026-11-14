import { describe, expect, it } from 'vitest'

import { notificationDateText } from './notification-date.js'

describe('#notificationDateText', () => {
  it('Should write the London day in full for an instant late in the UTC evening during summer time', () => {
    expect(notificationDateText('2026-09-10T23:35:39.455Z')).toBe(
      '11 September 2026'
    )
  })

  it('Should write the same day in winter, when London is on UTC', () => {
    expect(notificationDateText('2026-12-10T23:35:39.455Z')).toBe(
      '10 December 2026'
    )
  })
})
