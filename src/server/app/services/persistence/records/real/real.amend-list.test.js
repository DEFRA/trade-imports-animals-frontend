import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { config } from '../../../../../../config/config.js'
import { records } from './index.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const notificationsUrl = 'http://localhost:8085/notifications'
const addressBookUrl = 'http://localhost:8089'

const RECORD_CREATED_AT = '2026-07-14T09:00:00'
const RECORD_ARRIVAL_DATE = '2026-07-20'
const CONSIGNOR_NAME = 'Consignor Ltd'
const CONSIGNEE_NAME = 'Consignee Ltd'

const addressRequests = () =>
  fetchMocker
    .requests()
    .map(({ url }) => url)
    .filter((url) => url.startsWith(addressBookUrl))

/** A party as stored: a literal copy of the picked address, no addressId. */
const partyCopy = (name, addressLine1, countryCode) => ({
  name,
  phone: '01234 567890',
  email: 'party@example.com',
  address: {
    addressLine1,
    townOrCity: 'Vernier',
    postcode: '30055',
    countryCode
  }
})

const notification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  concurrencyToken: 0,
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
          concurrencyToken: 0,
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
          concurrencyToken: 0,
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
          concurrencyToken: 0,
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

// Run in real mode so that, were the adapter still to resolve parties against
// the address book, the request would reach the fetch mock and be seen. Set on
// the loaded config, because the flag is read through config.
describe('real records adapter — party names from the stored copy', () => {
  const originalMode = config.get('stubMode')

  const listedPage = (content) =>
    JSON.stringify({
      page: 1,
      size: 20,
      totalElements: content.length,
      totalPages: 1,
      content
    })

  beforeEach(() => {
    fetchMocker.resetMocks()
    config.set('stubMode', false)
  })

  afterEach(() => {
    config.set('stubMode', originalMode)
  })

  test.each([
    ['DRAFT', DRAFT],
    ['AMEND', AMEND],
    ['SUBMITTED', SUBMITTED]
  ])(
    'Should read party names from the stored copy on a %s row without calling the address book',
    async (backendStatus, status) => {
      fetchMocker.mockResponse(
        listedPage([
          {
            ...notification('GBN-1', backendStatus),
            consignor: partyCopy(
              'Astra Rosales',
              '43 East Hague Extension',
              'CH'
            ),
            consignee: partyCopy(
              'British Livestock Ltd',
              '10 Market Street',
              'GB'
            )
          }
        ])
      )

      const listed = await records.list({ page: 1 })

      expect(listed.rows[0]).toMatchObject({
        status,
        consignorName: 'Astra Rosales',
        consigneeName: 'British Livestock Ltd'
      })
      expect(addressRequests()).toEqual([])
    }
  )

  test('Should list without an organisation, as no party is resolved', async () => {
    fetchMocker.mockResponse(listedPage([notification('GBN-1', 'DRAFT')]))

    const listed = await records.list({ page: 1 })

    expect(listed.rows[0].consignorName).toBe(CONSIGNOR_NAME)
    expect(fetchMocker.requests()).toHaveLength(1)
  })

  test('Should show no name for a legacy row holding only an addressId', async () => {
    fetchMocker.mockResponse(
      listedPage([
        {
          ...notification('GBN-1', 'DRAFT'),
          consignor: { addressId: '665f1c2ab3e4d51a2c9d0e77' }
        }
      ])
    )

    const listed = await records.list({ page: 1 })

    expect(listed.rows[0].consignorName).toBeNull()
    expect(addressRequests()).toEqual([])
  })
})
