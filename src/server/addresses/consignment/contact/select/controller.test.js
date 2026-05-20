import { describe, expect, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../../../common/constants/messages.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../../common/constants/session-keys.js'
import contacts from './mock-contacts.json'
import { saveNotification } from '../../../../common/helpers/notification-helpers.js'

vi.mock('../../../../common/helpers/notification-helpers.js')

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
      saveNotification.mockClear()
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
        sessionKeys.contactAddress,
        contacts[0]
      )
      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/declaration')
    })

    test('POST /consignment/contact/select renders page with error when notification save fails', async () => {
      saveNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID_FAIL' }
        },
        payload: { contactAddress: '0' }
      })

      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(headers.location).toBeUndefined()
      expect(result).toEqual(
        expect.stringContaining(SUBMISSION_FAILURE_MESSAGE)
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
