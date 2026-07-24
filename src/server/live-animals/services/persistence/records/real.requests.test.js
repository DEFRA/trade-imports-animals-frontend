import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { IN_PROGRESS, SUBMITTED } from '../../../engine/persistence/records.js'
import { assembleFulfilments } from '../../../bridge/assemble-fulfilments.js'
import {
  countryOfOrigin,
  numberOfAnimals
} from '../../../model/obligations/obligations.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from './fulfilment-codec.js'
import {
  answersToTargetNotification,
  fulfilmentToNotification
} from './mapper.js'
import { isRecoverableBackendError } from './errors.js'
import { records } from './real.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const fulfilmentsUrl = `${backendBaseUrl}/fulfilments`
const notificationsUrl = `${backendBaseUrl}/notifications`
const proposedNotificationsUrl = `${backendBaseUrl}/proposed-notifications`
const journeyId = 'GBN-AG-26-ABC123'
const createdAt = '2026-07-23T09:00:00'

const canonical = ({
  id = journeyId,
  fulfilment = [],
  status = 'IN_PROGRESS',
  submittedAt = null
} = {}) => ({
  id,
  fulfilment,
  status,
  createdAt,
  submittedAt
})

const jsonOf = (request) => request.clone().json()

describe('real records adapter — canonical fulfilment boundary', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should create an empty canonical fulfilment with POST /fulfilments', async () => {
    fetchMocker.mockResponse(JSON.stringify(canonical()))

    const created = await records.create({ userId: 'user-1' })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(fulfilmentsUrl)
    expect(request.method).toBe('POST')
    expect(await request.clone().text()).toBe('')
    expect(created).toEqual({
      journeyId,
      userId: 'user-1',
      status: IN_PROGRESS,
      createdAt,
      submittedAt: null,
      fulfilment: {}
    })
  })

  it('Should classify the adapter fetch failure shape, but not programming errors, as recoverable', async () => {
    fetchMocker.mockResponse('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    })

    let surfaced
    try {
      await records.create()
    } catch (error) {
      surfaced = error
    }

    expect(surfaced).toMatchObject({
      name: 'BackendRequestError',
      status: 503,
      statusText: 'Service Unavailable'
    })
    expect(isRecoverableBackendError(surfaced)).toBe(true)
    expect(isRecoverableBackendError(new Error('plain failure'))).toBe(false)
    expect(
      isRecoverableBackendError(new TypeError('programming failure'))
    ).toBe(false)
  })

  it('Should load and decode the canonical persisted fulfilment directly', async () => {
    const encoded = [
      { obligationId: countryOfOrigin.id, value: 'FR' },
      {
        obligationId: numberOfAnimals.id,
        records: [{ fulfilmentId: 'line0', value: 5 }]
      }
    ]
    fetchMocker.mockResponse(JSON.stringify(canonical({ fulfilment: encoded })))

    const loaded = await records.load({ journeyId, userId: 'user-1' })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${fulfilmentsUrl}/${journeyId}`)
    expect(request.method).toBe('GET')
    expect(loaded.fulfilment).toEqual(decodePersistedFulfilment(encoded))
    expect(loaded.userId).toBe('user-1')
    expect(
      fetchMocker
        .requests()
        .some((entry) => entry.url.startsWith(notificationsUrl))
    ).toBe(false)
  })

  it('Should derive and PUT all three documents from one fulfilment snapshot, canonical first', async () => {
    const snapshot = assembleFulfilments({
      countryOfOrigin: 'FR',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfAnimalsQuantity: '5',
          numberOfPackages: '2'
        }
      ]
    })
    const encoded = encodeEvaluatorFulfilments(snapshot)
    fetchMocker.mockResponses(
      [JSON.stringify(canonical({ fulfilment: encoded })), { status: 200 }],
      ['', { status: 200 }],
      ['', { status: 200 }]
    )

    const saved = await records.replaceFulfilment(journeyId, snapshot, {
      known: { journeyId, status: IN_PROGRESS }
    })

    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'PUT', url: `${fulfilmentsUrl}/${journeyId}` },
      { method: 'PUT', url: `${notificationsUrl}/${journeyId}` },
      { method: 'PUT', url: `${proposedNotificationsUrl}/${journeyId}` }
    ])
    expect(await jsonOf(requests[0])).toEqual({
      id: journeyId,
      fulfilment: encoded
    })
    expect(await jsonOf(requests[1])).toEqual(
      fulfilmentToNotification(snapshot, journeyId)
    )
    expect(await jsonOf(requests[2])).toEqual(
      answersToTargetNotification(snapshot, journeyId)
    )
    expect(
      (await jsonOf(requests[1])).commodity.commodityComplement[0].species[0]
        .noOfAnimals
    ).toBe('5')
    expect(saved.fulfilment).toEqual(snapshot)
  })

  it('Should retry a failed projection with the identical idempotent PUT', async () => {
    const snapshot = { [countryOfOrigin.id]: 'FR' }
    const encoded = encodeEvaluatorFulfilments(snapshot)
    fetchMocker.mockResponses(
      [JSON.stringify(canonical({ fulfilment: encoded })), { status: 200 }],
      ['Unavailable', { status: 503 }],
      ['', { status: 200 }],
      ['', { status: 200 }]
    )

    await records.replaceFulfilment(journeyId, snapshot, {
      known: { journeyId, status: IN_PROGRESS }
    })

    const requests = fetchMocker.requests()
    expect(requests.map(({ url }) => url)).toEqual([
      `${fulfilmentsUrl}/${journeyId}`,
      `${notificationsUrl}/${journeyId}`,
      `${notificationsUrl}/${journeyId}`,
      `${proposedNotificationsUrl}/${journeyId}`
    ])
    expect(await jsonOf(requests[1])).toEqual(await jsonOf(requests[2]))
  })

  it('Should surface persistent projection failure after canonical success and still attempt the other projection', async () => {
    const snapshot = { [countryOfOrigin.id]: 'FR' }
    const encoded = encodeEvaluatorFulfilments(snapshot)
    fetchMocker.mockResponses(
      [JSON.stringify(canonical({ fulfilment: encoded })), { status: 200 }],
      ['Unavailable', { status: 503 }],
      ['Unavailable', { status: 503 }],
      ['', { status: 200 }]
    )

    let surfaced
    try {
      await records.replaceFulfilment(journeyId, snapshot, {
        known: { journeyId, status: IN_PROGRESS }
      })
    } catch (error) {
      surfaced = error
    }

    expect(surfaced).toMatchObject({
      canonicalSaved: true,
      journeyId,
      failedProjections: ['current notification']
    })
    expect(isRecoverableBackendError(surfaced)).toBe(true)
    expect(surfaced.message).toMatch(
      /Canonical fulfilment .* saved, but projection writes failed/
    )
    const requests = fetchMocker.requests()
    expect(requests.map(({ url }) => url)).toEqual([
      `${fulfilmentsUrl}/${journeyId}`,
      `${notificationsUrl}/${journeyId}`,
      `${notificationsUrl}/${journeyId}`,
      `${proposedNotificationsUrl}/${journeyId}`
    ])
    expect(await jsonOf(requests[0])).toEqual({
      id: journeyId,
      fulfilment: encoded
    })
  })

  it('Should use the canonical fulfilment lifecycle endpoints', async () => {
    fetchMocker.mockResponses(
      [
        JSON.stringify(
          canonical({
            status: 'SUBMITTED',
            submittedAt: '2026-07-23T10:00:00'
          })
        ),
        { status: 200 }
      ],
      [JSON.stringify(canonical()), { status: 200 }]
    )

    const submitted = await records.finalise(journeyId)
    const amended = await records.amend(journeyId)

    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      {
        method: 'POST',
        url: `${fulfilmentsUrl}/${journeyId}/submit`
      },
      {
        method: 'POST',
        url: `${fulfilmentsUrl}/${journeyId}/amend`
      }
    ])
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toBe('2026-07-23T10:00:00')
    expect(amended.status).toBe(IN_PROGRESS)
    expect(amended.submittedAt).toBeNull()
  })
})
