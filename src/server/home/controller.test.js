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

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

const mockFindAllApiResponse = {
  notifications: [
    {
      referenceNumber: 'REF-123',
      status: 'DRAFT',
      createdAt: '2026-04-20T10:00:00.000Z',
      origin: { countryCode: 'FI', countryName: 'Finland' },
      commodity: { name: 'Cow', code: '0102' },
      consignor: { name: 'Tampere Horse Transport' },
      transport: { arrivalDate: '2026-04-20' }
    }
  ]
}

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    // Mock notification client to avoid backend calls
    vi.spyOn(notificationClient, 'get').mockResolvedValue(null)
    vi.spyOn(notificationClient, 'findAll').mockResolvedValue([])
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

  describe('GET /', () => {
    beforeEach(() => {
      notificationClient.findAll.mockClear()
      notificationClient.findAll.mockResolvedValue([])
    })

    test('Should call findAll and show zero results when no notifications', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-empty-list')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('0 Results'))
      expect(result).not.toEqual(expect.stringContaining('govuk-summary-card'))
    })

    test('Should render notification list when findAll returns notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-with-notifications')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('1 Results'))
      expect(result).toEqual(expect.stringContaining('REF-123'))
      expect(result).toEqual(expect.stringContaining('Cow'))
      expect(result).toEqual(expect.stringContaining('FI'))
      expect(result).toEqual(expect.stringContaining('20 Apr 2026'))
      expect(result).toEqual(expect.stringContaining('Tampere Horse Transport'))
      expect(result).toEqual(expect.stringContaining('govuk-tag--grey'))
      expect(result).toEqual(expect.stringContaining('DRAFT'))
    })

    test('Should render SUBMITTED notifications with a green status tag', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        notifications: [
          {
            ...mockFindAllApiResponse.notifications[0],
            referenceNumber: 'REF-456',
            status: 'SUBMITTED'
          }
        ]
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-submitted-notification')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('REF-456'))
      expect(result).toEqual(expect.stringContaining('govuk-tag--blue'))
      expect(result).toEqual(expect.stringContaining('SUBMITTED'))
    })

    test('Should return 500 when findAll fails', async () => {
      notificationClient.findAll.mockRejectedValueOnce(
        new Error('Backend error')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-find-all-failure')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual(
        expect.stringContaining('Import notification service')
      )
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'Something went wrong, please contact the EUDP team'
        )
      )
    })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-default')
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
      auth: sessionAuth('home-get-title')
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service')
    )
  })

  test('Should display button to create import notification', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-create-button')
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
      auth: sessionAuth('home-get-auth-disabled')
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
