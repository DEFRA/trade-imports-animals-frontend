import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import { withSetContext } from '../../../../shared/set-context.js'
import * as plantProductsObligationSet from '../../obligations/index.js'
import { featureEvaluationBindings } from '../../journeys/linear/features/evaluation.js'
import { IDEMPOTENCY_KEY_HEADER, notificationsUrl } from './config.js'
import { records } from './real.js'
import { mapStatus } from './status.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const SET_ID = 'plant-products'
const SOURCE_REFERENCE = 'GBN-PP-26-ABC001'
const COPY_REFERENCE = 'GBN-PP-26-IDX001'
const CREATED_AT = '2026-08-01T10:00:00'
const DECLARED_AT = '2026-08-01T12:00:00'

configureObligationSet(SET_ID, plantProductsObligationSet)
configureFulfilmentRegistry(SET_ID, featureEvaluationBindings)

const inPlantProducts = (operation) => withSetContext(SET_ID, operation)

const dto = ({
  referenceNumber = SOURCE_REFERENCE,
  status = 'DRAFT',
  declaration
} = {}) => ({
  referenceNumber,
  status,
  created: CREATED_AT,
  ...(declaration === undefined ? {} : { declaration })
})

const jsonResponse = (body, status = 200) => ({
  body: JSON.stringify(body),
  status
})

const bodyOf = (request) => request.clone().json()

const expectJsonHeaders = (request) => {
  expect(request.headers.get('content-type')).toBe('application/json')
  expect(request.headers.has('x-cdp-request-id')).toBe(true)
}

