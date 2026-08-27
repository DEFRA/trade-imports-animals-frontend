import { describe, expect, it } from 'vitest'

import { configureJourneyFlow, journeySectionCaption } from './journey-flow.js'

describe('#journeySectionCaption', () => {
  it('Should render no caption for a journey that configures none', () => {
    configureJourneyFlow({ sections: [], taskRows: [] })

    expect(journeySectionCaption('origin')).toBeUndefined()
  })
})
