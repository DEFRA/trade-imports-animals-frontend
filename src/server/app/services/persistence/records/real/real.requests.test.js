import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { obligationSet } from '../../../../model/obligations/manifest.js'

const { countryOfOrigin, numberOfAnimals } = obligationSet()
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../mapper.js'
import { isRecoverableBackendError } from '../errors.js'
import { mapStatus, records } from './index.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const backendBaseUrl = 'http://localhost:8085'
const notificationsUrl = `${backendBaseUrl}/notifications`
const journeyId = 'GBN-AG-26-ABC123'
const createdAt = '2026-07-23T09:00:00'
const submittedTimestamp = '2026-07-23T10:00:00'
const actor = {
  id: '2100010101',
  source: 'dynamics-contact',
  userType: 'B2C',
  displayName: 'Andrew Farmer',
  organisationId: '5900001',
  onBehalfOfOrganisationId: '5900002'
}

const canonical = ({
  referenceNumber = journeyId,
  fulfilments = [],
  status = 'DRAFT',
  submittedAt = null,
  concurrencyToken = 0
} = {}) => ({
  referenceNumber,
  fulfilments,
  status,
  created: createdAt,
  submittedAt,
  concurrencyToken
})

const jsonOf = (request) => request.clone().json()

describe('real records adapter — canonical fulfilment boundary', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should map every backend lifecycle status and reject contract drift', () => {
    expect(mapStatus('DRAFT')).toBe(DRAFT)
    expect(mapStatus('SUBMITTED')).toBe(SUBMITTED)
    expect(mapStatus('AMEND')).toBe(AMEND)
    expect(mapStatus('DELETED')).toBe(DELETED)
    expect(() => mapStatus('UNKNOWN')).toThrow(
      /Unknown backend fulfilment status "UNKNOWN"/
    )
  })

  it('Should create a notification via POST /notifications with an empty fulfilments payload', async () => {
    fetchMocker.mockResponse(JSON.stringify(canonical()), { status: 200 })

    const created = await records.create()

    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'POST', url: notificationsUrl }
    ])
    expect(await jsonOf(requests[0])).toEqual({
      notification: { fulfilments: [] }
    })
    expect(created).toEqual({
      journeyId,
      status: DRAFT,
      createdAt,
      submittedAt: null,
      concurrencyToken: 0,
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
    fetchMocker.mockResponse(
      JSON.stringify(canonical({ fulfilments: encoded }))
    )

    const loaded = await records.load({ journeyId })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/${journeyId}/fulfilments`)
    expect(request.method).toBe('GET')
    expect(loaded.fulfilment).toEqual(decodePersistedFulfilment(encoded))
    // Load path fires exactly one request — the fulfilments GET — and no other
    // notifications endpoints (writes, list, transitions, etc.).
    expect(fetchMocker.requests()).toHaveLength(1)
  })

  it('Should return undefined when the fulfilment GET returns 404', async () => {
    fetchMocker.mockResponse('Not Found', { status: 404 })

    const loaded = await records.load({ journeyId })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/${journeyId}/fulfilments`)
    expect(request.method).toBe('GET')
    expect(loaded).toBeUndefined()
  })
})

describe('real records adapter — fulfilment writes', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should PUT the notification in a single call carrying both notification-shape fields and the fulfilments payload', async () => {
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
    fetchMocker.mockResponse(
      JSON.stringify(canonical({ fulfilments: encoded })),
      { status: 200 }
    )

    const saved = await records.replaceFulfilment(journeyId, snapshot, {
      known: { journeyId, status: DRAFT, concurrencyToken: 3 }
    })

    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'PUT', url: `${notificationsUrl}/${journeyId}` }
    ])
    expect(await jsonOf(requests[0])).toEqual({
      notification: {
        referenceNumber: journeyId,
        concurrencyToken: 3,
        ...fulfilmentToNotification(snapshot, journeyId),
        fulfilments: encoded
      }
    })
    expect(
      (await jsonOf(requests[0])).notification.commodity.commodityComplement[0]
        .species[0].noOfAnimals
    ).toBe('5')
    expect(saved.fulfilment).toEqual(snapshot)
  })

  it('Should throw when the notification PUT returns a non-ok status', async () => {
    fetchMocker.mockResponse('Server Error', {
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      records.replaceFulfilment(
        journeyId,
        assembleFulfilments({ countryOfOrigin: 'FR' }),
        { known: { journeyId, status: DRAFT, concurrencyToken: 0 } }
      )
    ).rejects.toMatchObject({
      name: 'BackendRequestError',
      status: 500
    })
  })

  it('Should include actor on the notification PUT when provided', async () => {
    const snapshot = assembleFulfilments({ countryOfOrigin: 'FR' })
    const encoded = encodeEvaluatorFulfilments(snapshot)
    fetchMocker.mockResponse(
      JSON.stringify(canonical({ fulfilments: encoded })),
      { status: 200 }
    )

    await records.replaceFulfilment(journeyId, snapshot, {
      known: { journeyId, status: DRAFT },
      actor
    })

    expect(await jsonOf(fetchMocker.requests()[0])).toEqual({
      notification: {
        referenceNumber: journeyId,
        ...fulfilmentToNotification(snapshot, journeyId),
        fulfilments: encoded
      },
      actor
    })
  })

  it.each([
    [SUBMITTED, 'submitted'],
    [DELETED, 'deleted']
  ])('Should block writes to a %s journey', async (status, label) => {
    await expect(
      records.replaceFulfilment(
        journeyId,
        {},
        {
          known: { journeyId, status }
        }
      )
    ).rejects.toThrow(`is ${label} — writes blocked`)
    expect(fetchMocker.requests()).toEqual([])
  })
})

