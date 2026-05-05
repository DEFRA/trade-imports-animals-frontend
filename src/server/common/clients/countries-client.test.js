import { vi } from 'vitest'

import { countriesClient } from './countries-client.js'

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

describe('#countriesClient', () => {
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

  describe('getCountries', () => {
    describe('When called without classifiers', () => {
      test('Should send GET request to /countries with no query params', async () => {
        const responseBody = [{ code: 'GB', name: 'United Kingdom' }]

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await countriesClient.getCountries(traceId)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-reference-data/countries',
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

    describe('When called with classifiers', () => {
      test('Should append each classifier as a query param', async () => {
        const responseBody = [{ code: 'FR', name: 'France' }]

        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(responseBody)
        })

        const result = await countriesClient.getCountries(traceId, [
          'origin',
          'destination'
        ])

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith(
          'http://mock-reference-data/countries?classifier=origin&classifier=destination',
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

      test('Should handle a single classifier', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([])
        })

        await countriesClient.getCountries(traceId, ['origin'])

        expect(fetch).toHaveBeenCalledWith(
          'http://mock-reference-data/countries?classifier=origin',
          expect.any(Object)
        )
      })

      test('Should not append query params for an empty classifiers array', async () => {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([])
        })

        await countriesClient.getCountries(traceId, [])

        expect(fetch).toHaveBeenCalledWith(
          'http://mock-reference-data/countries',
          expect.any(Object)
        )
      })
    })

    describe('When the request fails', () => {
      test('Should throw an error with status details', async () => {
        fetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable'
        })

        await expect(
          countriesClient.getCountries(traceId)
        ).rejects.toMatchObject({
          message: 'Failed to get countries',
          status: 503,
          statusText: 'Service Unavailable'
        })

        expect(mockLoggerError).toHaveBeenCalledTimes(1)
      })
    })
  })
})
