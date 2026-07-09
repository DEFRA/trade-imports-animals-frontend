import { beforeEach, describe, expect, it } from 'vitest'
import { currentJourney, JOURNEY_COOKIE } from './journey.js'
import { store, IN_PROGRESS } from './store.js'
import { configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { recordingH } from './test-support.js'

const buildRequest = (cookies) => ({ state: { ...cookies }, headers: {} })

describe('#currentJourney', () => {
  beforeEach(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    store.clear()
  })

  it('Should mint a fresh journey and pin it in the cookie when none is present', async () => {
    const h = recordingH()
    const journey = await currentJourney(buildRequest({}), h)
    expect(journey.journeyId).toEqual(expect.any(String))
    expect(journey.status).toBe(IN_PROGRESS)
    expect(h.cookies[JOURNEY_COOKIE]).toBe(journey.journeyId)
  })

  it('Should resume the same journey within a session (cookie points at a live journey)', async () => {
    const first = await currentJourney(buildRequest({}), recordingH())
    store.saveAnswers(first.journeyId, { countryOfOrigin: 'FR' })
    const again = await currentJourney(
      buildRequest({ [JOURNEY_COOKIE]: first.journeyId }),
      recordingH()
    )
    expect(again.journeyId).toBe(first.journeyId)
    expect(again.answers).toEqual({ countryOfOrigin: 'FR' })
  })

  it('Should re-mint when the cookie points at a stale/unknown journey', async () => {
    const h = recordingH()
    const journey = await currentJourney(
      buildRequest({ [JOURNEY_COOKIE]: 'gone-1234' }),
      h
    )
    expect(journey.journeyId).not.toBe('gone-1234')
    expect(store.has(journey.journeyId)).toBe(true)
    expect(h.cookies[JOURNEY_COOKIE]).toBe(journey.journeyId)
  })

  it('Should keep parallel cookies isolated — no cross-talk between two journeys', async () => {
    const journeyA = await currentJourney(buildRequest({}), recordingH())
    const journeyB = await currentJourney(buildRequest({}), recordingH())
    expect(journeyA.journeyId).not.toBe(journeyB.journeyId)
    store.saveAnswers(journeyA.journeyId, { who: 'A' })
    store.saveAnswers(journeyB.journeyId, { who: 'B' })
    const journeyAResumed = await currentJourney(
      buildRequest({ [JOURNEY_COOKIE]: journeyA.journeyId }),
      recordingH()
    )
    const journeyBResumed = await currentJourney(
      buildRequest({ [JOURNEY_COOKIE]: journeyB.journeyId }),
      recordingH()
    )
    expect(journeyAResumed.answers).toEqual({ who: 'A' })
    expect(journeyBResumed.answers).toEqual({ who: 'B' })
  })
})
