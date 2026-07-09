import { vi } from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import destinations from './mock-destinations.json'

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock(
  '../../../common/helpers/session-helpers.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      setSessionValue: vi.fn(actual.setSessionValue),
      getSessionValue: vi.fn(actual.getSessionValue)
    }
  }
)

describe('#destinationsSelectController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /destinations/select', () => {
    afterEach(() => {
      sessionHelpers.getSessionValue.mockReset()
    })

    test('renders page with destination addresses from json file', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Search for a place of destination')
      )
      expect(result).toEqual(expect.stringContaining('Tech Imports Ltd'))
      expect(result).toEqual(expect.stringContaining('United Commerce'))
      expect(result).toEqual(expect.stringContaining('Global Trading Co'))
      expect(result).toEqual(expect.stringContaining('United Kingdom'))
    })

    test('pre-selects the radio matching the destination stored in session', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.destination) {
          return destinations[1]
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID_HYDRATE' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringMatching(/value="1"[^>]*\bchecked\b/))
    })

    test('pre-selects the first radio when the stored destination is at index 0', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.destination) {
          return destinations[0]
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: {
            user: {},
            sessionId: 'TEST_SESSION_ID_HYDRATE_ZERO'
          }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringMatching(/value="0"[^>]*\bchecked\b/))
    })
  })

  describe('POST /destinations/select', () => {
    afterEach(() => {
      sessionHelpers.setSessionValue.mockClear()
      sessionHelpers.getSessionValue.mockReset()
    })

    test('saves to session and redirects to /addresses', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'DST.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { destination: '0' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.destination,
        destinations[0]
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('re-renders with error when no selection made', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of destination')
      )
    })

    test('re-renders with error for non-numeric selection', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { destination: 'invalid' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of destination')
      )
    })

    test('re-renders with error for out-of-range index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { destination: '999' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of destination')
      )
    })

    test('re-renders with error for negative index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { destination: '-1' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of destination')
      )
    })
  })
})
