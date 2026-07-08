import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../flow/section-status.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from './simulate.js'

describe('#simulateJourney', () => {
  // readyForCheckYourAnswers flows through the status roll-up, which reads the boot-built
  // dispatch index — so replicate boot, exactly as the app does. (It is now the
  // submit-readiness gate, not a section gate: the last authored gate,
  // get-your-quote, went in inc-028.)
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  // RULE 1 gates the post-commodities pages behind the two continue
  // obligations, so a persona must answer `countryOfOrigin` and a line's
  // `commoditySelection` before transport opens. `prereqs` seeds exactly that.
  const prereqs = {
    countryOfOrigin: 'FR',
    commodityLines: [{ commoditySelection: '0102 - Cattle' }]
  }

  it('Should walk a plain persona (no transporter type) straight through', () => {
    const pages = simulateJourney(prereqs)
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
      ...prereqs,
      transporterType: 'Commercial transporter'
    })
    expect(pages).toContain('transporters-select')
    expect(pages).not.toContain('private-transporter-details')
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('transporters-select')
    )
  })
})
