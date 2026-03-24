import { vi } from 'vitest'

import { notificationClient } from '../common/clients/notification-client.js'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { load } from 'cheerio'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#commoditiesController', () => {
  let server
  beforeAll(async () => {
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

  describe('GET /commodities', () => {
    test('Should render the commodities page with expected content', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Commodities |'))
      expect(result).toEqual(expect.stringContaining('Select a Commodity'))
    })

    test('Should display commodity select dropdown with Fish, Cat, Dog', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const selectOptions = $('#commodity option')

      expect(selectOptions.length).toBe(5)
      expect(result).toEqual(expect.stringContaining('Fish'))
      expect(result).toEqual(expect.stringContaining('Cat'))
      expect(result).toEqual(expect.stringContaining('Dog'))
    })

    test('Should render form with CSRF token', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)

      const $ = load(result)
      const csrfInput = $('input[name="crumb"]')

      expect(csrfInput.length).toBe(1)
      expect(csrfInput.attr('type')).toBe('hidden')
    })

    test('Should display hint text for commodity select', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Select the type of animal you are importing')
      )
    })
  })

  describe('POST /commodities', () => {
    test('Should save commodity to session and redirect', async () => {
      const options = {
        method: 'POST',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          commodity: 'Fish'
        }
      }

      const { statusCode, headers } = await server.inject(options)

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/commodities/select')
    })

    test('Should handle different commodity values correctly', async () => {
      const commodities = ['Fish', 'Cat', 'Dog']

      for (const commodity of commodities) {
        const options = {
          method: 'POST',
          url: '/commodities',
          auth: {
            strategy: 'session',
            credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
          },
          payload: {
            commodity
          }
        }

        const { statusCode, headers } = await server.inject(options)

        expect(statusCode).toBe(302)
        expect(headers.location).toBe('/commodities/select')
      }
    })

    test('Should persist commodity across requests', async () => {
      const postResponse = await server.inject({
        method: 'POST',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          commodity: 'Cat'
        }
      })

      expect(postResponse.statusCode).toBe(302)

      const sessionCookie = postResponse.headers['set-cookie']
        ? postResponse.headers['set-cookie'][0].split(';')[0]
        : null

      expect(sessionCookie).toBeTruthy()
    })

    test('Should handle when backend submit fails', async () => {
      notificationClient.submit = vi.fn().mockRejectedValue(
        Object.assign(new Error('Backend error'), {
          status: 500,
          statusText: 'Internal Server Error'
        })
      )

      const options = {
        method: 'POST',
        url: '/commodities',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          commodity: 'Dog'
        }
      }

      const { statusCode, headers } = await server.inject(options)

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/commodities/select')
    })
  })
})
