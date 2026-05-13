import { beforeEach, describe, expect, vi } from 'vitest'

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

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

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
    test('renders transporter HTML page when no transporter is selected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter',
        auth: sessionAuth('transporter-get-default')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Transporter'))
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
      expect(result).not.toContain('García Livestock Transport SL')
    })

    test('stores transporter from selectedTransporter query and renders table', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter?selectedTransporter=0',
        auth: sessionAuth('transporter-get-selected-0')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('García Livestock Transport SL')
      )
      expect(result).toEqual(expect.stringContaining('ES-T2-45001294'))
      expect(result).not.toContain('Add a transporter')
    })

    test('accepts third mock transporter index from query', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter?selectedTransporter=2',
        auth: sessionAuth('transporter-get-selected-2')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('John Gosden LTD'))
      expect(result).toEqual(expect.stringContaining('UK/BURY/T2/00104127'))
    })

    test('ignores invalid selectedTransporter query values', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter?selectedTransporter=not-a-number',
        auth: sessionAuth('transporter-get-invalid-query')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
    })

    test('ignores out-of-range selectedTransporter index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporter?selectedTransporter=99',
        auth: sessionAuth('transporter-get-oob-index')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
    })
  })

  describe('POST /transporter', () => {
    beforeEach(() => {
      notificationClient.save.mockClear()
    })

    test('calls notification save then redirects to /declaration', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporter',
        auth: sessionAuth('transporter-post-submit'),
        payload: {}
      })

      expect(notificationClient.save).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/declaration')
    })

    test('redirects to /declaration when reference number is not in session', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporter',
        auth: sessionAuth('transporter-post-empty-session'),
        payload: {}
      })

      expect(notificationClient.save).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/declaration')
    })

    test('renders transporter page with error when notification save fails', async () => {
      notificationClient.save.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/transporter',
        auth: sessionAuth('transporter-post-submit-fail'),
        payload: {}
      })

      expect(notificationClient.save).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(headers.location).toBeUndefined()
      expect(result).toEqual(
        expect.stringContaining(
          'Something went wrong, please contact the EUDP team'
        )
      )
    })
  })
})
