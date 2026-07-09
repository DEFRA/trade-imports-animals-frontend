import { vi } from 'vitest'

import { portsOfEntryClient } from './ports-of-entry-client.js'

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
      if (key === 'tradeImportsReferenceDataApi.baseUrl') {
        return 'http://mock-reference-data'
      }

      if (key === 'tracing.header') {
        return 'x-trace-id'
      }

      return undefined
    })
  }
}))

describe('#portsOfEntryClient', () => {
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

  describe('getPortsOfEntry', () => {
    test('Should send GET request to /ports-of-entry and return parsed body', async () => {
      const responseBody = [
        { code: 'GBABE', name: 'Aberdeen' },
        { code: 'GBEDI', name: 'Edinburgh' }
      ]

      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(responseBody)
      })

      const result = await portsOfEntryClient.getPortsOfEntry(traceId)

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledWith(
        'http://mock-reference-data/ports-of-entry',
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

    test('Should throw an error with status details when request fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      })

      await expect(
        portsOfEntryClient.getPortsOfEntry(traceId)
      ).rejects.toMatchObject({
        message: 'Failed to get ports of entry',
        status: 503,
        statusText: 'Service Unavailable'
      })

      expect(mockLoggerError).toHaveBeenCalledTimes(1)
    })
  })
})
