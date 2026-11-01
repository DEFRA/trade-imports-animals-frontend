import { SET_ID } from '../../../../test/fixtures/index.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import {
  cancelAmendJourney,
  copyJourney,
  currentJourney,
  amendJourney,
  listKnownJourneys,
  replaceJourneyFulfilment,
  softDeleteJourney,
  startJourney
} from './journey.js'
import { store } from './store.js'
import { configureRecords } from './persistence/records.js'
import {
  configureSession,
  flowOnlyAnswersCookie,
  knownJourneysCookie
} from './persistence/session.js'
import { configureReadyForCheckYourAnswers, get } from './read.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { records as recordsReal } from '../services/persistence/records/real/index.js'
import { notificationsUrl } from '../services/persistence/records/real/config.js'
import { assembleFulfilments } from '../bridge/assemble-fulfilments.js'
import { encodeEvaluatorFulfilments } from '../services/persistence/records/fulfilment-codec/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import {
  authenticatedActor,
  backendJourneyId,
  backendNotification,
  journeyRequest,
  recordingH
} from './test-support.js'
import { obligationSet } from '../model/obligations/manifest.js'

const { countryOfOrigin } = obligationSet()

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const jsonOf = (request) => request.clone().json()

const submittedJourney = async () => {
  const journey = await store.create()
  await store.submit(journey.journeyId)
  return journey.journeyId
}

const useStubRecords = async () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  configureReadyForCheckYourAnswers(SET_ID, () => false)
  await store.clear()
}

describe('#currentJourney', () => {
  beforeEach(useStubRecords)

  it('Should create only through startJourney and add the real record id to the known list', async () => {
    const h = recordingH()
    const journey = await startJourney(
      journeyRequest(undefined, { knownJourneyIds: [] }),
      h
    )

    expect(await store.has(journey.journeyId)).toBe(true)
    expect(h.cookies[knownJourneysCookie()]).toEqual([journey.journeyId])
  })

  it('Should resolve two URL-selected journeys independently in one shared session', async () => {
    const journeyA = await store.create()
    const journeyB = await store.create()
    await store.seedAnswers(journeyA.journeyId, { countryOfOrigin: 'FR' })
    await store.seedAnswers(journeyB.journeyId, { countryOfOrigin: 'DE' })
    const known = [journeyA.journeyId, journeyB.journeyId]

    const loadedA = await currentJourney(
      journeyRequest(journeyA.journeyId, { knownJourneyIds: known }),
      recordingH()
    )
    const loadedB = await currentJourney(
      journeyRequest(journeyB.journeyId, { knownJourneyIds: known }),
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
      [journeyA.journeyId]: { declaration: 'confirmed' },
      [journeyB.journeyId]: { declaration: '' }
    }
    const requestA = journeyRequest(journeyA.journeyId, {
      knownJourneyIds: known
    })
    const requestB = journeyRequest(journeyB.journeyId, {
      knownJourneyIds: known
    })
    requestA.state[flowOnlyAnswersCookie()] = flowOnly
    requestB.state[flowOnlyAnswersCookie()] = flowOnly

    const viewA = await get(requestA, recordingH())
    const viewB = await get(requestB, recordingH())

    expect(viewA.answers).toMatchObject({
      countryOfOrigin: 'FR',
      declaration: 'confirmed'
    })
    expect(viewB.answers).toMatchObject({
      countryOfOrigin: 'DE',
      declaration: ''
    })
  })

  it('Should return Boom 404 for an id-less or unknown journey URL', async () => {
    const known = ['known-but-not-requested']

    await expect(
      currentJourney(
        journeyRequest(undefined, { knownJourneyIds: known }),
        recordingH()
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
    await expect(
      currentJourney(
        journeyRequest('unknown', { knownJourneyIds: known }),
        recordingH()
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should 404 a known id whose persisted record no longer exists', async () => {
    await expect(
      currentJourney(
        journeyRequest('gone-1234', { knownJourneyIds: ['gone-1234'] }),
        recordingH()
      )
    ).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
  })

  it('Should load a referenced journey the session does not yet know, record it as known and log the registration once', async () => {
    const journey = await store.create()
    const h = recordingH()
    const request = journeyRequest(journey.journeyId, { knownJourneyIds: [] })

    const loaded = await currentJourney(request, h)

    expect(loaded.journeyId).toBe(journey.journeyId)
    expect(h.cookies[knownJourneysCookie()]).toContain(journey.journeyId)
    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: journey.journeyId },
        message: 'Notification added to the known journeys of this session'
      }
    ])
  })
})

