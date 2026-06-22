import { vi } from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import placeOfOrigins from './mock-place-of-origins.json'

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

describe('#placeOfOriginSelectController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /place-of-origin/select', () => {
    afterEach(() => {
      sessionHelpers.getSessionValue.mockReset()
    })

    test('renders page with place of origin addresses from json file', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Search for a place of origin')
      )
      expect(result).toEqual(expect.stringContaining('Origin Farm'))
      expect(result).toEqual(expect.stringContaining('Nordic Livestock AS'))
      expect(result).toEqual(expect.stringContaining('Ireland'))
      expect(result).toEqual(expect.stringContaining('Norway'))
    })

    test('pre-selects the radio matching the place of origin stored in session', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.placeOfOrigin) {
          return placeOfOrigins[1]
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID_HYDRATE' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringMatching(/value="1"[^>]*\bchecked\b/))
    })

    test('pre-selects the first radio when the stored place of origin is at index 0', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.placeOfOrigin) {
          return placeOfOrigins[0]
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID_HYDRATE_ZERO' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringMatching(/value="0"[^>]*\bchecked\b/))
    })
  })

  describe('POST /place-of-origin/select', () => {
    afterEach(() => {
      sessionHelpers.setSessionValue.mockClear()
      sessionHelpers.getSessionValue.mockReset()
    })

    test('saves to session and redirects to /addresses', async () => {
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'IMP.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { placeOfOrigin: '0' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.placeOfOrigin,
        placeOfOrigins[0]
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('re-renders with error when no selection made', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of origin')
      )
    })

    test('re-renders with error for non-numeric selection', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { placeOfOrigin: 'invalid' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of origin')
      )
    })

    test('re-renders with error for out-of-range index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { placeOfOrigin: '999' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of origin')
      )
    })

    test('re-renders with error for negative index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { placeOfOrigin: '-1' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a place of origin')
      )
    })
  })
})
