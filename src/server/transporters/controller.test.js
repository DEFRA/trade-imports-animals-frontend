import { beforeEach, describe, expect, vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

const { mockSaveNotification } = vi.hoisted(() => ({
  mockSaveNotification: vi.fn()
}))

vi.mock('../common/helpers/notification-helpers.js', () => ({
  saveNotification: mockSaveNotification
}))

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

describe('#transportersController', () => {
  let server

  beforeAll(async () => {
    mockSaveNotification.mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /transporters', () => {
    test('renders transporters HTML page when no transporter is selected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters',
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
        url: '/transporters?selectedTransporter=0',
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
        url: '/transporters?selectedTransporter=2',
        auth: sessionAuth('transporter-get-selected-2')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('John Gosden LTD'))
      expect(result).toEqual(expect.stringContaining('UK/BURY/T2/00104127'))
    })

    test('ignores invalid selectedTransporter query values', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters?selectedTransporter=not-a-number',
        auth: sessionAuth('transporter-get-invalid-query')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
    })

    test('ignores out-of-range selectedTransporter index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters?selectedTransporter=99',
        auth: sessionAuth('transporter-get-oob-index')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Add a transporter'))
    })
  })

  describe('POST /transporters', () => {
    beforeEach(() => {
      mockSaveNotification.mockClear()
    })

    test('calls notification save then redirects to /consignment/contact/select', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporters',
        auth: sessionAuth('transporter-post-submit'),
        payload: {}
      })

      expect(mockSaveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/consignment/contact/select')
    })

    test('redirects to /consignment/contact/select when reference number is not in session', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporters',
        auth: sessionAuth('transporter-post-empty-session'),
        payload: {}
      })

      expect(mockSaveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/consignment/contact/select')
    })

    test('renders transporters page with error when notification save fails', async () => {
      mockSaveNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/transporters',
        auth: sessionAuth('transporter-post-submit-fail'),
        payload: {}
      })

      expect(mockSaveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(headers.location).toBeUndefined()
      expect(result).toEqual(
        expect.stringContaining(SUBMISSION_FAILURE_MESSAGE)
      )
    })
  })
})
