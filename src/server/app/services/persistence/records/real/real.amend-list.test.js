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
const ORGANISATION = '5900002'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'

const addressRequests = () =>
  fetchMocker
    .requests()
    .map(({ url }) => url)
    .filter((url) => url.startsWith(addressBookUrl))

const SAVED_ADDRESS_NAME = 'Astra Rosales'

const addressBookRecord = () => ({
  id: ADDRESS_ID,
  name: SAVED_ADDRESS_NAME,
  addressLine1: '43 East Hague Extension',
  townOrCity: 'Vernier',
  postcode: '30055',
  countryCode: 'CH',
  deleted: false
})

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

/** As stored once the consignor is a saved address: the reference alone, with
 * no copy of the name beside it. */
const referencingNotification = (referenceNumber, addressId) => ({
  ...notification(referenceNumber, 'DRAFT'),
  consignor: { addressId }
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
      sort: 'createdAt,asc',
      organisationId: '5900002'
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

// The unit suite runs in stub mode; the real address book only answers in real
// mode, so these turn the switch off for the length of the block. Set on the
// loaded config rather than the environment, because the flag is read through
// config and the environment is only consulted when config is first loaded.
describe('real records adapter — referenced party names', () => {
  const originalMode = config.get('stubMode')

  beforeEach(() => {
    fetchMocker.resetMocks()
    config.set('stubMode', false)
  })

  afterEach(() => {
    config.set('stubMode', originalMode)
  })

  test('Should resolve referenced party names, fetching a shared address once', async () => {
    // Two rows naming the same saved address. The dashboard renders the name,
    // the notification stores only the reference, so the name is fetched here —
    // once for the page, not once per row.
    fetchMocker.mockResponses(
      [
        JSON.stringify({
          page: 1,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          content: [
            referencingNotification('GBN-1', ADDRESS_ID),
            referencingNotification('GBN-2', ADDRESS_ID)
          ]
        }),
        { status: 200 }
      ],
      [JSON.stringify(addressBookRecord()), { status: 200 }]
    )

    const listed = await records.list({ page: 1, organisationId: ORGANISATION })

    expect(listed.rows.map((row) => row.consignorName)).toEqual([
      SAVED_ADDRESS_NAME,
      SAVED_ADDRESS_NAME
    ])
    expect(addressRequests()).toEqual([
      `${addressBookUrl}/organisation/${ORGANISATION}/addresses/${ADDRESS_ID}`
    ])
  })

  test('Should read an inline party name straight off the notification', async () => {
    // A party answered inline (AC5) carries its own name and is nobody's
    // address-book record, so the book is not asked about it.
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        content: [notification('GBN-1', 'DRAFT')]
      })
    )

    const listed = await records.list({ page: 1, organisationId: ORGANISATION })

    expect(listed.rows[0].consignorName).toBe(CONSIGNOR_NAME)
    expect(addressRequests()).toEqual([])
  })

  test('Should show a deleted address as no name rather than a stale one', async () => {
    // The agreed handling of a deleted address: the role reads as if it were
    // never entered. The API answers a tombstone rather than a 404 so that this
    // stays distinguishable from an address book that is simply down.
    fetchMocker.mockResponses(
      [
        JSON.stringify({
          page: 1,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          content: [referencingNotification('GBN-1', ADDRESS_ID)]
        }),
        { status: 200 }
      ],
      [
        JSON.stringify({ ...addressBookRecord(), deleted: true }),
        { status: 200 }
      ]
    )

    const listed = await records.list({ page: 1, organisationId: ORGANISATION })

    expect(listed.rows[0].consignorName).toBeNull()
  })

  test('Should fail loudly when a reference cannot be resolved for want of an organisation', async () => {
    // Without an organisation the address book has no book to look in. Reading
    // on regardless would render the row with a blank name, which is how a
    // deleted address reads — an unsigned-in visitor must not look like that.
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        content: [referencingNotification('GBN-1', ADDRESS_ID)]
      })
    )

    await expect(records.list({ page: 1 })).rejects.toThrow(
      /without an organisation/
    )
  })
})
