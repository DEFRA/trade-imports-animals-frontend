import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForQuote } from '../flow/section-status.js'
import { configureReadyForQuote } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from './simulate.js'

describe('#simulateJourney', () => {
  // readyForQuote flows through the status roll-up, which reads the boot-built
  // dispatch index — so replicate boot, exactly as the app does. (It is now the
  // submit-readiness gate, not a section gate: the last authored gate,
  // get-your-quote, went in inc-028.)
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })

  it('Should walk a plain persona (no transporter type) straight through', () => {
    const pages = simulateJourney({})
    expect(pages).toContain('port-of-entry')
    expect(pages).toContain('transporters')
    expect(pages).not.toContain('transporters-select')
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
      transporterType: 'Commercial transporter'
    })
    expect(pages).toContain('transporters-select')
    expect(pages).not.toContain('private-transporter-details')
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('transporters-select')
    )
  })
})
