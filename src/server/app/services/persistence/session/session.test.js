import { describe, expect, it } from 'vitest'
import { session } from './stub.js'
import {
  knownJourneysCookie,
  openingRunCookie,
  flowOnlyAnswersCookie
} from '../../../engine/persistence/session.js'
import { recordingH } from '../../../engine/test-support.js'

const IMPORT_TYPE_LIVE_ANIMALS = 'live-animals'

const requestKnowing = (...journeyIds) => ({
  state: { [knownJourneysCookie()]: journeyIds }
})

describe('#session.knownJourneyIds', () => {
  it('Should start with no known journeys', async () => {
    expect(await session.knownJourneyIds({ state: {} })).toEqual([])
  })

  it('Should append a newly known journey to the cookie list', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-2')
    expect(h.cookies[knownJourneysCookie()]).toEqual(['journey-1', 'journey-2'])
  })

  it('Should not duplicate an already-known journey', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-1')
    expect(knownJourneysCookie() in h.cookies).toBe(false)
  })

  it('Should read the known list back from the request cookie', async () => {
    expect(
      await session.knownJourneyIds(requestKnowing('journey-1', 'journey-2'))
    ).toEqual(['journey-1', 'journey-2'])
  })
})

describe('#session.openingRun', () => {
  it('Should round-trip phases without leaking them between journeys', async () => {
    const h = recordingH()
    const request = { state: {} }
    await session.setOpeningRun(h, 'journey-1', 'active', request)
    const stored = h.cookies[openingRunCookie()]
    expect(stored).toEqual({ 'journey-1': 'active' })
    expect(
      await session.openingRun(
        { state: { [openingRunCookie()]: stored } },
        'journey-1'
      )
    ).toBe('active')
    expect(
      await session.openingRun(
        { state: { [openingRunCookie()]: stored } },
        'journey-2'
      )
    ).toBeUndefined()
  })

  it('Should report no opening run for a fresh session', async () => {
    expect(await session.openingRun({ state: {} }, 'journey-1')).toBeUndefined()
  })

  it('Should preserve another journey phase while updating the current one', async () => {
    const h = recordingH()
    await session.setOpeningRun(h, 'journey-2', 'complete', {
      state: { [openingRunCookie()]: { 'journey-1': 'active' } }
    })
    expect(h.cookies[openingRunCookie()]).toEqual({
      'journey-1': 'active',
      'journey-2': 'complete'
    })
  })
})

describe('#session.flowOnlyAnswers', () => {
  it('Should round-trip values without leaking them between journeys', async () => {
    const h = recordingH()
    const request = { state: {} }

    await session.setFlowOnlyAnswers(
      h,
      'journey-1',
      { importType: IMPORT_TYPE_LIVE_ANIMALS },
      request
    )

    const stored = h.cookies[flowOnlyAnswersCookie()]
    expect(
      await session.flowOnlyAnswers(
        { state: { [flowOnlyAnswersCookie()]: stored } },
        'journey-1'
      )
    ).toEqual({ importType: IMPORT_TYPE_LIVE_ANIMALS })
    expect(
      await session.flowOnlyAnswers(
        { state: { [flowOnlyAnswersCookie()]: stored } },
        'journey-2'
      )
    ).toEqual({})
  })

  it('Should preserve another journey while updating the current one', async () => {
    const existing = {
      'journey-1': { importType: IMPORT_TYPE_LIVE_ANIMALS }
    }
    const h = recordingH()

    await session.setFlowOnlyAnswers(
      h,
      'journey-2',
      { declaration: 'confirmed' },
      { state: { [flowOnlyAnswersCookie()]: existing } }
    )

    expect(h.cookies[flowOnlyAnswersCookie()]).toEqual({
      ...existing,
      'journey-2': { declaration: 'confirmed' }
    })
  })
})
