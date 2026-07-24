import { beforeEach, describe, expect, it } from 'vitest'
import {
  currentJourney,
  KNOWN_JOURNEYS_COOKIE,
  startJourney
} from './journey.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import {
  configureSession,
  FLOW_ONLY_ANSWERS_COOKIE
} from './persistence/session.js'
import { configureReadyForCheckYourAnswers, get } from './read.js'
import { records as recordsStub } from '../services/persistence/records/stub.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { recordingH } from './test-support.js'
import { countryOfOrigin } from '../model/obligations/obligations.js'

const requestFor = (journeyId, knownJourneyIds) => ({
  params: journeyId ? { journeyId } : {},
  state: { [KNOWN_JOURNEYS_COOKIE]: knownJourneyIds },
  headers: {},
  app: {}
})

describe('#currentJourney', () => {
  beforeEach(async () => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
    await store.clear()
  })

  it('Should create only through startJourney and add the real record id to the known list', async () => {
    const h = recordingH()
    const journey = await startJourney(requestFor(undefined, []), h)

    expect(await store.has(journey.journeyId)).toBe(true)
    expect(h.cookies[KNOWN_JOURNEYS_COOKIE]).toEqual([journey.journeyId])
  })

  it('Should resolve two URL-selected journeys independently in one shared session', async () => {
    const journeyA = await store.create()
    const journeyB = await store.create()
    await store.seedAnswers(journeyA.journeyId, { countryOfOrigin: 'FR' })
    await store.seedAnswers(journeyB.journeyId, { countryOfOrigin: 'DE' })
    const known = [journeyA.journeyId, journeyB.journeyId]

    const loadedA = await currentJourney(
      requestFor(journeyA.journeyId, known),
      recordingH()
    )
    const loadedB = await currentJourney(
      requestFor(journeyB.journeyId, known),
      recordingH()
    )

    expect(loadedA.fulfilment).toEqual({ [countryOfOrigin.id]: 'FR' })
    expect(loadedB.fulfilment).toEqual({ [countryOfOrigin.id]: 'DE' })
  })

  it('Should assemble each URL-selected journey answers with its own flow-only state', async () => {
    const journeyA = await store.create()
    const journeyB = await store.create()
    await store.seedAnswers(journeyA.journeyId, { countryOfOrigin: 'FR' })
    await store.seedAnswers(journeyB.journeyId, { countryOfOrigin: 'DE' })
    const known = [journeyA.journeyId, journeyB.journeyId]
    const flowOnly = {
      [journeyA.journeyId]: { importType: 'live-animals' },
      [journeyB.journeyId]: { importType: 'poao' }
    }
    const requestA = requestFor(journeyA.journeyId, known)
    const requestB = requestFor(journeyB.journeyId, known)
    requestA.state[FLOW_ONLY_ANSWERS_COOKIE] = flowOnly
    requestB.state[FLOW_ONLY_ANSWERS_COOKIE] = flowOnly

    const viewA = await get(requestA, recordingH())
    const viewB = await get(requestB, recordingH())

    expect(viewA.answers).toMatchObject({
      countryOfOrigin: 'FR',
      importType: 'live-animals'
    })
    expect(viewB.answers).toMatchObject({
      countryOfOrigin: 'DE',
      importType: 'poao'
    })
  })

  it('Should return Boom 404 for an id-less or unknown journey URL', async () => {
    const known = ['known-but-not-requested']

    await expect(
      currentJourney(requestFor(undefined, known), recordingH())
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
    await expect(
      currentJourney(requestFor('unknown', known), recordingH())
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should 404 a known id whose persisted record no longer exists', async () => {
    await expect(
      currentJourney(requestFor('gone-1234', ['gone-1234']), recordingH())
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should 404 an existing journey that the shared session does not know', async () => {
    const otherJourney = await store.create()
    await expect(
      currentJourney(requestFor(otherJourney.journeyId, []), recordingH())
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })
})
