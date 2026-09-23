import { SET_ID } from '../sets/live-animals/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { configureJourneyFlow, journeySectionCaption } from './journey-flow.js'

// Vitest gives each file its own module registry, so reconfiguring the journey
// flow here leaks to no other suite and there is nothing to restore.

describe('#journeySectionCaption', () => {
  it('Should render no caption for a journey that configures none', () => {
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [] })

    expect(journeySectionCaption('origin')).toBeUndefined()
  })
})

describe('#configureJourneyFlow', () => {
  it('Should forward the journey flow-only keys to the bridge seam', () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      flowOnlyKeys: ['declaration']
    })

    expect(flowOnlyKeys()).toEqual(['declaration'])
  })

  it('Should leave the bridge seam empty for a journey that declares no flow-only key', () => {
    configureJourneyFlow(SET_ID, { sections: [], taskRows: [] })

    expect(flowOnlyKeys()).toEqual([])
  })
})
