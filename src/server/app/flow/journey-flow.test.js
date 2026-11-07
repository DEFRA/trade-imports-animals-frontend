import { SET_ID } from '../sets/live-animals/set.js'
import { describe, expect, it } from 'vitest'

import { flowOnlyKeys } from '../bridge/flow-only-keys.js'
import { withSetContext } from '../shared/set-context.js'
import {
  configureJourneyFlow,
  journeyInsTypeQuestionUrl,
  journeySectionCaption
} from './journey-flow.js'

describe('#journeyInsTypeQuestionUrl', () => {
  it("Should answer the configured journey's Import Notification Service question for the current set", () => {
    configureJourneyFlow(SET_ID, {
      sections: [],
      taskRows: [],
      insTypeQuestionUrl: (journeyId) => `/ins/${journeyId}`
    })

    expect(withSetContext(SET_ID, () => journeyInsTypeQuestionUrl('j-1'))).toBe(
      '/ins/j-1'
    )
  })

  it('Should report an unconfigured set as not configured', () => {
    expect(() =>
      withSetContext('unconfigured-set', () => journeyInsTypeQuestionUrl('j-1'))
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
