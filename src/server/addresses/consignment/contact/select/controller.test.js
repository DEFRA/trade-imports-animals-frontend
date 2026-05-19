import { describe, expect, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { notificationClient } from '../../../../common/clients/notification-client.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../../common/helpers/session-helpers.js'
import contacts from './mock-contacts.json'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock(
  '../../../../common/helpers/session-helpers.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return { ...actual, setSessionValue: vi.fn(actual.setSessionValue) }
  }
)

describe('#consignmentContactSelectController', () => {
  let server

  beforeAll(async () => {
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

  describe('GET /consignment/contact/select', () => {
    test('GET /consignment/contact/select renders page with contact addresses from json file', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Contact address for consignment')
      )
      expect(result).toEqual(
        expect.stringContaining('Animal and Plant Health Agency')
      )
      expect(result).toEqual(expect.stringContaining('EuroStore Services'))
      expect(result).toEqual(expect.stringContaining('Laiterie du Nord SARL'))
      expect(result).toEqual(expect.stringContaining('United Kingdom'))
      expect(result).toEqual(expect.stringContaining('Select an address'))
    })
  })

  describe('POST /consignment/contact/select', () => {
    beforeEach(() => {
      notificationClient.save.mockClear()
      sessionHelpers.setSessionValue.mockClear()
    })

    test('POST /consignment/contact/select calls notification save then redirects to /declaration', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { contactAddress: '0' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'contactAddress',
        contacts[0]
      )
      expect(notificationClient.save).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/declaration')
    })

    test('POST /consignment/contact/select renders page with error when notification save fails', async () => {
      notificationClient.save.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID_FAIL' }
        },
        payload: { contactAddress: '0' }
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

    test('POST /consignment/contact/select re-renders with error when no contact selected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a contact address')
      )
    })

    test('POST /consignment/contact/select re-renders with error for non-numeric selection', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { contactAddress: 'invalid' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a contact address')
      )
    })

    test('POST /consignment/contact/select re-renders with error for out-of-range index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { contactAddress: '999' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a contact address')
      )
    })

    test('POST /consignment/contact/select re-renders with error for negative index', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { contactAddress: '-1' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('Select a contact address')
      )
    })
  })
})
