import { describe, expect, it } from 'vitest'

import { parseDateText } from '../../../../../../../lib/validate/index.js'
import { arrivalWindow } from './arrival-window.js'

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

  it('Should offer the civil day as the worked example, in the same format', () => {
    const { exampleText } = arrivalWindow(new Date('2026-08-11T23:30:00Z'))

    expect(exampleText).toBe('12/8/2026')
  })

  // The example is only useful if the user can actually enter it, so it has to
  // sit strictly inside the bounds the same call publishes.
  it('Should keep the worked example inside the window it publishes', () => {
    const { min, max, exampleText } = arrivalWindow(
      new Date(Date.UTC(2026, 7, 12, 13, 45))
    )
    const example = parseDateText(exampleText)

    expect(example.getTime()).toBeGreaterThan(min.getTime())
    expect(example.getTime()).toBeLessThan(max.getTime())
  })
})