describe('plant-products real records adapter at the HTTP boundary', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  it('maps every shipped backend status and rejects contract drift', () => {
    expect(mapStatus('DRAFT')).toBe('draft')
    expect(mapStatus('SUBMITTED')).toBe('submitted')
    expect(mapStatus('AMEND')).toBe('amend')
    expect(mapStatus('DELETED')).toBe('deleted')
    expect(() => mapStatus('UNKNOWN')).toThrow(
      'Unknown backend plant-products notification status "UNKNOWN"'
    )
  })

  it('creates a notification with POST and an empty JSON object', async () => {
    fetchMocker.mockResponse(jsonResponse(dto(), 201))

    const created = await inPlantProducts(() => records.create())

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(notificationsUrl)
    expect(request.method).toBe('POST')
    expectJsonHeaders(request)
    expect(await bodyOf(request)).toEqual({})
    expect(created).toEqual({
      journeyId: SOURCE_REFERENCE,
      status: 'draft',
      createdAt: CREATED_AT,
      submittedAt: null,
      fulfilment: {}
    })
  })

  it('loads and marshals a submitted notification', async () => {
    fetchMocker.mockResponse(
      jsonResponse(
        dto({ status: 'SUBMITTED', declaration: { declaredAt: DECLARED_AT } })
      )
    )

    const loaded = await inPlantProducts(() =>
      records.load({ journeyId: SOURCE_REFERENCE })
    )

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/${SOURCE_REFERENCE}`)
    expect(request.method).toBe('GET')
    expectJsonHeaders(request)
    expect(loaded).toEqual({
      journeyId: SOURCE_REFERENCE,
      status: 'submitted',
      createdAt: CREATED_AT,
      submittedAt: DECLARED_AT,
      fulfilment: {}
    })
  })

  it('maps load 404 to undefined without hiding other failures', async () => {
    fetchMocker.mockResponses(
      ['', { status: 404 }],
      ['Unavailable', { status: 503, statusText: 'Service Unavailable' }]
    )

    await expect(
      inPlantProducts(() => records.load({ journeyId: 'GBN-PP-00-000000' }))
    ).resolves.toBeUndefined()
    await expect(
      inPlantProducts(() => records.load({ journeyId: SOURCE_REFERENCE }))
    ).rejects.toThrow('load notification failed: 503 Service Unavailable')
  })

  it('lists with the backend query shape and page envelope', async () => {
    fetchMocker.mockResponse(
      jsonResponse({
        content: [
          dto({
            status: 'SUBMITTED',
            declaration: { declaredAt: DECLARED_AT }
          })
        ],
        page: 2,
        pageSize: 25,
        totalElements: 26,
        totalPages: 2
      })
    )

    const listed = await inPlantProducts(() =>
      records.list({
        page: 2,
        sort: 'createdAt,asc',
        referenceNumber: SOURCE_REFERENCE
      })
    )

    const [request] = fetchMocker.requests()
    const url = new URL(request.url)
    expect(url.origin + url.pathname).toBe(notificationsUrl)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: '2',
      sort: 'createdAt,asc',
      referenceNumber: SOURCE_REFERENCE
    })
    expect(request.method).toBe('GET')
    expectJsonHeaders(request)
    expect(listed).toEqual({
      rows: [
        {
          journeyId: SOURCE_REFERENCE,
          status: 'submitted',
          createdAt: CREATED_AT,
          submittedAt: DECLARED_AT
        }
      ],
      page: 2,
      size: 25,
      totalElements: 26,
      totalPages: 2
    })
  })

  it('uses GET status codes for has', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      ['', { status: 404 }]
    )

    await expect(
      inPlantProducts(() => records.has(SOURCE_REFERENCE))
    ).resolves.toBe(true)
    await expect(
      inPlantProducts(() => records.has('GBN-PP-00-000000'))
    ).resolves.toBe(false)

    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      { method: 'GET', url: `${notificationsUrl}/GBN-PP-00-000000` }
    ])
  })

  it('replaces a known writable notification with the path-matching body reference', async () => {
    fetchMocker.mockResponse(jsonResponse(dto()))

    const saved = await inPlantProducts(() =>
      records.replaceFulfilment(
        SOURCE_REFERENCE,
        {},
        { known: { journeyId: SOURCE_REFERENCE, status: 'draft' } }
      )
    )

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/${SOURCE_REFERENCE}`)
    expect(request.method).toBe('PUT')
    expectJsonHeaders(request)
    expect(await bodyOf(request)).toEqual({
      referenceNumber: SOURCE_REFERENCE
    })
    expect(saved).toMatchObject({
      journeyId: SOURCE_REFERENCE,
      status: 'draft',
      fulfilment: {}
    })
  })

  it('resolves write status with GET when no known record is supplied', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto({ status: 'AMEND' })), { status: 200 }],
      [JSON.stringify(dto({ status: 'AMEND' })), { status: 200 }]
    )

    await inPlantProducts(() => records.replaceFulfilment(SOURCE_REFERENCE, {}))

    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
  })

  it.each(['submitted', 'deleted'])(
    'blocks a %s record before issuing a PUT',
    async (status) => {
      await expect(
        inPlantProducts(() =>
          records.replaceFulfilment(
            SOURCE_REFERENCE,
            {},
            { known: { journeyId: SOURCE_REFERENCE, status } }
          )
        )
      ).rejects.toThrow(`is ${status} — writes blocked`)
      expect(fetchMocker.requests()).toEqual([])
    }
  )

  it.each([
    ['finalise', 'SUBMITTED', { status: 'SUBMITTED' }],
    ['amend', 'AMEND', { status: 'AMEND' }],
    ['cancelAmend', 'SUBMITTED', { status: 'SUBMITTED', discardChanges: true }],
    ['softDelete', 'DELETED', { status: 'DELETED' }]
  ])(
    'sends the exact %s status transition body',
    async (operation, status, body) => {
      fetchMocker.mockResponse(jsonResponse(dto({ status })))

      const transitioned = await inPlantProducts(() =>
        records[operation](SOURCE_REFERENCE)
      )

      const [request] = fetchMocker.requests()
      expect(request.url).toBe(`${notificationsUrl}/${SOURCE_REFERENCE}/status`)
      expect(request.method).toBe('PUT')
      expectJsonHeaders(request)
      expect(await bodyOf(request)).toEqual(body)
      expect(transitioned.status).toBe(status.toLowerCase())
    }
  )

  it('sends the copy key on every repeated request and trusts the backend result', async () => {
    const copiesByKey = new Map()
    fetchMocker.mockResponse((request) => {
      const key = request.headers.get(IDEMPOTENCY_KEY_HEADER)
      if (!copiesByKey.has(key)) {
        copiesByKey.set(
          key,
          dto({ referenceNumber: COPY_REFERENCE, status: 'DRAFT' })
        )
      }
      return jsonResponse(copiesByKey.get(key), 201)
    })

    const first = await inPlantProducts(() =>
      records.copy(SOURCE_REFERENCE, 'same-copy-key')
    )
    const repeated = await inPlantProducts(() =>
      records.copy(SOURCE_REFERENCE, 'same-copy-key')
    )

    const requests = fetchMocker.requests()
    expect(requests).toHaveLength(2)
    for (const request of requests) {
      expect(request.url).toBe(`${notificationsUrl}/${SOURCE_REFERENCE}/copies`)
      expect(request.method).toBe('POST')
      expectJsonHeaders(request)
      expect(request.headers.get(IDEMPOTENCY_KEY_HEADER)).toBe('same-copy-key')
      expect(await request.clone().text()).toBe('')
    }
    expect(repeated).toEqual(first)
    expect(first).toMatchObject({
      journeyId: COPY_REFERENCE,
      status: 'draft',
      fulfilment: {}
    })
  })

  it.each([undefined, null, '', '   '])(
    'rejects a blank copy key before any HTTP request (%s)',
    async (key) => {
      await expect(
        inPlantProducts(() => records.copy(SOURCE_REFERENCE, key))
      ).rejects.toThrow('Idempotency-Key must not be blank')
      expect(fetchMocker.requests()).toEqual([])
    }
  )

  it('names the operation when an HTTP response is not accepted', async () => {
    fetchMocker.mockResponse('Conflict', {
      status: 409,
      statusText: 'Conflict'
    })

    await expect(
      inPlantProducts(() => records.copy(SOURCE_REFERENCE, 'conflict-key'))
    ).rejects.toThrow('copy notification failed: 409 Conflict')
  })

  it('rejects clear because real records are durable', async () => {
    await expect(records.clear()).rejects.toThrow(
      'records.clear is not supported in real mode'
    )
    expect(fetchMocker.requests()).toEqual([])
  })
})
