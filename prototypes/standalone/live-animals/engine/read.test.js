import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { configureReadyForCheckYourAnswers, get, makeScope } from './read.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { journeyRequest, recordingH } from './test-support.js'
import { JOURNEY_COOKIE, configureSession } from './persistence/session.js'

describe('#makeScope', () => {
  it('Should throw when readyForCheckYourAnswers has not been configured at boot', () => {
    expect(() => makeScope({})).toThrow(/not configured/)
  })
})

describe('#get — per-request read view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })
  afterEach(() => store.clear())

  it('Should return the seeded answers verbatim with scope derived from them', async () => {
    const seed = {
      countryOfOrigin: 'FR',
      transporterType: 'Commercial transporter'
    }
    const journey = store.create()
    store.saveAnswers(journey.journeyId, seed)

    const view = await get(journeyRequest(journey.journeyId), recordingH())

    expect(view.journey.journeyId).toBe(journey.journeyId)
    expect(view.answers).toEqual(seed)
    expect(view.scope.has('countryOfOrigin')).toBe(true)
    expect(view.scope.has('regionOfOriginCode')).toBe(false)
    expect(view.scope.has('commercialTransporter')).toBe(true)
  })

  it('Should start a journey and pin the journey cookie when none is active', async () => {
    const h = recordingH()

    const view = await get(journeyRequest(undefined, { state: {} }), h)

    expect(view.journey.journeyId).toBeTruthy()
    expect(h.cookies[JOURNEY_COOKIE]).toBe(view.journey.journeyId)
  })
})
