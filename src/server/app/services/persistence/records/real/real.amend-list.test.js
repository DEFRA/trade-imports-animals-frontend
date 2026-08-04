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

const notificationFulfilmentsUrl =
  'http://localhost:8085/notification-fulfilments'
const notificationsUrl = 'http://localhost:8085/notifications'

const notification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  created: '2026-07-14T09:00:00',
  updated: '2026-07-14T09:00:00',
  commodity: { name: 'Cow' },
  origin: { countryCode: 'FR' },
  transport: { arrivalDate: '2026-07-20' },
  consignor: { name: 'Consignor Ltd' },
  consignee: { name: 'Consignee Ltd' }
})

const notificationFulfilments = (id, status) => ({
  id,
  status,
  createdAt: '2026-07-14T09:00:00',
  submittedAt: status === 'SUBMITTED' ? '2026-07-14T10:00:00' : null,
  fulfilments: []
})

describe('real records adapter — amend', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should POST the amend endpoint and marshal a writable amend record', async () => {
    fetchMocker.mockResponse(
      JSON.stringify(notificationFulfilments('GBN-1', 'AMEND'))
    )

    const amended = await records.amend('GBN-1')

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationFulfilmentsUrl}/GBN-1/amend`)
    expect(request.method).toBe('POST')
    expect(amended.status).toBe(AMEND)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe('2026-07-14T09:00:00')
  })

  test('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('GBN-1')).rejects.toThrow(
      /Failed to amend notification-fulfilments: 409/
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
          createdAt: '2026-07-14T09:00:00',
          submittedAt: null,
          reference: 'GBN-1',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: '2026-07-20',
          consignorName: 'Consignor Ltd',
          consigneeName: 'Consignee Ltd'
        },
        {
          journeyId: 'GBN-2',
          status: SUBMITTED,
          createdAt: '2026-07-14T09:00:00',
          submittedAt: null,
          reference: 'GBN-2',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: '2026-07-20',
          consignorName: 'Consignor Ltd',
          consigneeName: 'Consignee Ltd'
        },
        {
          journeyId: 'GBN-3',
          status: AMEND,
          createdAt: '2026-07-14T09:00:00',
          submittedAt: null,
          reference: 'GBN-3',
          commodity: { name: 'Cow' },
          originCountryCode: 'FR',
          arrivalDate: '2026-07-20',
          consignorName: 'Consignor Ltd',
          consigneeName: 'Consignee Ltd'
        }
      ]
    })
  })

  test('Should implement has with an exact-id canonical GET', async () => {
    fetchMocker.mockResponses(
      [
        JSON.stringify(notificationFulfilments('GBN-1', 'DRAFT')),
        { status: 200 }
      ],
      ['Not Found', { status: 404 }]
    )

    expect(await records.has('GBN-1')).toBe(true)
    expect(await records.has('GBN-GONE')).toBe(false)
    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: `${notificationFulfilmentsUrl}/GBN-1` },
      { method: 'GET', url: `${notificationFulfilmentsUrl}/GBN-GONE` }
    ])
  })
})
