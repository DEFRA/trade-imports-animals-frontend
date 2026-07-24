import { describe, expect, it } from 'vitest'
import { session } from './stub.js'
import {
  JOURNEY_COOKIE,
  KNOWN_JOURNEYS_COOKIE,
  OPENING_RUN_COOKIE,
  FLOW_ONLY_ANSWERS_COOKIE
} from '../../../engine/persistence/session.js'
import { recordingH } from '../../../engine/test-support.js'

const requestKnowing = (...journeyIds) => ({
  state: { [KNOWN_JOURNEYS_COOKIE]: journeyIds }
})

describe('#session.clearActive', () => {
  it('Should remove the journey cookie via h.unstate', async () => {
    const h = recordingH()
    await session.setActiveJourney(h, 'journey-1')
    expect(h.cookies[JOURNEY_COOKIE]).toBe('journey-1')

    await session.clearActive(h)

    expect(JOURNEY_COOKIE in h.cookies).toBe(false)
  })

  it('Should keep the known-journeys list when the active pointer is cleared', async () => {
    const h = recordingH()
    await session.addKnownJourney({ state: {} }, h, 'journey-1')

    await session.clearActive(h)

    expect(h.cookies[KNOWN_JOURNEYS_COOKIE]).toEqual(['journey-1'])
  })
})

describe('#session.knownJourneyIds', () => {
  it('Should start with no known journeys', async () => {
    expect(await session.knownJourneyIds({ state: {} })).toEqual([])
  })

  it('Should append a newly known journey to the cookie list', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-2')
    expect(h.cookies[KNOWN_JOURNEYS_COOKIE]).toEqual(['journey-1', 'journey-2'])
  })

  it('Should not duplicate an already-known journey', async () => {
    const h = recordingH()
    await session.addKnownJourney(requestKnowing('journey-1'), h, 'journey-1')
    expect(KNOWN_JOURNEYS_COOKIE in h.cookies).toBe(false)
  })

  it('Should read the known list back from the request cookie', async () => {
    expect(
      await session.knownJourneyIds(requestKnowing('journey-1', 'journey-2'))
    ).toEqual(['journey-1', 'journey-2'])
  })
})

describe('#session.openingRun', () => {
  const record = { journeyId: 'journey-1', phase: 'active' }

  it('Should round-trip the opening-run record through the cookie', async () => {
    const h = recordingH()
    await session.setOpeningRun(h, record)
    expect(h.cookies[OPENING_RUN_COOKIE]).toEqual(record)
    expect(
      await session.openingRun({ state: { [OPENING_RUN_COOKIE]: record } })
    ).toEqual(record)
  })

  it('Should report no opening run for a fresh session', async () => {
    expect(await session.openingRun({ state: {} })).toBeUndefined()
  })
})

describe('#session.flowOnlyAnswers', () => {
  it('Should round-trip values without leaking them between journeys', async () => {
    const h = recordingH()
    const request = { state: {} }

    await session.setFlowOnlyAnswers(
      h,
      'journey-1',
      { importType: 'live-animals' },
      request
    )

    const stored = h.cookies[FLOW_ONLY_ANSWERS_COOKIE]
    expect(
      await session.flowOnlyAnswers(
        { state: { [FLOW_ONLY_ANSWERS_COOKIE]: stored } },
        'journey-1'
      )
    ).toEqual({ importType: 'live-animals' })
    expect(
      await session.flowOnlyAnswers(
        { state: { [FLOW_ONLY_ANSWERS_COOKIE]: stored } },
        'journey-2'
      )
    ).toEqual({})
  })

  it('Should preserve another journey while updating the current one', async () => {
    const existing = {
      'journey-1': { importType: 'live-animals' }
    }
    const h = recordingH()

    await session.setFlowOnlyAnswers(
      h,
      'journey-2',
      { declaration: 'confirmed' },
      { state: { [FLOW_ONLY_ANSWERS_COOKIE]: existing } }
    )

    expect(h.cookies[FLOW_ONLY_ANSWERS_COOKIE]).toEqual({
      ...existing,
      'journey-2': { declaration: 'confirmed' }
    })
  })
})
