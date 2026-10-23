import { SET_ID } from '../sets/live-animals/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { withSetContext } from '../shared/set-context.js'
import {
  configureJourneyFlow,
  journeyPreviousRunTarget,
  journeySectionCaption
} from './journey-flow.js'

describe('#journeyPreviousRunTarget', () => {
  it("Should answer the configured journey's previous run target for the current set", () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      previousRunTarget: () => '/j-1/reason'
    })

    expect(
      withSetContext(SET_ID, () =>
        journeyPreviousRunTarget('details', { scope: 'S', answers: 'A' }, 'j-1')
      )
    ).toBe('/j-1/reason')
  })

  it('Should report an unconfigured set as not configured', () => {
    expect(() =>
      withSetContext('unconfigured-set', () =>
        journeyPreviousRunTarget('details', { scope: 'S', answers: 'A' }, 'j-1')
      )
    ).toThrow('journey flow not configured')
  })
})

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