describe('#amendJourney', () => {
  beforeEach(useStubRecords)

  it('Should open a submitted notification the session has not opened for amending and add it to the known list', async () => {
    const journeyId = await submittedJourney()
    const h = recordingH()

    const editable = await amendJourney(
      journeyRequest(journeyId, { knownJourneyIds: [] }),
      h,
      journeyId
    )

    expect(editable.status).toBe('amend')
    expect((await store.get(journeyId)).status).toBe('amend')
    expect(h.cookies[knownJourneysCookie()]).toEqual([journeyId])
  })

  it('Should refuse a deleted notification, leave it deleted and log the refusal once with its status', async () => {
    const journey = await store.create()
    await recordsStub.softDelete(journey.journeyId)
    const request = journeyRequest(journey.journeyId, {
      knownJourneyIds: [journey.journeyId]
    })

    const editable = await amendJourney(
      request,
      recordingH(),
      journey.journeyId
    )

    expect(editable).toBeUndefined()
    expect((await store.get(journey.journeyId)).status).toBe('deleted')
    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: journey.journeyId,
          reason: 'not-editable',
          status: 'deleted'
        },
        message: 'Amend refused'
      }
    ])
  })
})

describe('#amendJourney against the backend', () => {
  beforeEach(() => {
    configureRecords(SET_ID, recordsReal)
    configureSession(SET_ID, sessionStub)
    fetchMocker.resetMocks()
  })

  it('Should refuse an id the backend does not hold, log it and send no amend request', async () => {
    fetchMocker.mockResponse('Not Found', { status: 404 })
    const request = journeyRequest(backendJourneyId, { knownJourneyIds: [] })

    const editable = await amendJourney(request, recordingH(), backendJourneyId)

    expect(editable).toBeUndefined()
    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      {
        method: 'GET',
        url: `${notificationsUrl}/${backendJourneyId}/fulfilments`
      }
    ])
    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: backendJourneyId, reason: 'not-found' },
        message: 'Amend refused'
      }
    ])
  })
})

describe('#copyJourney', () => {
  beforeEach(useStubRecords)

  it('Should copy a submitted notification the session has not opened into a new draft, leave the source submitted and remember the copy', async () => {
    const sourceId = await submittedJourney()
    const h = recordingH()

    const copied = await copyJourney(
      journeyRequest(sourceId, { knownJourneyIds: [] }),
      h,
      sourceId,
      'copy-key-123'
    )

    expect(copied.status).toBe('draft')
    expect((await store.get(copied.journeyId)).status).toBe('draft')
    expect((await store.get(sourceId)).status).toBe('submitted')
    expect(h.cookies[knownJourneysCookie()]).toEqual([copied.journeyId])
  })

  it('Should refuse a source the store does not hold and log the refusal once', async () => {
    const request = journeyRequest('unknown', { knownJourneyIds: [] })

    const copied = await copyJourney(request, recordingH(), 'unknown', 'unused')

    expect(copied).toBeUndefined()
    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: 'unknown', reason: 'not-found' },
        message: 'Copy refused'
      }
    ])
  })
})

describe('#cancelAmendJourney and #softDeleteJourney', () => {
  beforeEach(useStubRecords)

  it('Should cancel an amendment only for a session-known journey', async () => {
    const knownId = await submittedJourney()
    const unknownId = await submittedJourney()
    await recordsStub.amend(knownId)
    await recordsStub.amend(unknownId)
    const request = journeyRequest(knownId, { knownJourneyIds: [knownId] })

    const restored = await cancelAmendJourney(request, recordingH(), knownId)
    const refused = await cancelAmendJourney(request, recordingH(), unknownId)

    expect(restored.status).toBe('submitted')
    expect((await store.get(knownId)).status).toBe('submitted')
    expect(refused).toBeUndefined()
    expect((await store.get(unknownId)).status).toBe('amend')
  })

  it('Should soft-delete only a session-known journey', async () => {
    const knownJourney = await store.create()
    const unknownJourney = await store.create()
    const request = journeyRequest(knownJourney.journeyId)

    const deleted = await softDeleteJourney(
      request,
      recordingH(),
      knownJourney.journeyId
    )
    const refused = await softDeleteJourney(
      request,
      recordingH(),
      unknownJourney.journeyId
    )

    expect(deleted.status).toBe('deleted')
    expect((await store.get(knownJourney.journeyId)).status).toBe('deleted')
    expect(refused).toBeUndefined()
    expect((await store.get(unknownJourney.journeyId)).status).toBe('draft')
  })
})

