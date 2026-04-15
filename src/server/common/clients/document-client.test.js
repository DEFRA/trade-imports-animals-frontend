import { vi } from 'vitest'

import { documentClient } from './document-client.js'

const mockLoggerError = vi.fn()

vi.mock('../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: (...args) => mockLoggerError(...args)
  })
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

describe('#documentClient', () => {
  const traceId = 'trace-123'
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn()
    mockLoggerError.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('initiate', () => {
    const notificationRef = 'NREF-001'
    const request = {
      documentType: 'ITAHC',
      documentReference: 'UK/GB/2026/001234',
      dateOfIssue: '2026-01-15'
    }

    describe('When initiate is called with valid args', () => {
      test('Should POST to the correct URL with request body', async () => {
        const responseBody = { uploadId: 'upload-abc' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await documentClient.initiate(
          notificationRef,
          request,
          traceId
        )

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/notifications/NREF-001/document-uploads',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-trace-id': traceId
            },
            body: JSON.stringify(request)
          }
        )

        expect(result).toEqual(responseBody)
      })

      test('Should set the tracing header on the request', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({})
        })

        await documentClient.initiate(notificationRef, request, 'my-trace-id')

        expect(fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'x-trace-id': 'my-trace-id'
            })
          })
        )
      })
    })

    describe('When initiate request fails', () => {
      test('Should throw an error when the response is not ok', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

        await expect(
          documentClient.initiate(notificationRef, request, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to initiate document upload',
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('getStatus', () => {
    const uploadId = 'upload-abc'

    describe('When getStatus is called with a valid upload ID', () => {
      test('Should GET the correct URL and return the response', async () => {
        const responseBody = { uploadId: 'upload-abc', scanStatus: 'PENDING' }

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await documentClient.getStatus(uploadId, traceId)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-backend/document-uploads/upload-abc',
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
    })

    describe('When getStatus request fails', () => {
      test('Should throw an error when the response is not ok', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })

        await expect(
          documentClient.getStatus(uploadId, traceId)
        ).rejects.toMatchObject({
          message: 'Failed to get document upload status',
          status: 404,
          statusText: 'Not Found'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })
})
