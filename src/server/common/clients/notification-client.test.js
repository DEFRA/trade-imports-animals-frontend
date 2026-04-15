import { vi } from 'vitest'

import { notificationClient } from './notification-client.js'

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

  describe('submit', () => {
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
            reasonForImport: 'internalMarket'
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
          reasonForImport: 'internalMarket'
        }

        const responseBody = { referenceNumber: 'REF-123' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await notificationClient.submit(mockRequest, traceId)

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

        await notificationClient.submit(mockRequest, traceId)

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
    })

    describe('When submit request fails', () => {
      test('Should throw an error when submit request fails', async () => {
        mockGetSessionValue.mockReturnValue(null)

        fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn().mockResolvedValue({ message: 'Server error' })
        })

        await expect(
          notificationClient.submit(mockRequest, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to submit notification',
          status: 500,
          statusText: 'Internal Server Error'
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
          reasonForImport: 'internalMarket'
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
          'referenceNumber',
          'REF-123'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'countryCode',
          'GB'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'requiresRegionCode',
          'yes'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'internalReference',
          'TEST-001'
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'commodity',
          {
            name: 'Fish'
          }
        )
        expect(mockSetSessionValue).toHaveBeenCalledWith(
          mockRequest,
          'reasonForImport',
          'internalMarket'
        )

        expect(result).toEqual(responseBody)
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
})
