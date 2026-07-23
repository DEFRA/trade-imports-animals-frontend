import { afterEach, beforeAll, describe, expect, test } from 'vitest'
import { configureReadyForCheckYourAnswers, get } from './read.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { journeyRequest, recordingH } from './test-support.js'
import { JOURNEY_COOKIE, configureSession } from './persistence/session.js'
import {
  countryOfOrigin,
  transporterType
} from '../model/obligations/obligations.js'

describe('#get — per-request read view', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })
  afterEach(() => store.clear())

  test('Should return the seeded answers verbatim with scope derived from them', async () => {
    const seed = {
      countryOfOrigin: 'FR',
      transporterType: 'Commercial'
    }
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, seed)

    const view = await get(journeyRequest(journey.journeyId), recordingH())

    expect(view.journey.journeyId).toBe(journey.journeyId)
    expect(view.fulfilment).toEqual({
      [countryOfOrigin.id]: 'FR',
      [transporterType.id]: 'Commercial'
    })
    expect(view.evaluation.fulfilments).toEqual(view.fulfilment)
    expect(view.answers).toEqual(seed)
    expect(view.scope.has('countryOfOrigin')).toBe(true)
    expect(view.scope.has('purposeInInternalMarket')).toBe(false)
    expect(view.scope.has('commercialTransporter')).toBe(true)
  })

  test('Should start a journey and pin the journey cookie when none is active', async () => {
    const h = recordingH()

    const view = await get(journeyRequest(undefined, { state: {} }), h)

    expect(view.journey.journeyId).toBeTruthy()
    expect(h.cookies[JOURNEY_COOKIE]).toBe(view.journey.journeyId)
  })
})
