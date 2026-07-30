import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAmendJourney,
  copyJourney,
  currentJourney,
  amendJourney,
  KNOWN_JOURNEYS_COOKIE,
  softDeleteJourney,
  startJourney
} from './journey.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import {
  configureSession,
  FLOW_ONLY_ANSWERS_COOKIE
} from './persistence/session.js'
import { configureReadyForCheckYourAnswers, get } from './read.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import {
  authenticatedActor,
  authenticatedCredentials,
  recordingH
} from './test-support.js'
import { countryOfOrigin } from '../model/obligations/obligations.js'

const requestFor = (journeyId, knownJourneyIds) => ({
  params: journeyId ? { journeyId } : {},
  state: { [KNOWN_JOURNEYS_COOKIE]: knownJourneyIds },
  headers: {},
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
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

  it('Should load a referenced journey the session does not yet know and record it as known', async () => {
    const journey = await store.create()
    const h = recordingH()

    const loaded = await currentJourney(requestFor(journey.journeyId, []), h)

    expect(loaded.journeyId).toBe(journey.journeyId)
    expect(h.cookies[KNOWN_JOURNEYS_COOKIE]).toContain(journey.journeyId)
  })

  it('Should cancel amendment only for a session-known journey', async () => {
    const cancelAmend = vi.fn(async (journeyId) => ({
      journeyId,
      status: 'submitted',
      fulfilment: {}
    }))
    configureRecords({ ...recordsStub, cancelAmend })
    const journeyId = 'GBN-AG-26-ABC123'
    const request = requestFor(journeyId, [journeyId])

    const restored = await cancelAmendJourney(request, recordingH(), journeyId)

    expect(cancelAmend).toHaveBeenCalledWith(journeyId)
    expect(restored.status).toBe('submitted')

    const unknown = await cancelAmendJourney(
      requestFor('unknown', []),
      recordingH(),
      'unknown'
    )
    expect(unknown).toBeUndefined()
    expect(cancelAmend).toHaveBeenCalledTimes(1)
  })

  it('Should amend a submitted journey with the authenticated actor', async () => {
    const journey = await store.create()
    await recordsStub.finalise(journey.journeyId)
    const amend = vi.fn(recordsStub.amend)
    configureRecords({ ...recordsStub, amend })
    const request = requestFor(journey.journeyId, [journey.journeyId])

    const editable = await amendJourney(
      request,
      recordingH(),
      journey.journeyId
    )

    expect(amend).toHaveBeenCalledWith(journey.journeyId, authenticatedActor)
    expect(editable.status).toBe('amend')
  })

  it('Should copy only a known source and remember the new draft', async () => {
    const copy = vi.fn(async (_journeyId, _idempotencyKey) => ({
      journeyId: 'GBN-AG-26-COPIED',
      status: 'draft',
      fulfilment: {}
    }))
    configureRecords({ ...recordsStub, copy })
    const sourceId = 'GBN-AG-26-SOURCE'
    const request = requestFor(sourceId, [sourceId])
    const h = recordingH()

    const copied = await copyJourney(request, h, sourceId, 'copy-key-123')

    expect(copy).toHaveBeenCalledWith(sourceId, 'copy-key-123')
    expect(copied.status).toBe('draft')
    expect(h.cookies[KNOWN_JOURNEYS_COOKIE]).toEqual([
      sourceId,
      copied.journeyId
    ])

    expect(
      await copyJourney(
        requestFor('unknown', []),
        recordingH(),
        'unknown',
        'unused'
      )
    ).toBeUndefined()
    expect(copy).toHaveBeenCalledTimes(1)
  })

  it('Should soft-delete only a known journey', async () => {
    const softDelete = vi.fn(async (journeyId) => ({
      journeyId,
      status: 'deleted',
      fulfilment: {}
    }))
    configureRecords({ ...recordsStub, softDelete })
    const journeyId = 'GBN-AG-26-DELETE'
    const request = requestFor(journeyId, [journeyId])

    const deleted = await softDeleteJourney(request, recordingH(), journeyId)

    expect(softDelete).toHaveBeenCalledWith(journeyId)
    expect(deleted.status).toBe('deleted')

    expect(
      await softDeleteJourney(
        requestFor('unknown', []),
        recordingH(),
        'unknown'
      )
    ).toBeUndefined()
    expect(softDelete).toHaveBeenCalledTimes(1)
  })
})
