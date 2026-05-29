import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'

vi.mock('../common/clients/notification-client.js')
vi.mock('../common/clients/countries-client.js')

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const mockNotification = {
  referenceNumber: 'IMP.GB.2026.1001401',
  createdAt: '2026-04-15T10:00:00.000Z',
  origin: {
    countryCode: 'FI',
    requiresRegionCode: 'no',
    internalReference: 'FIN-EXP-2026.449B'
  },
  commodity: { name: 'Cow', code: '0102' },
  additionalDetails: {
    certifiedFor: 'Breeding and/or production',
    unweanedAnimals: 'No'
  },
  reasonForImport: 'internalMarket',
  consignor: {
    name: 'Tampere Horse Transport',
    address: { addressLine1: 'Koprinatie 14', country: 'Finland' }
  },
  destination: {
    name: 'Leicester Cattle Finishing Unit',
    address: { addressLine1: '1 Main Street', country: 'United Kingdom' }
  },
  cphNumber: '12/343/R783',
  transport: {
    portOfEntry: 'Port of Dover GBDVR',
    arrivalDate: '2026-04-20',
    transporter: {
      name: 'Nordic Livestock Haulage Oy',
      address: { addressLine1: 'Novel 3', country: 'Finland' },
      approvalNumber: 'FITH-2016-7781',
      type: 'Commercial transporter'
    }
  },
  documents: []
}

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

describe('#notificationViewController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    countriesClient.getCountries.mockResolvedValue([])
  })

  describe('GET /notification-view/{referenceNumber}', () => {
    beforeEach(() => {
      notificationClient.get.mockClear()
    })

    test('Should return 200 and render notification details', async () => {
      notificationClient.get.mockResolvedValueOnce(mockNotification)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-get')
      })

      expect(notificationClient.get).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('IMP.GB.2026.1001401 - Notification details')
      )
    })

    test('Should render date created', async () => {
      notificationClient.get.mockResolvedValueOnce(mockNotification)

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-date')
      })

      expect(result).toEqual(expect.stringContaining('15 April 2026'))
    })

    test('Should render all section headings', async () => {
      notificationClient.get.mockResolvedValueOnce(mockNotification)

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-sections')
      })

      expect(result).toEqual(
        expect.stringContaining('Where is this consignment coming from?')
      )
      expect(result).toEqual(expect.stringContaining('Your commodities'))
      expect(result).toEqual(
        expect.stringContaining('Additional information details')
      )
      expect(result).toEqual(
        expect.stringContaining('Reason for importing the animals')
      )
      expect(result).toEqual(expect.stringContaining('Addresses'))
      expect(result).toEqual(
        expect.stringContaining('County Parish Holding number (CPH)')
      )
      expect(result).toEqual(expect.stringContaining('Transport details'))
      expect(result).toEqual(expect.stringContaining('Accompanying documents'))
    })

    test('Should render notification data in the page with country name', async () => {
      notificationClient.get.mockResolvedValueOnce(mockNotification)
      countriesClient.getCountries.mockResolvedValueOnce([
        { code: 'FI', name: 'Finland' }
      ])

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-data')
      })

      expect(result).toEqual(expect.stringContaining('Finland'))
      expect(result).toEqual(expect.stringContaining('FIN-EXP-2026.449B'))
      expect(result).toEqual(expect.stringContaining('Cow (0102)'))
      expect(result).toEqual(expect.stringContaining('Internal market'))
      expect(result).toEqual(expect.stringContaining('Tampere Horse Transport'))
      expect(result).toEqual(expect.stringContaining('12/343/R783'))
      expect(result).toEqual(
        expect.stringContaining('Nordic Livestock Haulage Oy')
      )
      expect(result).toEqual(expect.stringContaining('20 April 2026'))
    })

    test('Should show country code when countries client fails', async () => {
      notificationClient.get.mockResolvedValueOnce(mockNotification)
      countriesClient.getCountries.mockRejectedValueOnce(
        new Error('Reference data unavailable')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-countries-fail')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('FI'))
    })

    test('Should render Not provided for missing fields on a partial notification', async () => {
      notificationClient.get.mockResolvedValueOnce({
        referenceNumber: 'IMP.GB.2026.0000001'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.0000001',
        auth: sessionAuth('notification-view-partial')
      })

      expect(result).toEqual(expect.stringContaining('Not provided'))
    })

    test('Should return 500 when the API call fails', async () => {
      notificationClient.get.mockRejectedValueOnce(new Error('Backend error'))

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-500')
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual(
        expect.stringContaining(
          'Sorry, there was a problem loading this notification.'
        )
      )
    })

    test('Should return 404 when the notification is not found', async () => {
      const notFoundError = new Error('Not found')
      notFoundError.status = statusCodes.notFound
      notificationClient.get.mockRejectedValueOnce(notFoundError)

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.9999999',
        auth: sessionAuth('notification-view-404')
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('Should render delete button when notification is DRAFT', async () => {
      notificationClient.get.mockResolvedValueOnce({
        ...mockNotification,
        status: 'DRAFT'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-delete-draft')
      })

      expect(result).toEqual(
        expect.stringContaining('data-reference-number="IMP.GB.2026.1001401"')
      )
      expect(result).toEqual(
        expect.stringContaining('Delete this notification?')
      )
    })

    test('Should render delete button when notification is SUBMITTED', async () => {
      notificationClient.get.mockResolvedValueOnce({
        ...mockNotification,
        status: 'SUBMITTED'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-delete-submitted')
      })

      expect(result).toEqual(
        expect.stringContaining('data-reference-number="IMP.GB.2026.1001401"')
      )
    })

    test('Should not render delete button when notification is DELETED', async () => {
      notificationClient.get.mockResolvedValueOnce({
        ...mockNotification,
        status: 'DELETED'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/notification-view/IMP.GB.2026.1001401',
        auth: sessionAuth('notification-view-no-delete-deleted')
      })

      expect(result).not.toEqual(
        expect.stringContaining('data-reference-number="IMP.GB.2026.1001401"')
      )
    })
  })
})
