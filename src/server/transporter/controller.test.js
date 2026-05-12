import { vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#transporterController', () => {
  let server

  beforeAll(async () => {
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'save').mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /transporter', () => {
    test('renders transporter HTML page', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Transporter'))
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
    })
  })

  describe('POST /transporter', () => {
    test('redirects to /declaration', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporter',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {}
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/declaration')
    })

    test('redirects to /declaration regardless when reference number is not in session', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporter',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'EMPTY_SESSION_ID' }
        },
        payload: {}
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/declaration')
    })
  })
})
