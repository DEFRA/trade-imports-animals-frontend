import { SET_ID } from '../sets/live-animals/set.js'
import { describe, expect, it } from 'vitest'

import { configureJourneyFlow, journeySectionCaption } from './journey-flow.js'

describe('#journeySectionCaption', () => {
  it('Should render no caption for a journey that configures none', () => {
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [] })

    expect(journeySectionCaption('origin')).toBeUndefined()
  })
})
