import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../flow/dispatch.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from '../../../../../analysis/simulate.js'

const TRANSPORTERS_SELECT_PAGE = 'transporters-select'

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
    expect(pages).not.toContain(TRANSPORTERS_SELECT_PAGE)
    expect(pages).not.toContain('private-transporter-details')
    expect(pages.indexOf('port-of-entry')).toBeLessThan(
      pages.indexOf('transporters')
    )
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('consignment-contact-select')
    )
  })

  it('Should insert the gated transporter spoke exactly for the chosen type', () => {
    const pages = simulateJourney({
      ...prereqs,
      transporterType: 'Commercial'
    })
    expect(pages).toContain(TRANSPORTERS_SELECT_PAGE)
    expect(pages).not.toContain('private-transporter-details')
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf(TRANSPORTERS_SELECT_PAGE)
    )
  })
})
