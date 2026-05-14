import { vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { notificationClient } from '../../../../common/clients/notification-client.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#consignmentContactSelectController', () => {
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

  test('POST /consignment/contact/select redirects to /declaration', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/consignment/contact/select',
      auth: {
        strategy: 'session',
        credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
      },
      payload: { contactAddress: '0' }
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe('/declaration')
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
    expect(result).toEqual(expect.stringContaining('Select a contact address'))
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
    expect(result).toEqual(expect.stringContaining('Select a contact address'))
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
    expect(result).toEqual(expect.stringContaining('Select a contact address'))
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
    expect(result).toEqual(expect.stringContaining('Select a contact address'))
  })
})
