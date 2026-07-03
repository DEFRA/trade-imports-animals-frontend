import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from './simulate.js'

/** The headless persona -> ordered page sequence walk (entry 4). */
describe('journey simulator', () => {
  // The quote-readiness gate flows through the status roll-up, which reads the
  // boot-built dispatch index — so replicate boot, exactly as the app does.
  beforeAll(() => buildDispatch(dispatchPages))

  it('walks a plain persona (no claims, no add-ons) straight through', () => {
    const pages = simulateJourney({
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'no',
      coverType: 'comprehensive'
    })
    // driving-and-cover runs without the gated claims page…
    expect(pages).toContain('driving-history')
    expect(pages).toContain('cover-type')
    expect(pages).not.toContain('claims')
    // …and no add-on detail pages appear.
    expect(pages).not.toContain('drivers')
    expect(pages).not.toContain('modifications-describe')
    // order is flow order: driving-history precedes cover-type precedes addons.
    expect(pages.indexOf('driving-history')).toBeLessThan(
      pages.indexOf('cover-type')
    )
    expect(pages.indexOf('cover-type')).toBeLessThan(pages.indexOf('addons'))
  })

  it('inserts the gated claims page exactly when hadClaims is yes', () => {
    const pages = simulateJourney({ hadClaims: 'yes' })
    expect(pages).toContain('claims')
    // between driving-history and cover-type, per the flow.
    expect(pages.indexOf('driving-history')).toBeLessThan(
      pages.indexOf('claims')
    )
    expect(pages.indexOf('claims')).toBeLessThan(pages.indexOf('cover-type'))
  })

  it('opens only the add-on section a persona selected', () => {
    const pages = simulateJourney({ addons: ['named-driver'] })
    // The named-driver add-on is now the `drivers` collection hub (its sub-loop
    // add/detail pages are reached from the hub, not walked by the section).
    expect(pages).toContain('drivers')
    expect(pages).not.toContain('modifications-describe')
    expect(pages).not.toContain('protected-ncd-years')
  })

  it('reveals the quote page only once the journey is ready to quote', () => {
    const notReady = simulateJourney({ email: 'a@b.co' })
    expect(notReady).not.toContain('quote-summary')

    const ready = simulateJourney({
      email: 'a@b.co',
      fullName: 'Alex',
      hadClaims: 'no',
      coverType: 'comprehensive'
    })
    expect(ready).toContain('quote-summary')
  })
})
