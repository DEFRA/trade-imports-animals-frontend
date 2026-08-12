import { describe, expect, it } from 'vitest'

import { DAYS_BEFORE, MONTHS_AHEAD, arrivalWindow } from './arrival-window.js'

describe('#arrivalWindow — the live-animals arrival-date policy', () => {
  it('Should span one week back to six months forward, at UTC midnight', () => {
    const { min, max } = arrivalWindow(new Date(Date.UTC(2026, 7, 12, 13, 45)))

    expect(min.toISOString()).toBe('2026-08-05T00:00:00.000Z')
    expect(max.toISOString()).toBe('2027-02-12T00:00:00.000Z')
  })

  it('Should format both bounds as d/m/yyyy without leading zeros', () => {
    const { minText, maxText } = arrivalWindow(new Date(Date.UTC(2026, 0, 8)))

    expect(minText).toBe('1/1/2026')
    expect(maxText).toBe('8/7/2026')
  })

  it('Should clamp to the last day of the target month rather than rolling over', () => {
    const { maxText } = arrivalWindow(new Date(Date.UTC(2026, 7, 31)))

    expect(maxText).toBe('28/2/2027')
  })

  it('Should anchor on the service civil day, not the UTC day', () => {
    const { minText, maxText } = arrivalWindow(new Date('2026-08-11T23:30:00Z'))

    expect(minText).toBe('5/8/2026')
    expect(maxText).toBe('12/2/2027')
  })

  it('Should publish the window size as named constants', () => {
    expect(DAYS_BEFORE).toBe(7)
    expect(MONTHS_AHEAD).toBe(6)
  })
})