describe('real records adapter — lifecycle and list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('Should POST every lifecycle transition to the notifications endpoint', async () => {
    fetchMocker.mockResponses(
      [
        JSON.stringify(
          canonical({
            status: 'SUBMITTED',
            submittedAt: submittedTimestamp
          })
        ),
        { status: 200 }
      ],
      [JSON.stringify(canonical({ status: 'AMEND' })), { status: 200 }],
      [
        JSON.stringify(
          canonical({
            status: 'SUBMITTED',
            submittedAt: submittedTimestamp
          })
        ),
        { status: 200 }
      ]
    )

    const submitted = await records.finalise(journeyId, actor)
    const amended = await records.amend(journeyId, actor)
    const restored = await records.cancelAmend(journeyId)

    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'POST', url: `${notificationsUrl}/${journeyId}/submit` },
      { method: 'POST', url: `${notificationsUrl}/${journeyId}/amend` },
      { method: 'POST', url: `${notificationsUrl}/${journeyId}/cancel-amend` }
    ])
    expect(await jsonOf(requests[0])).toEqual(actor)
    expect(await jsonOf(requests[1])).toEqual(actor)
    expect(await requests[2].clone().text()).toBe('')
    expect(submitted.status).toBe(SUBMITTED)
    expect(submitted.submittedAt).toBe(submittedTimestamp)
    expect(amended.status).toBe(AMEND)
    expect(amended.submittedAt).toBeNull()
    expect(restored.status).toBe(SUBMITTED)
    expect(restored.submittedAt).toBe(submittedTimestamp)
  })

  it('Should copy with the source concurrencyToken as a query parameter (WYSIWYG guarantee)', async () => {
    const copiedJourneyId = 'GBN-AG-26-COPIED'
    fetchMocker.mockResponse(
      JSON.stringify(
        canonical({ referenceNumber: copiedJourneyId, status: 'DRAFT' })
      ),
      { status: 201 }
    )

    const copied = await records.copy(journeyId, 7)

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(
      `${notificationsUrl}/${journeyId}/copy?concurrencyToken=7`
    )
    expect(request.method).toBe('POST')
    expect(request.headers.has('Idempotency-Key')).toBe(false)
    expect(copied).toMatchObject({
      journeyId: copiedJourneyId,
      status: DRAFT
    })
  })

  it('Should POST soft-delete with no body', async () => {
    fetchMocker.mockResponse(JSON.stringify(canonical({ status: 'DELETED' })), {
      status: 200
    })

    const deleted = await records.softDelete(journeyId, actor)

    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'POST', url: `${notificationsUrl}/${journeyId}/soft-delete` }
    ])
    expect(requests[0].headers.has('Idempotency-Key')).toBe(false)
    expect(await requests[0].clone().text()).toBe('')
    expect(deleted.status).toBe(DELETED)
  })

  it('Should throw when the notifications list request returns a non-ok status', async () => {
    fetchMocker.mockResponse('Server Error', {
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(
      records.list({ page: 1, sort: 'createdAt,asc' })
    ).rejects.toMatchObject({
      name: 'BackendRequestError',
      status: 500
    })
  })

  it('Should pass an exact reference filter on the notifications list request', async () => {
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        content: []
      })
    )

    await records.list({
      page: 1,
      sort: 'createdAt,asc',
      referenceNumber: journeyId,
      organisationId: '5900002'
    })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(
      `${notificationsUrl}?page=1&sort=createdAt,asc&referenceNumber=${journeyId}`
    )
    expect(request.method).toBe('GET')
  })

  it("Should not send the reader's organisation to the backend", async () => {
    // The backend stores parties as they are and hands them back the same way.
    // The organisation is the address book's business, and the address book is
    // called from here — sending it on the notifications read would be handing
    // the backend an identity it has nothing to do with.
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0,
        content: []
      })
    )

    await records.list({ page: 1, organisationId: '5900002' })

    const [request] = fetchMocker.requests()
    expect(request.headers.get('Trade-Imports-Organisation-Id')).toBeNull()
  })
})
