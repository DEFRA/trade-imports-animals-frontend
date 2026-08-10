import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelAmendJourney,
  copyJourney,
  currentJourney,
  amendJourney,
  SESSION_COOKIES,
  softDeleteJourney,
  startJourney
} from './journey.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import { configureSession } from './persistence/session.js'
import { configureReadyForCheckYourAnswers, get } from './read.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import {
  authenticatedActor,
  authenticatedCredentials,
  recordingH
} from './test-support.js'
import { obligationSet } from '../model/obligations/manifest.js'

const { countryOfOrigin } = obligationSet()

const requestFor = (journeyId, knownJourneyIds) => ({
  params: journeyId ? { journeyId } : {},
  state: { [SESSION_COOKIES.knownJourneys]: knownJourneyIds },
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
    expect(h.cookies[SESSION_COOKIES.knownJourneys]).toEqual([
      journey.journeyId
    ])
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
    requestA.state[SESSION_COOKIES.flowOnlyAnswers] = flowOnly
    requestB.state[SESSION_COOKIES.flowOnlyAnswers] = flowOnly

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
    expect(h.cookies[SESSION_COOKIES.knownJourneys]).toContain(
      journey.journeyId
    )
  })

  it('Should cancel an amendment for a journey this session never opened', async () => {
    const journey = await store.create()
    await recordsStub.finalise(journey.journeyId)
    await recordsStub.amend(journey.journeyId)

    const restored = await cancelAmendJourney(
      requestFor(journey.journeyId, []),
      recordingH(),
      journey.journeyId
    )

    expect(restored.status).toBe('submitted')
    expect((await store.get(journey.journeyId)).status).toBe('submitted')
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

  it('Should amend a submitted journey this session never opened', async () => {
    const journey = await store.create()
    await recordsStub.finalise(journey.journeyId)

    const editable = await amendJourney(
      requestFor(journey.journeyId, []),
      recordingH(),
      journey.journeyId
    )

    expect(editable.status).toBe('amend')
    expect((await store.get(journey.journeyId)).status).toBe('amend')
  })

  it('Should refuse to amend a record that no longer exists', async () => {
    const missingId = 'GBN-AG-26-GONE01'

    expect(
      await amendJourney(requestFor(missingId, []), recordingH(), missingId)
    ).toBeUndefined()
  })

  it('Should refuse to amend a deleted record', async () => {
    const journey = await store.create()
    await recordsStub.softDelete(journey.journeyId)

    expect(
      await amendJourney(
        requestFor(journey.journeyId, []),
        recordingH(),
        journey.journeyId
      )
    ).toBeUndefined()
  })

  it('Should copy a source this session never opened and remember the copy', async () => {
    const source = await store.create()
    const h = recordingH()

    const copied = await copyJourney(
      requestFor(source.journeyId, []),
      h,
      source.journeyId,
      'copy-key-123'
    )

    expect(copied.journeyId).not.toBe(source.journeyId)
    expect((await store.get(copied.journeyId)).status).toBe('draft')
    expect(h.cookies[SESSION_COOKIES.knownJourneys]).toEqual([copied.journeyId])
  })

  it('Should refuse to copy a source that no longer exists', async () => {
    const missingId = 'GBN-AG-26-GONE02'

    expect(
      await copyJourney(
        requestFor(missingId, []),
        recordingH(),
        missingId,
        'unused-key'
      )
    ).toBeUndefined()
  })

  it('Should refuse to copy a deleted source', async () => {
    const source = await store.create()
    await recordsStub.softDelete(source.journeyId)

    expect(
      await copyJourney(
        requestFor(source.journeyId, []),
        recordingH(),
        source.journeyId,
        'unused-key'
      )
    ).toBeUndefined()
  })

  it('Should soft-delete a journey this session never opened', async () => {
    const journey = await store.create()

    const deleted = await softDeleteJourney(
      requestFor(journey.journeyId, []),
      recordingH(),
      journey.journeyId
    )

    expect(deleted.status).toBe('deleted')
    expect((await store.get(journey.journeyId)).status).toBe('deleted')
  })
})
