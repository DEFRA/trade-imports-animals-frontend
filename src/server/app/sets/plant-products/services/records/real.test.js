import { beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { configureFulfilmentRegistry } from '../../../../bridge/fulfilment-registry.js'
import { projectAnswers } from '../../../../bridge/fulfilments/index.js'
import { configureObligationSet } from '../../../../model/obligations/manifest.js'
import { isRecoverableBackendError } from '../../../../services/persistence/records/errors.js'
import { withSetContext } from '../../../../shared/set-context.js'
import * as plantProductsObligationSet from '../../obligations/index.js'
import { featureEvaluationBindings } from '../../journeys/linear/features/evaluation.js'
import { IDEMPOTENCY_KEY_HEADER, notificationsUrl } from './config.js'
import { records } from './real.js'
import { mapStatus } from './status.js'
import { stubOrganisationOperator } from '../stub-org.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const SET_ID = 'plant-products'
const SOURCE_REFERENCE = 'GBN-PP-26-ABC001'
const COPY_REFERENCE = 'GBN-PP-26-IDX001'
const CREATED_AT = '2026-08-01T10:00:00'
const DECLARED_AT = '2026-08-01T12:00:00'
const FINALISE_DECLARED_AT = '2026-08-01T12:00:00.000Z'

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

  it('loads embedded accompanying documents into the answers projection', async () => {
    fetchMocker.mockResponse(
      jsonResponse({
        ...dto(),
        accompanyingDocuments: [
          {
            id: 'server-doc-1',
            documentType: 'PHYTOSANITARY_CERTIFICATE',
            documentReference: 'PHYTO-001',
            issueDate: '2025-12-04',
            files: []
          }
        ]
      })
    )

    const loaded = await inPlantProducts(() =>
      records.load({ journeyId: SOURCE_REFERENCE })
    )

    expect(inPlantProducts(() => projectAnswers(loaded.fulfilment))).toEqual({
      accompanyingDocuments: [
        {
          documentType: 'PHYTOSANITARY_CERTIFICATE',
          documentReference: 'PHYTO-001',
          issueDate: { day: '4', month: '12', year: '2025' }
        }
      ]
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
          {
            ...dto({
              status: 'SUBMITTED',
              declaration: { declaredAt: DECLARED_AT }
            }),
            origin: { countryCode: 'IE' },
            transport: { arrivalDate: '2026-03-07' }
          }
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
          submittedAt: DECLARED_AT,
          originCountryCode: 'IE',
          arrivalDate: '2026-03-07'
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
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      [JSON.stringify({ documents: [] }), { status: 200 }],
      [JSON.stringify(dto()), { status: 200 }]
    )

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
      referenceNumber: SOURCE_REFERENCE,
      importer: stubOrganisationOperator()
    })
    expect(saved).toMatchObject({
      journeyId: SOURCE_REFERENCE,
      status: 'draft',
      fulfilment: {}
    })
    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      {
        method: 'GET',
        url: `${notificationsUrl}/${SOURCE_REFERENCE}/accompanying-documents`
      },
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
  })

  it('resolves write status with GET when no known record is supplied', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto({ status: 'AMEND' })), { status: 200 }],
      [JSON.stringify(dto({ status: 'AMEND' })), { status: 200 }],
      [JSON.stringify({ documents: [] }), { status: 200 }],
      [JSON.stringify(dto({ status: 'AMEND' })), { status: 200 }]
    )

    await inPlantProducts(() => records.replaceFulfilment(SOURCE_REFERENCE, {}))

    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      {
        method: 'GET',
        url: `${notificationsUrl}/${SOURCE_REFERENCE}/accompanying-documents`
      },
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
  })

  it('reconciles accompanying documents through the shipped wrapped sub-resource contract', async () => {
    const documents = [
      {
        documentType: 'PHYTOSANITARY_CERTIFICATE',
        documentReference: 'PHYTO-001',
        issueDate: { day: '4', month: '12', year: '2025' }
      },
      {
        documentType: 'AIR_WAYBILL',
        documentReference: 'AIR-002',
        issueDate: { day: '27', month: '3', year: '2026' }
      }
    ]
    const fulfilment = inPlantProducts(() =>
      assembleFulfilments({ accompanyingDocuments: documents })
    )
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      [
        JSON.stringify({ documents: [{ id: 'old-1' }, { id: 'old-2' }] }),
        { status: 200 }
      ],
      [null, { status: 204 }],
      [null, { status: 204 }],
      [JSON.stringify({ id: 'new-1' }), { status: 201 }],
      [JSON.stringify({ id: 'new-2' }), { status: 201 }],
      [
        JSON.stringify({
          ...dto(),
          accompanyingDocuments: documents.map((entry, index) => ({
            id: `new-${index + 1}`,
            documentType: entry.documentType,
            documentReference: entry.documentReference,
            issueDate: `${entry.issueDate.year}-${String(entry.issueDate.month).padStart(2, '0')}-${String(entry.issueDate.day).padStart(2, '0')}`,
            files: []
          }))
        }),
        { status: 200 }
      ]
    )

    const saved = await inPlantProducts(() =>
      records.replaceFulfilment(SOURCE_REFERENCE, fulfilment, {
        known: { journeyId: SOURCE_REFERENCE, status: 'draft' }
      })
    )

    const requests = fetchMocker.requests()
    const documentUrl = `${notificationsUrl}/${SOURCE_REFERENCE}/accompanying-documents`
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      { method: 'GET', url: documentUrl },
      { method: 'DELETE', url: `${documentUrl}/old-1` },
      { method: 'DELETE', url: `${documentUrl}/old-2` },
      { method: 'POST', url: documentUrl },
      { method: 'POST', url: documentUrl },
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
    expect(await bodyOf(requests[0])).not.toHaveProperty(
      'accompanyingDocuments'
    )
    expect(await bodyOf(requests[4])).toEqual({
      documentType: 'PHYTOSANITARY_CERTIFICATE',
      documentReference: 'PHYTO-001',
      issueDate: '2025-12-04'
    })
    expect(await bodyOf(requests[5])).toEqual({
      documentType: 'AIR_WAYBILL',
      documentReference: 'AIR-002',
      issueDate: '2026-03-27'
    })
    expect(inPlantProducts(() => projectAnswers(saved.fulfilment))).toEqual({
      accompanyingDocuments: documents
    })
  })

  it('clears pre-existing sub-resource documents when the answers contain none', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      [JSON.stringify({ documents: [{ id: 'old-1' }] }), { status: 200 }],
      [null, { status: 204 }],
      [JSON.stringify(dto()), { status: 200 }]
    )

    await inPlantProducts(() =>
      records.replaceFulfilment(
        SOURCE_REFERENCE,
        {},
        {
          known: { journeyId: SOURCE_REFERENCE, status: 'draft' }
        }
      )
    )

    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      {
        method: 'GET',
        url: `${notificationsUrl}/${SOURCE_REFERENCE}/accompanying-documents`
      },
      {
        method: 'DELETE',
        url: `${notificationsUrl}/${SOURCE_REFERENCE}/accompanying-documents/old-1`
      },
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
  })

  it('names a rejected document DELETE at the network boundary', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      [JSON.stringify({ documents: [{ id: 'old-1' }] }), { status: 200 }],
      ['Conflict', { status: 409, statusText: 'Conflict' }]
    )

    await expect(
      inPlantProducts(() =>
        records.replaceFulfilment(
          SOURCE_REFERENCE,
          {},
          {
            known: { journeyId: SOURCE_REFERENCE, status: 'draft' }
          }
        )
      )
    ).rejects.toThrow('delete accompanying document failed: 409 Conflict')
  })

  it('names a rejected document POST at the network boundary', async () => {
    const fulfilment = inPlantProducts(() =>
      assembleFulfilments({
        accompanyingDocuments: [
          {
            documentType: 'AIR_WAYBILL',
            documentReference: 'AIR-002',
            issueDate: { day: '27', month: '3', year: '2026' }
          }
        ]
      })
    )
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      [JSON.stringify({ documents: [] }), { status: 200 }],
      ['Unprocessable', { status: 422, statusText: 'Unprocessable Entity' }]
    )

    await expect(
      inPlantProducts(() =>
        records.replaceFulfilment(SOURCE_REFERENCE, fulfilment, {
          known: { journeyId: SOURCE_REFERENCE, status: 'draft' }
        })
      )
    ).rejects.toThrow(
      'create accompanying document failed: 422 Unprocessable Entity'
    )
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

  it('finalises by replacing the declaration before changing status', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FINALISE_DECLARED_AT))
    fetchMocker.mockResponses(
      [
        JSON.stringify({
          ...dto(),
          origin: { countryCode: 'FR' },
          updated: '2026-08-01T11:00:00',
          submittedBaseline: { status: 'DRAFT' }
        }),
        { status: 200 }
      ],
      [JSON.stringify(dto()), { status: 200 }],
      [
        JSON.stringify(
          dto({
            status: 'SUBMITTED',
            declaration: {
              agreed: true,
              declaredAt: FINALISE_DECLARED_AT
            }
          })
        ),
        { status: 200 }
      ]
    )

    try {
      const finalised = await inPlantProducts(() =>
        records.finalise(SOURCE_REFERENCE)
      )

      const requests = fetchMocker.requests()
      expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
        { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
        { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
        {
          method: 'PUT',
          url: `${notificationsUrl}/${SOURCE_REFERENCE}/status`
        }
      ])
      const documentBody = await bodyOf(requests[1])
      expect(documentBody).toEqual({
        referenceNumber: SOURCE_REFERENCE,
        origin: { countryCode: 'FR' },
        importer: stubOrganisationOperator(),
        declaration: { agreed: true, declaredAt: FINALISE_DECLARED_AT }
      })
      expect(await bodyOf(requests[2])).toEqual({ status: 'SUBMITTED' })
      expect(finalised).toMatchObject({
        status: 'submitted',
        submittedAt: FINALISE_DECLARED_AT
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not submit when the declaration document replacement fails', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(dto()), { status: 200 }],
      ['Unprocessable', { status: 422, statusText: 'Unprocessable Entity' }]
    )

    await expect(
      inPlantProducts(() => records.finalise(SOURCE_REFERENCE))
    ).rejects.toThrow('finalise notification failed: 422 Unprocessable Entity')
    expect(
      fetchMocker.requests().map(({ method, url }) => ({ method, url }))
    ).toEqual([
      { method: 'GET', url: `${notificationsUrl}/${SOURCE_REFERENCE}` },
      { method: 'PUT', url: `${notificationsUrl}/${SOURCE_REFERENCE}` }
    ])
  })

  it.each([
    ['load GET', []],
    ['declaration PUT', [[JSON.stringify(dto()), { status: 200 }]]],
    [
      'status PUT',
      [
        [JSON.stringify(dto()), { status: 200 }],
        [JSON.stringify(dto()), { status: 200 }]
      ]
    ]
  ])(
    'marks a rejected finalise %s as recoverable',
    async (_stage, responses) => {
      fetchMocker.mockResponses(...responses)
      fetchMocker.mockRejectOnce(new TypeError('fetch failed'))

      let surfaced
      try {
        await inPlantProducts(() => records.finalise(SOURCE_REFERENCE))
      } catch (error) {
        surfaced = error
      }

      expect(surfaced).toBeInstanceOf(TypeError)
      expect(isRecoverableBackendError(surfaced)).toBe(true)
    }
  )

  it('does not mark a finalise JSON parse failure as recoverable', async () => {
    fetchMocker.mockResponse('not JSON', { status: 200 })

    let surfaced
    try {
      await inPlantProducts(() => records.finalise(SOURCE_REFERENCE))
    } catch (error) {
      surfaced = error
    }

    expect(surfaced).toBeInstanceOf(SyntaxError)
    expect(isRecoverableBackendError(surfaced)).toBe(false)
  })

  it('does not mark a finalise request-construction failure as recoverable', async () => {
    const requestError = new TypeError('invalid request configuration')
    const requestSpy = vi
      .spyOn(globalThis, 'Request')
      .mockImplementation(function InvalidRequest() {
        throw requestError
      })

    let surfaced
    try {
      await inPlantProducts(() => records.finalise(SOURCE_REFERENCE))
    } catch (error) {
      surfaced = error
    } finally {
      requestSpy.mockRestore()
    }

    expect(surfaced).toBe(requestError)
    expect(isRecoverableBackendError(surfaced)).toBe(false)
    expect(fetchMocker).not.toHaveBeenCalled()
  })

  it.each([
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
