import { vi } from 'vitest'

import { originClient } from './origin-client.js'

const mockLoggerError = vi.fn()

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('../../config/config.js', () => ({
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

describe('#originClient', () => {
  const originPayload = { country: 'GB' }
  const traceId = 'trace-123'
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('When submit is called with valid data', () => {
    test('Should send POST request to origin endpoint with correct headers and body', async () => {
      const responseBody = { id: '123', ...originPayload }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(responseBody)
      })

      const result = await originClient.submit(originPayload, traceId)

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith('http://mock-backend/origin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': traceId
        },
        body: JSON.stringify(originPayload)
      })

      expect(result).toEqual(responseBody)
    })
  })

  describe('When submit request failed', () => {
    test('Should throw an error when submit request failed', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({ message: 'Bad request' })
      })

      await expect(
        originClient.submit(originPayload, traceId)
      ).rejects.toMatchObject({
        message: 'Failed to submit origin',
        status: 400,
        statusText: 'Bad Request'
      })

      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })
})
