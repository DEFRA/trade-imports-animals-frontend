import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { startJourneyController } from './controller.js'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { config } from '../../config/config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    // Mock notification client to avoid backend calls
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'submit').mockResolvedValue({
      referenceNumber: 'TEST-REF-123'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should display title "Import notification service"', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service')
    )
  })

  test('Should display button to create import notification', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(result).toEqual(
      expect.stringContaining('Create an import notification')
    )
    expect(result).toEqual(expect.stringContaining('action="/start-journey"'))
  })

  test('Should not render sign-in/sign-out links when authEnabled is false', async () => {
    const originalGet = config.get.bind(config)
    const getSpy = vi
      .spyOn(config, 'get')
      .mockImplementation((key) =>
        key === 'auth.enabled' ? false : originalGet(key)
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('Sign in')
    expect(result).not.toContain('Sign out')
    expect(result).not.toContain('/auth/sign-in-oidc')
    expect(result).not.toContain('/signout')

    getSpy.mockRestore()
  })

  describe('POST /start-journey', () => {
    test('Should redirect to origin page', async () => {
      const request = {
        yar: {
          reset: vi.fn()
        }
      }

      const h = {
        redirect: (location) => ({
          statusCode: 302,
          location
        })
      }

      const response = await startJourneyController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(302)
      expect(response.location).toBe('/origin')
    })

    test('Should clear session when starting new journey', async () => {
      const request = {
        yar: {
          reset: vi.fn()
        }
      }

      const h = {
        redirect: (location) => ({
          statusCode: 302,
          location
        })
      }

      const response = await startJourneyController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(302)
      expect(response.location).toBe('/origin')
    })
  })
})