describe('#listKnownJourneys', () => {
  beforeEach(useStubRecords)

  it("Should list only the session's known journeys", async () => {
    const knownJourney = await store.create()
    await store.create()
    const request = journeyRequest(knownJourney.journeyId)

    const { rows } = await listKnownJourneys(request, { page: 1 })

    expect(rows.map((row) => row.journeyId)).toEqual([knownJourney.journeyId])
  })
})

describe('#listKnownJourneys against the backend', () => {
  beforeEach(() => {
    configureRecords(SET_ID, recordsReal)
    fetchMocker.resetMocks()
  })

  it('Should request the page asked for without the organisation', async () => {
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 2,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        content: []
      })
    )

    await listKnownJourneys(
      journeyRequest(backendJourneyId, { knownJourneyIds: [backendJourneyId] }),
      { page: 2 }
    )

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}?page=2&sort=arrivalDate,desc`)
    expect(request.headers.get('Trade-Imports-Organisation-Id')).toBeNull()
  })
})

describe('backend requests carry the authenticated actor', () => {
  beforeEach(() => {
    configureRecords(SET_ID, recordsReal)
    configureSession(SET_ID, sessionStub)
    fetchMocker.resetMocks()
    fetchMocker.mockResponse(backendNotification({ status: 'SUBMITTED' }))
  })

  it('Should send the authenticated actor as the body of the create request', async () => {
    await startJourney(
      journeyRequest(undefined, { knownJourneyIds: [] }),
      recordingH()
    )

    expect(await jsonOf(fetchMocker.requests()[0])).toEqual({
      notification: { fulfilments: [] },
      actor: authenticatedActor
    })
  })

  it.each([
    [
      'amend',
      (request, h) => amendJourney(request, h, backendJourneyId),
      `${notificationsUrl}/${backendJourneyId}/amend`
    ],
    [
      'cancel-amend',
      (request, h) => cancelAmendJourney(request, h, backendJourneyId),
      `${notificationsUrl}/${backendJourneyId}/cancel-amend`
    ],
    [
      'copy',
      (request, h) => copyJourney(request, h, backendJourneyId, 7),
      `${notificationsUrl}/${backendJourneyId}/copy?concurrencyToken=7`
    ],
    [
      'soft-delete',
      (request, h) => softDeleteJourney(request, h, backendJourneyId),
      `${notificationsUrl}/${backendJourneyId}/soft-delete`
    ]
  ])(
    'Should send the authenticated actor as the body of the %s request',
    async (_name, act, expectedUrl) => {
      await act(
        journeyRequest(backendJourneyId, {
          knownJourneyIds: [backendJourneyId]
        }),
        recordingH()
      )

      const lastRequest = fetchMocker.requests().at(-1)
      expect(lastRequest.url).toBe(expectedUrl)
      expect(await jsonOf(lastRequest)).toEqual(authenticatedActor)
    }
  )
})

describe('#replaceJourneyFulfilment', () => {
  beforeEach(() => {
    configureRecords(SET_ID, recordsReal)
    configureSession(SET_ID, sessionStub)
    fetchMocker.resetMocks()
  })

  it('Should send the concurrencyToken the first save returned on a second save in the same request', async () => {
    const first = assembleFulfilments({ countryOfOrigin: 'FR' })
    const second = assembleFulfilments({ countryOfOrigin: 'DE' })
    fetchMocker.mockResponses(
      [backendNotification(), { status: 200 }],
      [
        backendNotification({
          fulfilments: encodeEvaluatorFulfilments(first),
          concurrencyToken: 5
        }),
        { status: 200 }
      ],
      [
        backendNotification({
          fulfilments: encodeEvaluatorFulfilments(second),
          concurrencyToken: 6
        }),
        { status: 200 }
      ]
    )
    const request = journeyRequest(backendJourneyId, {
      knownJourneyIds: [backendJourneyId]
    })
    request.payload = { concurrencyToken: '4' }

    await replaceJourneyFulfilment(request, backendJourneyId, first)
    await replaceJourneyFulfilment(request, backendJourneyId, second)

    const puts = fetchMocker.requests().filter(({ method }) => method === 'PUT')
    const tokensSent = await Promise.all(
      puts.map(async (put) => (await jsonOf(put)).notification.concurrencyToken)
    )
    expect(tokensSent).toEqual([4, 5])
  })
})
