import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from '../../../../../analysis/simulate.js'

// The add spokes hang off the transporter list rather than sitting in the
// journey, so no set of answers walks the simulator through them.
const ADD_SPOKE_PAGES = [
  'transporter-add',
  'transporters-select',
  'private-transporter-details'
]

describe('#simulateJourney', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
  })

  const prereqs = {
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: 'Cow' }]
  }

  it('Should walk a plain persona (no transporter type) straight through', () => {
    const pages = simulateJourney(prereqs)
    expect(pages).toContain('port-of-entry')
    expect(pages).toContain('transporters')
    expect(pages.indexOf('port-of-entry')).toBeLessThan(
      pages.indexOf('transporters')
    )
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('consignment-contact-select')
    )
  })

  it.each(['', 'Commercial', 'Private'])(
    'Should keep the add spokes off the journey when the transporter type is "%s"',
    (transporterType) => {
      const pages = simulateJourney({ ...prereqs, transporterType })
      expect(pages).toContain('transporters')
      for (const spoke of ADD_SPOKE_PAGES) {
        expect(pages).not.toContain(spoke)
      }
    }
  )
})
