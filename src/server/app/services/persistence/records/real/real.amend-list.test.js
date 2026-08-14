import { beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { records } from './index.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const notificationsUrl = 'http://localhost:8085/notifications'

const RECORD_CREATED_AT = '2026-07-14T09:00:00'
const RECORD_ARRIVAL_DATE = '2026-07-20'
const CONSIGNOR_NAME = 'Consignor Ltd'
const CONSIGNEE_NAME = 'Consignee Ltd'

const notification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  created: RECORD_CREATED_AT,
  updated: RECORD_CREATED_AT,
  commodity: { name: 'Cow' },
  origin: { countryCode: 'FR' },
  transport: { arrivalDate: RECORD_ARRIVAL_DATE },
  consignor: { name: CONSIGNOR_NAME },
  consignee: { name: CONSIGNEE_NAME }
})

const mockNotification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  created: RECORD_CREATED_AT,
  submittedAt: status === 'SUBMITTED' ? '2026-07-14T10:00:00' : null,
  fulfilments: []
})

describe('real records adapter — amend', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should POST the amend endpoint and marshal a writable amend record', async () => {
    fetchMocker.mockResponse(JSON.stringify(mockNotification('GBN-1', 'AMEND')))

    const amended = await records.amend('GBN-1')

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/GBN-1/amend`)
    expect(request.method).toBe('POST')
    expect(amended.status).toBe(AMEND)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe(RECORD_CREATED_AT)
  })

  test('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('GBN-1')).rejects.toThrow(
      /Failed to amend notification: 409/
    )
  })
})

describe('real records adapter — paged list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should GET /notifications and map main-shape entries to dashboard rows', async () => {
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 3,
        totalPages: 1,
        content: [
          notification('GBN-1', 'DRAFT'),
          notification('GBN-2', 'SUBMITTED'),
          notification('GBN-3', 'AMEND')
        ]
      })
    )

    const listed = await records.list({
      journeyIds: ['session-id-is-ignored-in-real-mode'],
      page: 2,
      sort: 'createdAt,asc'
    })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}?page=2&sort=createdAt,asc`)
    expect(request.method).toBe('GET')
    expect(listed).toEqual({
      page: 1,
      size: 20,
      totalElements: 3,
      totalPages: 1,
      rows: [
        {
          journeyId: 'GBN-1',
          status: DRAFT,
          createdAt: RECORD_CREATED_AT,
          submittedAt: null,
          reference: 'GBN-1',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        },
        {
          journeyId: 'GBN-2',
          status: SUBMITTED,
          createdAt: RECORD_CREATED_AT,
          submittedAt: null,
          reference: 'GBN-2',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        },
        {
          journeyId: 'GBN-3',
          status: AMEND,
          createdAt: RECORD_CREATED_AT,
          submittedAt: null,
          reference: 'GBN-3',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        }
      ]
    })
  })

  test('Should implement has with an exact-id canonical GET', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(mockNotification('GBN-1', 'DRAFT')), { status: 200 }],
      ['Not Found', { status: 404 }]
    )

    expect(await records.has('GBN-1')).toBe(true)
    expect(await records.has('GBN-GONE')).toBe(false)
    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: `${notificationsUrl}/GBN-1/fulfilments` },
      { method: 'GET', url: `${notificationsUrl}/GBN-GONE/fulfilments` }
    ])
  })
})
