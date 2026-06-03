import { vi } from 'vitest'

import { notificationClient } from './notification-client.js'
import { sessionKeys } from '../constants/session-keys.js'

const mockLoggerError = vi.fn()
const mockGetSessionValue = vi.fn()
const mockSetSessionValue = vi.fn()

vi.mock('../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('../helpers/session-helpers.js', () => ({
  getSessionValue: (...args) => mockGetSessionValue(...args),
  setSessionValue: (...args) => mockSetSessionValue(...args)
}))

vi.mock('../../../config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsAnimalsBackendApi.baseUrl') {
        return 'http://mock-backend'
      }

      if (key === 'tracing.header') {
        return 'x-trace-id'
      }

      return undefined
    })
  }
}))

describe('#notificationClient', () => {
  const traceId = 'trace-123'
  const mockRequest = { session: {} }
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn()
    mockGetSessionValue.mockClear()
    mockSetSessionValue.mockClear()
    mockLoggerError.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('save', () => {
    describe('When submit is called with session values', () => {
      test('Should build notification from session values and send POST request', async () => {
        // Mock session values
        mockGetSessionValue.mockImplementation((req, key) => {
          const sessionData = {
            referenceNumber: 'REF-123',
            countryCode: 'GB',
            requiresRegionCode: 'yes',
            internalReference: 'TEST-001',
            commodity: { name: 'Fish' },
            reasonForImport: 'internalMarket',
            consignor: {
              name: 'Astra Rosales',
              address: {
                addressLine1: '43 East Hague Extension',
                country: 'Switzerland'
              }
            },
            destination: {
              name: 'Tech Imports Ltd',
              address: {
                addressLine1: '643 Main Street',
                country: 'United Kingdom'
              }
            },
            cphNumber: '123456789'
          }
          return sessionData[key]
        })

        const expectedNotification = {
          referenceNumber: 'REF-123',
          origin: {
            countryCode: 'GB',
            requiresRegionCode: 'yes',
            internalReference: 'TEST-001'
          },
          commodity: { name: 'Fish' },
          reasonForImport: 'internalMarket',
          consignor: {
            name: 'Astra Rosales',
            address: {
              addressLine1: '43 East Hague Extension',
              country: 'Switzerland'
            }
          },
          destination: {
            name: 'Tech Imports Ltd',
            address: {
              addressLine1: '643 Main Street',
              country: 'United Kingdom'
            }
          },
          cphNumber: '123456789'
        }

        const responseBody = { referenceNumber: 'REF-123' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.save(mockRequest, traceId)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            },
            body: JSON.stringify(expectedNotification)
          }
        )

        expect(result).toEqual(responseBody)
      })

      test('Should handle partial session values', async () => {
        // Mock only some session values
        mockGetSessionValue.mockImplementation((req, key) => {
          const sessionData = {
            countryCode: 'FR',
            commodity: 'Cat'
          }
          return sessionData[key]
        })

        const expectedNotification = {
          origin: {
            countryCode: 'FR'
          },
          commodity: 'Cat'
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            },
            body: JSON.stringify(expectedNotification)
          }
        )
      })

      test('Should include additionalDetails in payload when certifiedFor and unweanedAnimals are in session', async () => {
        mockGetSessionValue.mockImplementation((req, key) => {
          const sessionData = {
            certifiedFor: 'slaughter',
            unweanedAnimals: 'yes'
          }
          return sessionData[key] ?? null
        })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.additionalDetails).toEqual({
          certifiedFor: 'slaughter',
          unweanedAnimals: 'yes'
        })
      })

      test('Should send arrivalDate as ISO string when all parts are present', async () => {
        mockGetSessionValue.mockImplementation((req, key) => {
          const sessionData = {
            portOfEntry: 'ABERDEEN',
            arrivalDate: { day: 5, month: 3, year: 2026 }
          }
          return sessionData[key] ?? null
        })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.transport.portOfEntry).toBe('ABERDEEN')
        expect(body.transport.arrivalDate).toBe('2026-03-05')
      })

      test('Should omit arrivalDate from transport when any part is missing', async () => {
        mockGetSessionValue.mockImplementation((req, key) => {
          const sessionData = {
            portOfEntry: 'EDINBURGH',
            arrivalDate: { day: null, month: 3, year: 2026 }
          }
          return sessionData[key] ?? null
        })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.transport.portOfEntry).toBe('EDINBURGH')
        expect(body.transport.arrivalDate).toBeUndefined()
      })

      test('Should nest consignmentContactAddress under consignment.contact', async () => {
        const consignmentContactAddress = {
          name: 'Animal and Plant Health Agency',
          address: {
            addressLine1: 'Woodham Lane',
            country: 'United Kingdom'
          }
        }
        mockGetSessionValue.mockImplementation((req, key) => {
          if (key === sessionKeys.consignmentContactAddress) {
            return consignmentContactAddress
          }
          return null
        })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.consignment).toEqual({ contact: consignmentContactAddress })
      })

      test('Should nest transporter under transport when transporter is set without port or date', async () => {
        const transporter = {
          name: 'Example Haulage',
          approvalNumber: 'UK-1',
          type: 'Haulier',
          address: { addressLine1: '1 Road', country: 'GB' }
        }
        mockGetSessionValue.mockImplementation((req, key) => {
          if (key === 'transporter') {
            return transporter
          }
          return null
        })

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await notificationClient.save(mockRequest, traceId)

        const body = JSON.parse(fetch.mock.calls[0][1].body)
        expect(body.transport).toEqual({ transporter })
      })
    })

    describe('When save request fails', () => {
      test('Should throw an error when save request fails', async () => {
        mockGetSessionValue.mockReturnValue(null)

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn().mockResolvedValue({ message: 'Server error' })
        })

        await expect(
          notificationClient.save(mockRequest, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to submit notification',
          status: 500,
          statusText: 'Internal Server Error'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('submitNotification', () => {
    const referenceNumber = 'REF-123'

    describe('When submitNotification is called with a valid reference number', () => {
      test('Should send POST request to the submit endpoint and return the response', async () => {
        const responseBody = { referenceNumber, status: 'SUBMITTED' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.submitNotification(
          mockRequest,
          referenceNumber,
          traceId
        )

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications/REF-123/submit',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            }
          }
        )
        expect(result).toEqual(responseBody)
      })
    })

    describe('When submitNotification request fails', () => {
      test('Should throw an error with status details when the request fails', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

        await expect(
          notificationClient.submitNotification(
            mockRequest,
            referenceNumber,
            traceId
          )
        ).rejects.toMatchObject({
          message: 'Failed to submit notification',
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('get', () => {
    const referenceNumber = 'REF-123'

    describe('When get is called with valid reference number', () => {
      test('Should send GET request and store all values in session', async () => {
        const responseBody = {
          referenceNumber: 'REF-123',
          origin: {
            countryCode: 'GB',
            requiresRegionCode: 'yes',
            internalReference: 'TEST-001'
          },
          commodity: { name: 'Fish' },
          reasonForImport: 'internalMarket',
          consignor: {
            name: 'Astra Rosales',
            address: {
              addressLine1: '43 East Hague Extension',
              country: 'Switzerland'
            }
          },
          destination: {
            name: 'Tech Imports Ltd',
            address: {
              addressLine1: '643 Main Street',
              country: 'United Kingdom'
            }
          },
          cphNumber: '123456789'
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.get(
          mockRequest,
          referenceNumber,
          traceId
        )

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications/REF-123',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            }
          }
        )

        // Verify all values were stored in session
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.referenceNumber,
          'REF-123'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.countryCode,
          'GB'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.requiresRegionCode,
          'yes'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.internalReference,
          'TEST-001'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.commodity,
          {
            name: 'Fish'
          }
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.reasonForImport,
          'internalMarket'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.consignor,
          {
            name: 'Astra Rosales',
            address: {
              addressLine1: '43 East Hague Extension',
              country: 'Switzerland'
            }
          }
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.destination,
          {
            name: 'Tech Imports Ltd',
            address: {
              addressLine1: '643 Main Street',
              country: 'United Kingdom'
            }
          }
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.cphNumber,
          '123456789'
        )

        expect(result).toEqual(responseBody)
      })

      test('Should parse transport ISO arrivalDate back into session as day/month/year', async () => {
        const responseBody = {
          transport: {
            portOfEntry: 'ABERDEEN',
            arrivalDate: '2026-03-05'
          }
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.portOfEntry,
          'ABERDEEN'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.arrivalDate,
          { day: 5, month: 3, year: 2026 }
        )
      })

      test('Should hydrate transporter from transport.transporter when nested', async () => {
        const transporter = {
          name: 'Nested Ltd',
          approvalNumber: 'NEST-1',
          type: 'Haulier',
          address: { addressLine1: '2 Lane', country: 'ES' }
        }
        const responseBody = {
          transport: {
            portOfEntry: 'DOVER',
            transporter
          }
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.transporter,
          transporter
        )
      })

      test('Should hydrate transporter from root transporter when backend omits transport wrapper', async () => {
        const transporter = {
          name: 'Root Only Co',
          approvalNumber: 'ROOT-1',
          type: 'Haulier',
          address: { addressLine1: '3 St', country: 'FR' }
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ transporter })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.transporter,
          transporter
        )
      })

      test('Should hydrate certifiedFor and unweanedAnimals from additionalDetails', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            additionalDetails: {
              certifiedFor: 'slaughter',
              unweanedAnimals: 'yes'
            }
          })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.certifiedFor,
          'slaughter'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.unweanedAnimals,
          'yes'
        )
      })

      test('Should hydrate only certifiedFor when unweanedAnimals is absent', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            additionalDetails: { certifiedFor: 'slaughter' }
          })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.certifiedFor,
          'slaughter'
        )
        expect(mockSetSessionValue).not.toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.unweanedAnimals,
          expect.anything()
        )
      })

      test('Should hydrate only unweanedAnimals when certifiedFor is absent', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            additionalDetails: { unweanedAnimals: 'yes' }
          })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.unweanedAnimals,
          'yes'
        )
        expect(mockSetSessionValue).not.toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.certifiedFor,
          expect.anything()
        )
      })

      test('Should hydrate consignmentContactAddress from consignment.contact', async () => {
        const contact = {
          name: 'Animal and Plant Health Agency',
          address: {
            addressLine1: 'Woodham Lane',
            country: 'United Kingdom'
          }
        }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({ consignment: { contact } })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.consignmentContactAddress,
          contact
        )
      })

      test('Should prefer transport.transporter over root transporter when both are present', async () => {
        const nested = { name: 'Nested wins', approvalNumber: 'N-1' }
        const root = { name: 'Root loses', approvalNumber: 'R-1' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            transporter: root,
            transport: { transporter: nested }
          })
        })

        await notificationClient.get(mockRequest, referenceNumber, traceId)

        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          sessionKeys.transporter,
          nested
        )
      })
    })

    describe('When get request fails', () => {
      test('Should throw an error when get request fails', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: vi.fn().mockResolvedValue({ message: 'Notification not found' })
        })

        await expect(
          notificationClient.get(mockRequest, referenceNumber, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to get notification',
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('softDelete', () => {
    const referenceNumber = 'REF-123'

    describe('When softDelete is called with a valid reference number', () => {
      test('Should send POST request to the soft-delete endpoint and return the response', async () => {
        const responseBody = { referenceNumber, status: 'DELETED' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.softDelete(
          mockRequest,
          referenceNumber,
          traceId
        )

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications/REF-123/soft-delete',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            }
          }
        )
        expect(result).toEqual(responseBody)
      })
    })

    describe('When softDelete request fails', () => {
      test('Should throw an error with status details when the request fails', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

        await expect(
          notificationClient.softDelete(mockRequest, referenceNumber, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to delete notification',
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('copy', () => {
    const referenceNumber = 'REF-123'

    describe('When copy is called with a valid reference number', () => {
      test('Should send POST request to the copy endpoint and return the new notification', async () => {
        const responseBody = { referenceNumber: 'REF-456', status: 'DRAFT' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.copy(
          mockRequest,
          referenceNumber,
          traceId
        )

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          `http://mock-backend/notifications/${referenceNumber}/copy`,
          {
            method: 'POST',
            headers: {
              'x-trace-id': traceId
            }
          }
        )
        expect(result).toEqual(responseBody)
      })
    })

    describe('When copy request fails', () => {
      test('Should throw an error with status details when the request fails', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

        await expect(
          notificationClient.copy(mockRequest, referenceNumber, traceId)
        ).rejects.toMatchObject({
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('findAll', () => {
    test('Should send GET request with default page param and return NotificationPageResponse', async () => {
      const responseBody = {
        content: [
          {
            referenceNumber: 'REF-123',
            status: 'DRAFT',
            createdAt: '2026-04-20T10:00:00.000Z',
            origin: { countryCode: 'FI' },
            commodity: { name: 'Cow', code: '0102' },
            consignor: { name: 'Tampere Horse Transport' },
            transport: { arrivalDate: '2026-04-20' }
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(responseBody)
      })

      const result = await notificationClient.findAll(mockRequest, traceId)

      expect(fetch).toHaveBeenCalledWith('http://mock-backend/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': traceId
        }
      })
      expect(result).toEqual(responseBody)
    })

    test('Should send GET request with custom page param', async () => {
      const responseBody = {
        content: [],
        page: 2,
        size: 20,
        totalElements: 25,
        totalPages: 3
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(responseBody)
      })

      const result = await notificationClient.findAll(mockRequest, traceId, {
        page: 2
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://mock-backend/notifications?page=2',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-trace-id': traceId
          }
        }
      )
      expect(result).toEqual(responseBody)
    })

    test('Should throw an error when findAll request fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(
        notificationClient.findAll(mockRequest, traceId)
      ).rejects.toMatchObject({
        message: 'Failed to get notifications',
        status: 503,
        statusText: 'Service Unavailable'
      })

      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })
})
